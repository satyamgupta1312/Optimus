/**
 * SupabaseService — Supabase client initialization.
 *
 * Replaces KineticService.js. All data now lives in Supabase (PostgreSQL).
 * Uses service_role key for server-side access (bypasses RLS).
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

let SUPABASE_URL = process.env.SUPABASE_URL || '';
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

try {
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      let m = line.match(/^SUPABASE_URL=(.+)$/);
      if (m) SUPABASE_URL = m[1].trim();
      m = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
      if (m) SUPABASE_SERVICE_ROLE_KEY = m[1].trim();
    }
  }
} catch { /* ignore */ }

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SupabaseService] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — DB disabled.');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (supabase) {
  console.log(`[SupabaseService] Connected → ${SUPABASE_URL} ✓`);
}

export function isAvailable() {
  return !!supabase;
}

export function getClient() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

export default supabase;
