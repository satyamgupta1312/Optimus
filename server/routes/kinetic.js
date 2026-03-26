import { Router } from 'express';
import * as KineticSync from '../services/KineticSyncService.js';
import * as Kinetic from '../services/KineticService.js';
import * as WidgetData from '../services/WidgetDataService.js';

const router = Router();

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


// ── GET /kinetic/catalog/batch?codes=104303,104304,... ──
router.get('/catalog/batch', async (req, res, next) => {
  try {
    if (!WidgetData.isMetabaseAvailable()) {
      return res.json({ products: {}, source: 'metabase', available: false });
    }

    const codesParam = req.query.codes || '';
    const codes = codesParam.split(',').map(c => c.trim()).filter(Boolean);

    if (codes.length === 0) {
      return res.json({ products: {}, count: 0, source: 'metabase' });
    }

    const results = await WidgetData.batchProducts(codes);
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
