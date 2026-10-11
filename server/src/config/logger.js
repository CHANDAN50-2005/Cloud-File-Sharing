import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'rawToken',
      'rawShareToken',
      'key',
      'rawKey',
      'fek',
      'wrappedKey',
      'secret',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.key',
      '*.secret'
    ],
    censor: '[REDACTED]'
  },
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});
