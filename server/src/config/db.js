import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    logger.debug('MongoDB already connected');
    return;
  }

  // Check if still set to placeholder or default localhost
  if (
    !env.MONGODB_URI ||
    env.MONGODB_URI.includes('<password>') ||
    env.MONGODB_URI.includes('<cluster-address>')
  ) {
    logger.warn(
      'MONGODB_URI is using placeholder values. Please update server/.env with your MongoDB Atlas connection string.'
    );
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Quick timeout so server doesn't hang if offline
    });

    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error occurred');
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
      isConnected = false;
    });
  } catch (error) {
    isConnected = false;
    logger.warn(
      { err: error.message },
      'Could not connect to MongoDB. The server will run in limited mode until MONGODB_URI is configured.'
    );
  }
}

export function getDBStatus() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}

export async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
}
