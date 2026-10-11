import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (
      !env.SUPABASE_URL ||
      env.SUPABASE_URL.includes('placeholder-project') ||
      !env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
    ) {
      logger.warn(
        'Supabase credentials are set to placeholders. File storage operations will fail until configured.'
      );
    }

    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseClient;
}

export const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
