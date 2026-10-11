import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';

async function bootstrap() {
  // Connect to Database
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 SecureCloud Server listening on http://localhost:${env.PORT}`);
    logger.info(`📡 Health Check URL: http://localhost:${env.PORT}/api/health`);
    logger.info(`🔒 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });

    // Force close after 10s if connections linger
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});
