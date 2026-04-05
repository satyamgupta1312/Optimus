import { Router } from 'express';
import * as WidgetData from '../services/WidgetDataService.js';
import * as SubService from '../services/SubmissionService.js';

const router = Router();

// ── GET /header-widgets ──
router.get('/', async (_req, res, next) => {
  try {
    const headers = await WidgetData.getHeaderWidgets();
    res.json(headers);
  } catch (err) { next(err); }
});

// ── PUT /header-widgets ──
router.put('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can update header widgets' });
    }

    const { primaryMasthead, secondaryMasthead } = req.body;

    if (primaryMasthead === undefined && secondaryMasthead === undefined) {
      return res.status(400).json({ error: 'Provide primaryMasthead or secondaryMasthead' });
    }

    if (primaryMasthead !== undefined) {
      await WidgetData.upsertHeaderWidget('primaryMasthead', primaryMasthead, req.user.email);
    }
    if (secondaryMasthead !== undefined) {
      await WidgetData.upsertHeaderWidget('secondaryMasthead', secondaryMasthead, req.user.email);
    }

    SubService.logActivitySafe({
      action: 'update', user: req.user,
      targetId: 'headerWidgets', targetType: 'headerWidgets',
      details: { updated: Object.keys(req.body) }, env: req.env,
    });

    const headers = await WidgetData.getHeaderWidgets();
    res.json(headers);
  } catch (err) { next(err); }
});

export default router;
