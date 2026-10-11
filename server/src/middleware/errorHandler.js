import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    }
  });
}

export function errorHandler(err, req, res, next) {
  // If response headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An error occurred';

  // Log error (full stack in dev/debug, sanitized in production)
  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Server error encountered');
  } else {
    logger.warn(
      { path: req.originalUrl, method: req.method, statusCode, code, message },
      'Client error encountered'
    );
  }

  const responsePayload = {
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  };

  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    responsePayload.error.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
}
