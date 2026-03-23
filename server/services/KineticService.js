/**
 * KineticService — Low-level HTTP client for Kinetic Managed Tables & Saved Queries.
 *
 * Wraps all Kinetic API calls with retry logic and bearer auth.
 * Returns null on failure (never throws) to support fire-and-forget usage.
 *
 * Config: reads KINETIC_API_BASE and KINETIC_BEARER_TOKEN from server/.env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

let KINETIC_BASE = process.env.KINETIC_API_BASE || 'http://127.0.0.1:8888';
let KINETIC_TOKEN = process.env.KINETIC_BEARER_TOKEN || '';
let KINETIC_PHONE = process.env.KINETIC_USER_PHONE || '';
const PROJECT = 'homepage';

// Simple .env loader (same pattern as DriveService.js)
try {
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      let match = line.match(/^KINETIC_API_BASE=(.+)$/);
      if (match) KINETIC_BASE = match[1].trim();
      match = line.match(/^KINETIC_BEARER_TOKEN=(.+)$/);
      if (match) KINETIC_TOKEN = match[1].trim();
      match = line.match(/^KINETIC_USER_PHONE=(.+)$/);
      if (match) KINETIC_PHONE = match[1].trim();
    }
  }
} catch { /* ignore */ }

if (KINETIC_TOKEN) {
  console.log(`[KineticService] Configured → ${KINETIC_BASE} (project: ${PROJECT}) ✓`);
} else {
  console.warn('[KineticService] No KINETIC_BEARER_TOKEN — Kinetic sync disabled.');
}

// ── URL builders ──
const tableUrl = (slug) => `${KINETIC_BASE}/api/projects/${PROJECT}/tables/${slug}`;
const queryUrl = (slug) => `${KINETIC_BASE}/api/projects/${PROJECT}/queries/${slug}`;

// ── Retry-enabled fetch ──
async function kineticFetch(url, options = {}, retries = 3) {
  const headers = {
    'Authorization': `Bearer ${KINETIC_TOKEN}`,
    'Content-Type': 'application/json',
    ...(KINETIC_PHONE ? { 'X-User-Phone': KINETIC_PHONE } : {}),
    ...options.headers,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (res.ok) return await res.json();

      // Don't retry client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        const body = await res.text().catch(() => '');
        console.warn(`[KineticService] ${res.status} ${url}: ${body}`);
        return null;
      }

      // Server error — retry
      if (attempt < retries) {
        const delay = 200 * Math.pow(2, attempt - 1); // 200ms, 400ms, 800ms
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.warn(`[KineticService] ${res.status} after ${retries} attempts: ${url}`);
      return null;
    } catch (err) {
      if (attempt < retries) {
        const delay = 200 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.warn(`[KineticService] Network error after ${retries} attempts: ${err.message}`);
      return null;
    }
  }
  return null;
}

// ── Public API ──

/** Check if Kinetic is configured and available */
export function isAvailable() {
  return !!KINETIC_TOKEN;
}

/** Insert rows into a managed table */
export async function insertRows(table, rows) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(`${tableUrl(table)}/rows`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

/** Read rows from a managed table */
export async function readRows(table, { where, order_by, limit, offset } = {}) {
  if (!KINETIC_TOKEN) return null;
  const params = new URLSearchParams();
  if (where) params.set('where', where);
  if (order_by) params.set('order_by', order_by);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  const qs = params.toString();
  return kineticFetch(`${tableUrl(table)}/rows${qs ? '?' + qs : ''}`, {
    method: 'GET',
  });
}

/** Run a saved query with variables */
export async function runQuery(slug, variables = {}) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(`${queryUrl(slug)}/run`, {
    method: 'POST',
    body: JSON.stringify(variables),
  });
}

/** Create or update a managed table definition */
export async function putTable(slug, definition) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(tableUrl(slug), {
    method: 'PUT',
    body: JSON.stringify(definition),
  });
}

/** Publish a managed table */
export async function publishTable(slug) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(`${tableUrl(slug)}/publish`, {
    method: 'POST',
  });
}

/** Create or update a saved query */
export async function putQuery(slug, definition) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(queryUrl(slug), {
    method: 'PUT',
    body: JSON.stringify(definition),
  });
}

/** Bulk update rows in a managed table */
export async function updateRows(table, { set, where }) {
  if (!KINETIC_TOKEN) return null;
  return kineticFetch(`${tableUrl(table)}/update`, {
    method: 'POST',
    body: JSON.stringify({ set, where }),
  });
}
