import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { logger } from './logger.js';

// Resolve directory name in ES modules safely on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/securecloud'),

  SUPABASE_URL: z.string().default('https://placeholder-project.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('placeholder-service-role-key'),
  SUPABASE_STORAGE_BUCKET: z.string().default('securecloud-files'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('dev-jwt-access-secret-minimum-32-characters-long-123456'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('dev-jwt-refresh-secret-minimum-32-characters-long-123456'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: z
    .string()
    .default('7')
    .transform((val) => parseInt(val, 10)),

  MAX_FILE_SIZE_BYTES: z
    .string()
    .default('26214400')
    .transform((val) => parseInt(val, 10)),
  DEFAULT_USER_QUOTA_BYTES: z
    .string()
    .default('104857600')
    .transform((val) => parseInt(val, 10)),

  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax')
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error({ errors: error.flatten().fieldErrors }, 'Environment variable validation failed');
    process.exit(1);
  }
  throw error;
}

export const env = parsedEnv;
