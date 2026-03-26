import { Router } from 'express';
import * as WidgetData from '../services/WidgetDataService.js';

const router = Router();

// ── GET / ──
router.get('/', async (req, res, next) => {
  try {
    const enabledOnly = req.query.enabledOnly === 'true';
    const locations = await WidgetData.listLocations(req.env, enabledOnly);
    res.json(locations);
  } catch (err) { next(err); }
});

// ── POST / ──
router.post('/', async (req, res, next) => {
  try {
    const { key, levelTag, levelProperty, slugSuffix, label, type } = req.body;

    if (!key || !levelTag || !levelProperty || !slugSuffix || !label || !type) {
      return res.status(400).json({ error: 'Missing required fields: key, levelTag, levelProperty, slugSuffix, label, type' });
    }

    const location = await WidgetData.createLocation({
      key, env: req.env, levelTag, levelProperty, slugSuffix, label, type,
    });

    res.status(201).json(location);
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// ── PATCH /:key/toggle ──
router.patch('/:key/toggle', async (req, res, next) => {
  try {
    const location = await WidgetData.toggleLocation(req.params.key, req.env);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message });
    next(err);
  }
});

// ── DELETE /:key ──
router.delete('/:key', async (req, res, next) => {
  try {
    const result = await WidgetData.deleteLocation(req.params.key, req.env);
    if (!result) return res.status(404).json({ error: 'Location not found' });
    res.json({ success: true });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message });
    next(err);
  }
});

export default router;
