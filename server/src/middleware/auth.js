import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    // 1. Read token from httpOnly cookie or Authorization Bearer header
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. No access token provided.'
        }
      });
    }

    // 2. Verify JWT signature & expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: {
            code: 'ACCESS_TOKEN_EXPIRED',
            message: 'Access token has expired. Please refresh session.'
          }
        });
      }
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token.'
        }
      });
    }

    // 3. Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    // 4. Attach user context to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
