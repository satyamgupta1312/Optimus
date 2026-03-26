import { Router } from 'express';
import * as WidgetData from '../services/WidgetDataService.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── GET /widgets ──
router.get('/', async (req, res, next) => {
  try {
    const { status, type, slug, date } = req.query;
    const widgets = await WidgetData.listWidgets(req.env, { status, type, slug, date });
    res.json(widgets);
  } catch (err) { next(err); }
});

// ── POST /widgets ──
router.post('/', async (req, res, next) => {
  try {
    const { type, slug, title, titleHi, pnc, config, products, sortOrder } = req.body;

    const widget = await WidgetData.createWidget({
      type, slug, env: req.env,
      title: title || '', titleHi: titleHi || '',
      pnc: pnc || {}, config: config || {}, products: products || [],
      sortOrder: sortOrder ?? 0,
      createdBy: req.user.email,
    });

    // Create initial version
    await WidgetData.createVersion({
      widgetId: widget.id, widgetSlug: slug, env: req.env,
      version: 1, snapshot: req.body,
      changedBy: req.user.email, changeLog: 'Created',
    });

    KineticSync.logActivitySafe({
      action: 'create', user: req.user,
      targetId: widget.id, targetType: 'widget',
      details: { type, slug }, env: req.env,
    });

    res.status(201).json(widget);
  } catch (err) { next(err); }
});

// ── PATCH /widgets (bulk reorder) ──
router.patch('/', async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array' });
    }

    await WidgetData.reorderWidgets(order);
    res.json({ success: true, updated: order.length });
  } catch (err) { next(err); }
});

// ── GET /widgets/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const widget = await WidgetData.getWidgetById(req.params.id);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    // Get last 10 versions
    const { versions } = await WidgetData.listVersions(req.params.id, { limit: 10 });

    res.json({ ...widget, versions });
  } catch (err) { next(err); }
});

// ── PUT /widgets/:id ──
router.put('/:id', async (req, res, next) => {
  try {
    const { type, slug, title, titleHi, status, pnc, config, products, sortOrder } = req.body;

    // Get current version number
    const latestVersion = await WidgetData.getLatestVersion(req.params.id);

    const data = {};
    if (type !== undefined) data.type = type;
    if (slug !== undefined) data.slug = slug;
    if (title !== undefined) data.title = title;
    if (titleHi !== undefined) data.titleHi = titleHi;
    if (status !== undefined) data.status = status;
    if (pnc !== undefined) data.pnc = pnc;
    if (config !== undefined) data.config = config;
    if (products !== undefined) data.products = products;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const widget = await WidgetData.updateWidget(req.params.id, data);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    // Save version
    await WidgetData.createVersion({
      widgetId: widget.id, widgetSlug: widget.slug, env: req.env,
      version: (latestVersion?.version || 0) + 1,
      snapshot: req.body,
      changedBy: req.user.email, changeLog: 'Updated',
    });

    KineticSync.logActivitySafe({
      action: 'update', user: req.user,
      targetId: widget.id, targetType: 'widget',
      details: { fields: Object.keys(req.body) }, env: req.env,
    });

    res.json(widget);
  } catch (err) { next(err); }
});

// ── PATCH /widgets/:id ──
router.patch('/:id', async (req, res, next) => {
  try {
    const data = {};
    const { type, slug, title, titleHi, status, pnc, config, products, sortOrder } = req.body;

    if (type !== undefined) data.type = type;
    if (slug !== undefined) data.slug = slug;
    if (title !== undefined) data.title = title;
    if (titleHi !== undefined) data.titleHi = titleHi;
    if (status !== undefined) data.status = status;
    if (pnc !== undefined) data.pnc = pnc;
    if (config !== undefined) data.config = config;
    if (products !== undefined) data.products = products;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const widget = await WidgetData.updateWidget(req.params.id, data);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    res.json(widget);
  } catch (err) { next(err); }
});

// ── DELETE /widgets/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    await WidgetData.deleteWidget(req.params.id);

    KineticSync.logActivitySafe({
      action: 'delete', user: req.user,
      targetId: req.params.id, targetType: 'widget',
      env: req.env,
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /widgets/:id/duplicate ──
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const widget = await WidgetData.duplicateWidget(req.params.id, req.user, req.env);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    KineticSync.logActivitySafe({
      action: 'create', user: req.user,
      targetId: widget.id, targetType: 'widget',
      details: { duplicatedFrom: req.params.id }, env: req.env,
    });

    res.status(201).json(widget);
  } catch (err) { next(err); }
});

// ── GET /widgets/:id/versions ──
router.get('/:id/versions', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = parseInt(req.query.cursor) || null;

    const result = await WidgetData.listVersions(req.params.id, { limit, cursor });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
