import { Router } from 'express';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── GET /activity?page=1&limit=50&action=approve ──
// Paginated activity log from ClickHouse
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const action = req.query.action || undefined;
    const env = req.query.env || req.env || undefined;

    const result = await KineticSync.fetchActivityLog({ page, limit, action, env });
    res.json(result);
  } catch (err) {
    console.error('[activity GET /] ClickHouse read failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch activity log from ClickHouse', details: err.message });
  }
});

// ── POST /activity ──
// Create an activity log entry
router.post('/', async (req, res, next) => {
  try {
    const { action, details, targetId, targetType } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    await KineticSync.logActivity({
      action,
      user: req.user,
      targetId: targetId || '',
      targetType: targetType || '',
      details: details || {},
      env: req.env,
    });

    res.status(201).json({
      action,
      user: { email: req.user.email, name: req.user.name },
      targetId: targetId || '',
      details: details || {},
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[activity POST /] ClickHouse write failed:', err.message);
    res.status(502).json({ error: 'Failed to write activity log to ClickHouse', details: err.message });
  }
});

export default router;
