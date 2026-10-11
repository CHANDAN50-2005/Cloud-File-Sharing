import crypto from 'crypto';

/**
 * CSRF Protection Middleware: Double-Submit Cookie Pattern
 * 
 * DESIGN RATIONALE:
 * Because SecureCloud stores authentication tokens in HttpOnly cookies,
 * browser state-changing requests (POST, PUT, DELETE) must be guarded against
 * Cross-Site Request Forgery.
 * 
 * We combine:
 * 1. Strict SameSite cookie configuration (Lax in local dev, Strict in production)
 * 2. Double-Submit Cookie pattern: A random CSRF token is issued in a client-readable
 *    cookie ("csrfToken"). The frontend Axios client reads this cookie and passes it
 *    in the "x-csrf-token" HTTP request header.
 * 3. Cross-origin attackers cannot read cookies from our domain due to SOP (Same-Origin Policy),
 *    so forged cross-site requests cannot provide the matching header value.
 */

// Routes that do not require CSRF token validation (unauthenticated public endpoints)
const CSRF_EXEMPT_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/csrf',
  '/api/health'
];

export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt public endpoints or paths prefixed with /api/public/
  if (
    CSRF_EXEMPT_PATHS.includes(req.path) ||
    req.path.startsWith('/api/public/')
  ) {
    return next();
  }

  // If request has no cookies at all, it's not a cookie-authenticated browser request
  if (!req.cookies?.accessToken && !req.cookies?.refreshToken) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF validation failed: Missing CSRF token in cookie or header.'
      }
    });
  }

  // Constant-time comparison to prevent timing attacks
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF validation failed: Token mismatch.'
      }
    });
  }

  next();
}
