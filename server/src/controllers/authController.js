import argon2 from 'argon2';
import { z } from 'zod';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateFamilyId,
  hashToken,
  generateCsrfToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCsrfCookieOptions
} from '../utils/tokens.js';
import { logger } from '../config/logger.js';

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(10, 'Password must be at least 10 characters long').max(128)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});

/**
 * Register a new user account
 */
export async function register(req, res, next) {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0].message
        }
      });
    }

    const { email, password } = parseResult.data;

    // Check custom password strength policy
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: strengthCheck.error
        }
      });
    }

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.'
        }
      });
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    // Create user
    const user = await User.create({
      email,
      passwordHash
    });

    // Create initial session family
    const familyId = generateFamilyId();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 200) || 'Unknown',
      ip: req.ip || 'Unknown'
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email
    });
    const csrfToken = generateCsrfToken();

    // Set secure cookies
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', rawRefreshToken, getRefreshTokenCookieOptions());
    res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());

    logger.info({ userId: user._id.toString() }, 'User registered successfully');

    return res.status(201).json({
      user: user.toClientJSON(),
      csrfToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in an existing user
 */
export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0].message
        }
      });
    }

    const { email, password } = parseResult.data;
    const user = await User.findOne({ email });

    // Anti-enumeration: uniform error message whether email exists or not
    const invalidCredentialsError = {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email address or password.'
    };

    if (!user) {
      // Dummy hash verification to prevent timing attack enumeration
      await argon2.verify(
        '$argon2id$v=19$m=65536,p=4,t=3$dummySaltString123$dummyHashString12345678901234567890123456789012',
        password
      ).catch(() => {});
      return res.status(401).json({ error: invalidCredentialsError });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to repeated failed attempts. Please try again in ${waitMinutes} minute(s).`
        }
      });
    }

    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        logger.warn({ userId: user._id.toString() }, 'Account locked after 5 failed login attempts');
      }
      await user.save();
      return res.status(401).json({ error: invalidCredentialsError });
    }

    // Reset lockout counters on success
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // Issue tokens and start session family
    const familyId = generateFamilyId();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 200) || 'Unknown',
      ip: req.ip || 'Unknown'
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email
    });
    const csrfToken = generateCsrfToken();

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', rawRefreshToken, getRefreshTokenCookieOptions());
    res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());

    logger.info({ userId: user._id.toString() }, 'User logged in successfully');

    return res.status(200).json({
      user: user.toClientJSON(),
      csrfToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out user by revoking the refresh token and clearing auth cookies
 */
export async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    // Clear all auth cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('csrfToken', { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rotate refresh token and issue a fresh access token
 * Includes Refresh Token Reuse Detection
 */
export async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token cookie is missing.'
        }
      });
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      return res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token.'
        }
      });
    }

    // =========================================================================
    // REFRESH TOKEN REUSE DETECTION (RFC 6749 Section 10.4)
    // If a previously revoked or replaced token is submitted again, someone
    // may have stolen a rotated token. Revoke the entire family immediately!
    // =========================================================================
    if (tokenDoc.revokedAt || tokenDoc.replacedBy) {
      logger.warn(
        {
          userId: tokenDoc.userId.toString(),
          familyId: tokenDoc.familyId
        },
        'SECURITY ALERT: Refresh token reuse detected! Invalidating entire token family.'
      );

      // Invalidate all tokens belonging to this family
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId, revokedAt: null },
        { revokedAt: new Date() }
      );

      // Clear cookies
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.clearCookie('csrfToken', { path: '/' });

      return res.status(401).json({
        error: {
          code: 'SESSION_REVOKED_REUSE_DETECTED',
          message: 'Suspicious session activity detected. Please sign in again.'
        }
      });
    }

    // Check token expiration
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired. Please sign in again.'
        }
      });
    }

    // Token is valid: Rotate it!
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    // 1. Mark existing token as revoked and replaced
    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedBy = newTokenHash;
    await tokenDoc.save();

    // 2. Create the replacement token within the SAME session family
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      familyId: tokenDoc.familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent']?.slice(0, 200) || tokenDoc.userAgent,
      ip: req.ip || tokenDoc.ip
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email
    });
    const csrfToken = generateCsrfToken();

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', newRawRefreshToken, getRefreshTokenCookieOptions());
    res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());

    return res.status(200).json({
      user: user.toClientJSON(),
      csrfToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get authenticated user profile
 */
export async function getMe(req, res) {
  return res.status(200).json({
    user: req.user.toClientJSON()
  });
}

/**
 * Get CSRF Token endpoint (for initial SPA loads)
 */
export function getCsrf(req, res) {
  const csrfToken = generateCsrfToken();
  res.cookie('csrfToken', csrfToken, getCsrfCookieOptions());
  return res.status(200).json({ csrfToken });
}
