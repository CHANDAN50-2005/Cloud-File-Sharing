import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getDBStatus } from './config/db.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import authRouter from './routes/auth.js';

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production',
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration (Strict allowlist with credentials enabled)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (origin === env.CLIENT_ORIGIN || origin === 'http://localhost:5173') {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  })
);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// CSRF Protection
app.use(csrfProtection);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      },
      'HTTP Request'
    );
  });
  next();
});

// Health Check Endpoint (Phase 0 Verification Gate)
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      connected: dbStatus.connected,
      state: dbStatus.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Mount Authentication Routes
app.use('/api/auth', authRouter);

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
