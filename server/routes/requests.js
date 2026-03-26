import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma/client.js';
import { validateWidget } from '../middleware/validate.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── Approval lock — only one approve/reject at a time ──
let approvalLock = null; // { requestId, user, startedAt }
const LOCK_TIMEOUT_MS = 10000; // 10s safety auto-release

function acquireLock(requestId, user) {
  // Auto-expire stale locks
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
// List requests from ClickHouse with optional status/date filter
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
// Create a new request.
// Accepts EITHER { widgetIds } (existing DB widgets) OR { widgets, headerWidgets }
// (inline frontend widgets — creates Widget records + Request in one transaction).
router.post('/', async (req, res, next) => {
  try {
    const { widgetIds, widgets: inlineWidgets, headerWidgets } = req.body;

    // ── Path A: Inline widgets from frontend (create + submit in one step) ──
    if (Array.isArray(inlineWidgets)) {
      // Validate each inline widget (if any)
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

      // Must have at least body widgets OR header widgets
      if (inlineWidgets.length === 0 && (!headerWidgets || Object.keys(headerWidgets).length === 0)) {
        return res.status(400).json({ error: 'At least 1 widget or header widget is required' });
      }

      // Generate request ID
      const requestId = crypto.randomUUID();

      // Create Widget records in Prisma (still needed for WidgetVersion/Comments)
      const createdWidgets = [];
      for (let i = 0; i < inlineWidgets.length; i++) {
        const w = inlineWidgets[i];
        const slug = w.slug || w.slug_name || `widget-${Date.now()}-${i}`;

        // Build config: store all non-standard canvas fields so they round-trip
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
          if (typeof File !== 'undefined' && v instanceof File) continue;
          if (typeof Blob !== 'undefined' && v instanceof Blob) continue;
          extraConfig[k] = v;
        }

        const widget = await prisma.widget.create({
          data: {
            type: w.type || 'unknown',
            slug,
            env: req.env,
            title: w.title || '',
            titleHi: w.titleHi || '',
            status: 'PENDING',
            sortOrder: i,
            pnc: JSON.stringify(w.pnc || {}),
            config: JSON.stringify({ ...(w.config || {}), ...extraConfig }),
            products: JSON.stringify(w.products || []),
            createdBy: req.user.id,
          },
        });
        createdWidgets.push({ widget, original: w });
      }

      // Assign widget IDs to inline widgets for ClickHouse snapshot
      const widgetsWithIds = inlineWidgets.map((w, i) => ({
        ...w,
        id: createdWidgets[i]?.widget.id || w.id || '',
      }));

      // BLOCKING: Create submission in ClickHouse (source of truth)
      await KineticSync.createSubmission(requestId, widgetsWithIds, req.user, req.env, headerWidgets);

      // BLOCKING: Log activity
      await KineticSync.logActivity({
        action: 'submit',
        user: req.user,
        targetId: requestId,
        targetType: 'request',
        details: { widgetCount: createdWidgets.length },
        env: req.env,
      });

      // ── Auto-approve for SUPER_ADMIN ──
      // SUPER_ADMIN has both maker + checker powers, skip the PENDING step
      if (req.user.role === 'SUPER_ADMIN') {
        // Update status to APPROVED in ClickHouse
        await KineticSync.updateRequestStatus(requestId, 'APPROVED', req.user, req.env);

        // Update Widget.status in Prisma
        const widgetIds = createdWidgets.map(cw => cw.widget.id);
        if (widgetIds.length > 0) {
          await prisma.widget.updateMany({
            where: { id: { in: widgetIds } },
            data: { status: 'APPROVED' },
          });
        }

        // Log auto-approve activity
        await KineticSync.logActivity({
          action: 'approve',
          user: req.user,
          targetId: requestId,
          targetType: 'request',
          details: { approvedWidgets: createdWidgets.length, autoApproved: true },
          env: req.env,
        });
      }

      // Fetch the created request back from ClickHouse to return consistent response
      const created = await KineticSync.fetchRequestById(requestId, req.env);

      return res.status(201).json(created);
    }

    // ── Path B: Existing widget IDs (original behavior) ──
    if (!widgetIds || !Array.isArray(widgetIds) || widgetIds.length === 0) {
      return res.status(400).json({ error: 'widgetIds array or widgets array is required' });
    }

    // Fetch widgets from Prisma and snapshot them
    const widgets = await prisma.widget.findMany({
      where: { id: { in: widgetIds } },
    });

    const requestId = crypto.randomUUID();

    // Build widget snapshots for ClickHouse
    const widgetSnapshots = widgets.map((w, i) => ({
      id: w.id,
      type: w.type,
      slug: w.slug,
      title: w.title,
      titleHi: w.titleHi,
      pnc: JSON.parse(w.pnc),
      config: JSON.parse(w.config),
      products: JSON.parse(w.products),
      sortOrder: i,
    }));

    // BLOCKING: Create in ClickHouse
    await KineticSync.createSubmission(requestId, widgetSnapshots, req.user, req.env, headerWidgets);

    // BLOCKING: Log activity
    await KineticSync.logActivity({
      action: 'submit',
      user: req.user,
      targetId: requestId,
      targetType: 'request',
      details: { widgetCount: widgets.length },
      env: req.env,
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
// PENDING -> APPROVED (CHECKER only)
router.post('/:id/approve', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can approve' });
    }

    // Acquire approval lock
    if (!acquireLock(req.params.id, req.user.email || req.user.name)) {
      return res.status(423).json({
        error: 'Another approval is already in progress, please wait',
        lockedBy: approvalLock.user,
        requestId: approvalLock.requestId,
      });
    }

    try {
      // Read from ClickHouse
      const request = await KineticSync.fetchRequestById(req.params.id, req.env);

      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: `Cannot approve request in ${request.status} status` });
      }

      // Optional: approve only selected widgets
      const { selectedWidgetIds } = req.body;
      const widgetIds = selectedWidgetIds
        ? request.requestWidgets.filter(rw => selectedWidgetIds.includes(rw.widgetId)).map(rw => rw.widgetId)
        : request.requestWidgets.map(rw => rw.widgetId);

      // BLOCKING: Update status in ClickHouse
      await KineticSync.updateRequestStatus(req.params.id, 'APPROVED', req.user, req.env);

      // Update Widget.status in Prisma (still needed for WidgetVersion/Comments/canvas UI)
      await prisma.widget.updateMany({
        where: { id: { in: widgetIds } },
        data: { status: 'APPROVED' },
      });

      // BLOCKING: Log activity
      await KineticSync.logActivity({
        action: 'approve',
        user: req.user,
        targetId: req.params.id,
        targetType: 'request',
        details: { approvedWidgets: widgetIds.length },
        env: req.env,
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
// PENDING -> REJECTED (CHECKER only)
router.post('/:id/reject', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can reject' });
    }

    // Acquire approval lock
    if (!acquireLock(req.params.id, req.user.email || req.user.name)) {
      return res.status(423).json({
        error: 'Another approval is already in progress, please wait',
        lockedBy: approvalLock.user,
        requestId: approvalLock.requestId,
      });
    }

    try {
      // Read from ClickHouse
      const request = await KineticSync.fetchRequestById(req.params.id, req.env);

      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: `Cannot reject request in ${request.status} status` });
      }

      const { reason } = req.body;

      // BLOCKING: Update status in ClickHouse
      await KineticSync.updateRequestStatus(req.params.id, 'REJECTED', req.user, req.env, {
        rejectionReason: reason || '',
      });

      // Update Widget.status in Prisma
      const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
      await prisma.widget.updateMany({
        where: { id: { in: widgetIds } },
        data: { status: 'REJECTED' },
      });

      // BLOCKING: Log activity
      await KineticSync.logActivity({
        action: 'reject',
        user: req.user,
        targetId: req.params.id,
        targetType: 'request',
        details: { reason, widgetCount: widgetIds.length },
        env: req.env,
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
// APPROVED/REJECTED -> DRAFT (re-edit)
router.post('/:id/reopen', async (req, res, next) => {
  try {
    // Read from ClickHouse
    const request = await KineticSync.fetchRequestById(req.params.id, req.env);

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'APPROVED' && request.status !== 'REJECTED') {
      return res.status(400).json({ error: `Cannot reopen request in ${request.status} status` });
    }

    // BLOCKING: Update status in ClickHouse
    await KineticSync.updateRequestStatus(req.params.id, 'DRAFT', req.user, req.env, {
      rejectionReason: '',
    });

    // Update Widget.status in Prisma
    const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
    await prisma.widget.updateMany({
      where: { id: { in: widgetIds } },
      data: { status: 'DRAFT' },
    });

    // BLOCKING: Log activity
    await KineticSync.logActivity({
      action: 'reopen',
      user: req.user,
      targetId: req.params.id,
      targetType: 'request',
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
