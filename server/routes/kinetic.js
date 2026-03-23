import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as KineticSync from '../services/KineticSyncService.js';
import * as Kinetic from '../services/KineticService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// ── Metabase config (for product catalog) ──
let METABASE_URL = process.env.METABASE_URL || '';
let METABASE_API_KEY = process.env.METABASE_API_KEY || '';
try {
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      let m = line.match(/^METABASE_URL=(.+)$/);
      if (m) METABASE_URL = m[1].trim();
      m = line.match(/^METABASE_API_KEY=(.+)$/);
      if (m) METABASE_API_KEY = m[1].trim();
    }
  }
} catch { /* ignore */ }

if (METABASE_API_KEY) {
  console.log(`[Catalog] Metabase configured → ${METABASE_URL} ✓`);
} else {
  console.warn('[Catalog] No METABASE_API_KEY — product catalog from Mirror disabled.');
}

const router = Router();

// ── Metabase structured query for product catalog ──
// Table: smpcm_product (id:154) in Samaan DB (id:3)
const METABASE_CATALOG_QUERY = {
  database: 3,
  type: 'query',
  query: {
    'source-table': 154,
    fields: [
      ['field', 2171, { 'base-type': 'type/BigInteger' }],  // id
      ['field', 2157, { 'base-type': 'type/Integer' }],     // item_code
      ['field', 2144, { 'base-type': 'type/Text' }],        // display_name
      ['field', 2149, { 'base-type': 'type/Text' }],        // brand
      ['field', 2156, { 'base-type': 'type/Text' }],        // main_image
      ['field', 2146, { 'base-type': 'type/Float' }],       // mrp
      ['field', 2188, { 'base-type': 'type/Float' }],       // selling_price
    ],
    filter: ['and',
      ['=', ['field', 2177, { 'base-type': 'type/Boolean' }], true],
      ['or',
        ['!=', ['field', 2108, { 'base-type': 'type/Text' }], 'OFF'],
        ['is-null', ['field', 2108, { 'base-type': 'type/Text' }]],
      ],
    ],
  },
};

const IMAGE_BASE = 'https://gs.apnamart.in/';

function mapRows(rows) {
  return rows.map(r => {
    const mainImage = r[4] || '';
    return {
      id: r[0],
      item_code: String(r[1] ?? ''),
      display_name: r[2] || '',
      brand: r[3] || '',
      product_image: mainImage ? `${IMAGE_BASE}${mainImage.replace(/^\//, '')}` : '',
      mrp: r[5] || 0,
      selling_price: r[6] || 0,
    };
  });
}

// ── GET /kinetic/health ──
router.get('/health', (_req, res) => {
  res.json({
    available: Kinetic.isAvailable(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /kinetic/history ──
// Fetch widget submission history from ClickHouse/BigQuery via Kinetic saved query.
// Query params: startDate, endDate, status, env
router.get('/history', async (req, res, next) => {
  try {
    if (!Kinetic.isAvailable()) {
      return res.json({ rows: [], source: 'kinetic', available: false });
    }

    const { startDate, endDate, status, env } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const rows = await KineticSync.fetchHistory(startDate, endDate, { status, env });

    res.json({
      rows: rows || [],
      count: rows ? rows.length : 0,
      source: 'kinetic',
    });
  } catch (err) { next(err); }
});

// ── GET /kinetic/analytics ──
// Fetch aggregated widget analytics from Kinetic saved query.
// Query params: startDate, endDate, env
router.get('/analytics', async (req, res, next) => {
  try {
    if (!Kinetic.isAvailable()) {
      return res.json({ rows: [], source: 'kinetic', available: false });
    }

    const { startDate, endDate, env } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const rows = await KineticSync.fetchAnalytics(startDate, endDate, { env });

    res.json({
      rows: rows || [],
      count: rows ? rows.length : 0,
      source: 'kinetic',
    });
  } catch (err) { next(err); }
});

// ── GET /kinetic/search-widgets?q=... ──
// Search widgets by slug or title from ClickHouse (Mirror).
router.get('/search-widgets', async (req, res, next) => {
  try {
    if (!Kinetic.isAvailable()) {
      return res.json({ rows: [], source: 'kinetic', available: false });
    }

    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'q (search query) is required' });
    }

    const rows = await KineticSync.searchWidgets(q.trim());

    res.json({
      rows: rows || [],
      count: rows ? rows.length : 0,
      source: 'kinetic',
    });
  } catch (err) { next(err); }
});


/**
 * Fetch specific products by item_code from Metabase (fast — small result set).
 * Uses Metabase structured query with item_code IN (...) filter.
 */
async function fetchProductsByCodes(codes) {
  const numericCodes = codes.map(c => parseInt(c)).filter(n => !isNaN(n));
  if (numericCodes.length === 0) return {};

  const query = {
    ...METABASE_CATALOG_QUERY,
    query: {
      ...METABASE_CATALOG_QUERY.query,
      filter: ['and',
        ...METABASE_CATALOG_QUERY.query.filter.slice(1), // unwrap the existing 'and' filters
        ['=', ['field', 2157, { 'base-type': 'type/Integer' }], ...numericCodes],
      ],
    },
  };

  const res = await fetch(`${METABASE_URL}/api/dataset`, {
    method: 'POST',
    headers: { 'x-api-key': METABASE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const rows = mapRows(data.data?.rows || []);
  const result = {};
  for (const row of rows) {
    if (row.item_code) result[row.item_code] = row;
  }
  return result;
}

// ── GET /kinetic/catalog/batch?codes=104303,104304,... ──
// Batch lookup: queries Metabase directly for just the requested codes (fast, no OOM).
router.get('/catalog/batch', async (req, res, next) => {
  try {
    if (!METABASE_API_KEY) {
      return res.json({ products: {}, source: 'metabase', available: false });
    }

    const codesParam = req.query.codes || '';
    const codes = codesParam.split(',').map(c => c.trim()).filter(Boolean);

    if (codes.length === 0) {
      return res.json({ products: {}, count: 0, source: 'metabase' });
    }

    const results = await fetchProductsByCodes(codes);
    res.json({ products: results, count: Object.keys(results).length, source: 'metabase' });
  } catch (err) { next(err); }
});

// ── POST /kinetic/deploy-sync ──
// Called by frontend after successful deploy to sync actual slugs to Kinetic.
// Body: { widgets: [{ widgetId, dt, slugs }] }
router.post('/deploy-sync', async (req, res, next) => {
  try {
    if (!Kinetic.isAvailable()) {
      return res.json({ synced: 0, available: false });
    }

    const { widgets } = req.body;
    if (!Array.isArray(widgets) || widgets.length === 0) {
      return res.status(400).json({ error: 'widgets array is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    let synced = 0;

    for (const w of widgets) {
      const dt = w.dt || today;
      await KineticSync.syncDeploy(w.widgetId, dt, w.slugs || {}, req.user);
      synced++;
    }

    res.json({ synced, source: 'kinetic' });
  } catch (err) { next(err); }
});

export default router;
