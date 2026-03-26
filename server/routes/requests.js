import { Router } from 'express';
import crypto from 'crypto';
import * as WidgetData from '../services/WidgetDataService.js';
import { validateWidget } from '../middleware/validate.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── Approval lock — only one approve/reject at a time ──
let approvalLock = null;
const LOCK_TIMEOUT_MS = 10000;

function acquireLock(requestId, user) {
  if (approvalLock && Date.now() - approvalLock.startedAt > LOCK_TIMEOUT_MS) {
    console.warn('[Lock] Auto-released stale lock:', approvalLock);
    approvalLock = null;
  }
  if (approvalLock) return false;
  approvalLock = { requestId, user, startedAt: Date.now() };
  return true;
}

function releaseLock() {
  approvalLock = null;
}

// ── GET /requests ──
router.get('/', async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const requests = await KineticSync.fetchRequests(req.env, { status, date });
    res.json(requests);
  } catch (err) {
    console.error('[requests GET /] ClickHouse read failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch requests from ClickHouse', details: err.message });
  }
});

// ── POST /requests ──
router.post('/', async (req, res, next) => {
  try {
    const { widgetIds, widgets: inlineWidgets, headerWidgets } = req.body;

    // ── Path A: Inline widgets from frontend ──
    if (Array.isArray(inlineWidgets)) {
      const allErrors = [];
      for (let i = 0; i < inlineWidgets.length; i++) {
        const errors = validateWidget(inlineWidgets[i]);
        if (errors.length > 0) {
          allErrors.push({ index: i, widget: inlineWidgets[i].title || `Widget ${i}`, errors });
        }
      }
      if (allErrors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: allErrors });
      }

      if (inlineWidgets.length === 0 && (!headerWidgets || Object.keys(headerWidgets).length === 0)) {
        return res.status(400).json({ error: 'At least 1 widget or header widget is required' });
      }

      const requestId = crypto.randomUUID();

      // Create Widget records in ClickHouse
      const createdWidgets = [];
      for (let i = 0; i < inlineWidgets.length; i++) {
        const w = inlineWidgets[i];
        const slug = w.slug || w.slug_name || `widget-${Date.now()}-${i}`;

        // Build config: store all non-standard canvas fields
        const STANDARD_KEYS = new Set([
          'type', 'slug', 'slug_name', 'title', 'titleHi',
          'pnc', 'config', 'products', 'sortOrder',
          'id', 'lastModified', 'lastModifiedBy', 'status',
          '_fetched', '_fromDB', '_dbId', '_rawData',
        ]);
        const extraConfig = {};
        for (const [k, v] of Object.entries(w)) {
          if (STANDARD_KEYS.has(k)) continue;
          if (typeof v === 'function') continue;
          extraConfig[k] = v;
        }

        const widget = await WidgetData.createWidget({
          type: w.type || 'unknown',
          slug, env: req.env,
          title: w.title || '', titleHi: w.titleHi || '',
          status: 'PENDING', sortOrder: i,
          pnc: w.pnc || {},
          config: { ...(w.config || {}), ...extraConfig },
          products: w.products || [],
          createdBy: req.user.email,
        });
        createdWidgets.push({ widget, original: w });
      }

      // Assign widget IDs for ClickHouse snapshot
      const widgetsWithIds = inlineWidgets.map((w, i) => ({
        ...w,
        id: createdWidgets[i]?.widget.id || w.id || '',
      }));

      // BLOCKING: Create submission in ClickHouse
      await KineticSync.createSubmission(requestId, widgetsWithIds, req.user, req.env, headerWidgets);

      // BLOCKING: Log activity
      await KineticSync.logActivity({
        action: 'submit', user: req.user,
        targetId: requestId, targetType: 'request',
        details: { widgetCount: createdWidgets.length }, env: req.env,
      });

      // Auto-approve for SUPER_ADMIN
      if (req.user.role === 'SUPER_ADMIN') {
        await KineticSync.updateRequestStatus(requestId, 'APPROVED', req.user, req.env);

        const widgetIds = createdWidgets.map(cw => cw.widget.id);
        if (widgetIds.length > 0) {
          await WidgetData.updateWidgetStatuses(widgetIds, 'APPROVED');
        }

        await KineticSync.logActivity({
          action: 'approve', user: req.user,
          targetId: requestId, targetType: 'request',
          details: { approvedWidgets: createdWidgets.length, autoApproved: true }, env: req.env,
        });
      }

      const created = await KineticSync.fetchRequestById(requestId, req.env);
      return res.status(201).json(created);
    }

    // ── Path B: Existing widget IDs ──
    if (!widgetIds || !Array.isArray(widgetIds) || widgetIds.length === 0) {
      return res.status(400).json({ error: 'widgetIds array or widgets array is required' });
    }

    const widgets = await WidgetData.findWidgetsByIds(widgetIds);
    const requestId = crypto.randomUUID();

    const widgetSnapshots = widgets.map((w, i) => ({
      id: w.id, type: w.type, slug: w.slug,
      title: w.title, titleHi: w.titleHi,
      pnc: w.pnc, config: w.config, products: w.products,
      sortOrder: i,
    }));

    await KineticSync.createSubmission(requestId, widgetSnapshots, req.user, req.env, headerWidgets);

    await KineticSync.logActivity({
      action: 'submit', user: req.user,
      targetId: requestId, targetType: 'request',
      details: { widgetCount: widgets.length }, env: req.env,
    });

    const created = await KineticSync.fetchRequestById(requestId, req.env);
    res.status(201).json(created);
  } catch (err) {
    console.error('[requests POST /] Error:', err.message);
    if (err.message.startsWith('Kinetic')) {
      return res.status(502).json({ error: 'ClickHouse write failed', details: err.message });
    }
    next(err);
  }
});

// ── POST /requests/:id/approve ──
router.post('/:id/approve', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can approve' });
    }

    if (!acquireLock(req.params.id, req.user.email)) {
      return res.status(423).json({
        error: 'Another approval is already in progress, please wait',
        lockedBy: approvalLock.user, requestId: approvalLock.requestId,
      });
    }

    try {
      const request = await KineticSync.fetchRequestById(req.params.id, req.env);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: `Cannot approve request in ${request.status} status` });
      }

      const { selectedWidgetIds } = req.body;
      const widgetIds = selectedWidgetIds
        ? request.requestWidgets.filter(rw => selectedWidgetIds.includes(rw.widgetId)).map(rw => rw.widgetId)
        : request.requestWidgets.map(rw => rw.widgetId);

      await KineticSync.updateRequestStatus(req.params.id, 'APPROVED', req.user, req.env);

      await WidgetData.updateWidgetStatuses(widgetIds, 'APPROVED');

      await KineticSync.logActivity({
        action: 'approve', user: req.user,
        targetId: req.params.id, targetType: 'request',
        details: { approvedWidgets: widgetIds.length }, env: req.env,
      });

      res.json({ id: req.params.id, status: 'APPROVED', updatedAt: new Date().toISOString() });
    } finally {
      releaseLock();
    }
  } catch (err) {
    console.error('[requests POST /:id/approve] Error:', err.message);
    if (err.message.startsWith('Kinetic')) {
      return res.status(502).json({ error: 'ClickHouse write failed', details: err.message });
    }
    next(err);
  }
});

// ── POST /requests/:id/reject ──
router.post('/:id/reject', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can reject' });
    }

    if (!acquireLock(req.params.id, req.user.email)) {
      return res.status(423).json({
        error: 'Another approval is already in progress, please wait',
        lockedBy: approvalLock.user, requestId: approvalLock.requestId,
      });
    }

    try {
      const request = await KineticSync.fetchRequestById(req.params.id, req.env);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: `Cannot reject request in ${request.status} status` });
      }

      const { reason } = req.body;

      await KineticSync.updateRequestStatus(req.params.id, 'REJECTED', req.user, req.env, {
        rejectionReason: reason || '',
      });

      const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
      await WidgetData.updateWidgetStatuses(widgetIds, 'REJECTED');

      await KineticSync.logActivity({
        action: 'reject', user: req.user,
        targetId: req.params.id, targetType: 'request',
        details: { reason, widgetCount: widgetIds.length }, env: req.env,
      });

      res.json({ id: req.params.id, status: 'REJECTED', updatedAt: new Date().toISOString() });
    } finally {
      releaseLock();
    }
  } catch (err) {
    console.error('[requests POST /:id/reject] Error:', err.message);
    if (err.message.startsWith('Kinetic')) {
      return res.status(502).json({ error: 'ClickHouse write failed', details: err.message });
    }
    next(err);
  }
});

// ── POST /requests/:id/reopen ──
router.post('/:id/reopen', async (req, res, next) => {
  try {
    const request = await KineticSync.fetchRequestById(req.params.id, req.env);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'APPROVED' && request.status !== 'REJECTED') {
      return res.status(400).json({ error: `Cannot reopen request in ${request.status} status` });
    }

    await KineticSync.updateRequestStatus(req.params.id, 'DRAFT', req.user, req.env, {
      rejectionReason: '',
    });

    const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
    await WidgetData.updateWidgetStatuses(widgetIds, 'DRAFT');

    await KineticSync.logActivity({
      action: 'reopen', user: req.user,
      targetId: req.params.id, targetType: 'request',
      env: req.env,
    });

    res.json({ id: req.params.id, status: 'DRAFT', updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[requests POST /:id/reopen] Error:', err.message);
    if (err.message.startsWith('Kinetic')) {
      return res.status(502).json({ error: 'ClickHouse write failed', details: err.message });
    }
    next(err);
  }
});

export default router;
