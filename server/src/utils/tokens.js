import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a short-lived access token JWT (default: 15m)
 * @param {Object} payload - { userId, email }
 * @returns {string} Signed JWT
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY
  });
}

/**
 * Verifies and decodes an access token JWT
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Generates a cryptographically strong random refresh token
 * @returns {string} 64-char hex string (32 bytes entropy)
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a random session family UUID
 * @returns {string} UUID v4
 */
export function generateFamilyId() {
  return crypto.randomUUID();
}

/**
 * Computes a SHA-256 hash of a raw token before DB storage or lookup
 * @param {string} rawToken
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a random CSRF protection token
 * @returns {string} 48-char hex string
 */
export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Cookie options for the short-lived access token
 */
export function getAccessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: 15 * 60 * 1000 // 15 minutes
  };
}

/**
 * Cookie options for the rotating refresh token
 * Scoped strictly to /api/auth path
 */
export function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // e.g. 7 days
  };
}

/**
 * Cookie options for the CSRF token (Readable by frontend JavaScript)
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  };
}
