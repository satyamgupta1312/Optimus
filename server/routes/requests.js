import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { validateWidget } from '../middleware/validate.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── GET /requests ──
// List requests with optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const where = { env: req.env };
    if (status) where.status = status;

    // Date filter: ?date=2026-02-25 → requests created on that day
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submitter: { select: { email: true, name: true } },
        requestWidgets: {
          orderBy: { sortOrder: 'asc' },
          include: {
            widget: { select: { id: true, type: true, slug: true, title: true } },
          },
        },
      },
    });

    const parsed = requests.map(r => ({
      ...r,
      headerWidgets: JSON.parse(r.headerWidgets),
      requestWidgets: r.requestWidgets.map(rw => ({
        ...rw,
        snapshot: JSON.parse(rw.snapshot),
      })),
    }));

    res.json(parsed);
  } catch (err) { next(err); }
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

      // Create Widget records + Request + RequestWidgets in a single transaction
      const request = await prisma.$transaction(async (tx) => {
        // Create widgets in DB
        const createdWidgets = [];
        for (let i = 0; i < inlineWidgets.length; i++) {
          const w = inlineWidgets[i];
          const slug = w.slug || w.slug_name || `widget-${Date.now()}-${i}`;

          // Build config: store all non-standard canvas fields so they round-trip
          // through DB correctly (e.g. carouselItems, background_media, etc.)
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
            // Skip File/Blob — can't be serialised (frontend strips them before submit anyway)
            if (typeof File !== 'undefined' && v instanceof File) continue;
            if (typeof Blob !== 'undefined' && v instanceof Blob) continue;
            extraConfig[k] = v;
          }

          const widget = await tx.widget.create({
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

        // Create Request with status PENDING (combined create + submit)
        const req_ = await tx.request.create({
          data: {
            status: 'PENDING',
            env: req.env,
            submittedBy: req.user.id,
            headerWidgets: JSON.stringify(headerWidgets || {}),
            requestWidgets: {
              create: createdWidgets.map(({ widget, original }, i) => ({
                widgetId: widget.id,
                snapshot: JSON.stringify(original),
                sortOrder: i,
              })),
            },
          },
          include: {
            submitter: { select: { email: true, name: true } },
            requestWidgets: true,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            action: 'submit',
            userId: req.user.id,
            targetId: req_.id,
            details: JSON.stringify({ widgetCount: createdWidgets.length }),
          },
        });

        return req_;
      });

      // Fire-and-forget: sync to Kinetic (non-blocking)
      KineticSync.syncSubmission(request, inlineWidgets, req.user, req.env)
        .catch(err => console.warn('[Kinetic] Submit sync failed:', err.message));

      return res.status(201).json({
        ...request,
        headerWidgets: JSON.parse(request.headerWidgets),
        requestWidgets: request.requestWidgets.map(rw => ({
          ...rw,
          snapshot: JSON.parse(rw.snapshot),
        })),
      });
    }

    // ── Path B: Existing widget IDs (original behavior) ──
    if (!widgetIds || !Array.isArray(widgetIds) || widgetIds.length === 0) {
      return res.status(400).json({ error: 'widgetIds array or widgets array is required' });
    }

    // Fetch widgets and snapshot them
    const widgets = await prisma.widget.findMany({
      where: { id: { in: widgetIds } },
    });

    const request = await prisma.request.create({
      data: {
        submittedBy: req.user.id,
        env: req.env,
        headerWidgets: JSON.stringify(headerWidgets || {}),
        requestWidgets: {
          create: widgets.map((w, i) => ({
            widgetId: w.id,
            snapshot: JSON.stringify({
              type: w.type,
              slug: w.slug,
              title: w.title,
              titleHi: w.titleHi,
              pnc: JSON.parse(w.pnc),
              config: JSON.parse(w.config),
              products: JSON.parse(w.products),
            }),
            sortOrder: i,
          })),
        },
      },
      include: {
        submitter: { select: { email: true, name: true } },
        requestWidgets: true,
      },
    });

    res.status(201).json({
      ...request,
      headerWidgets: JSON.parse(request.headerWidgets),
      requestWidgets: request.requestWidgets.map(rw => ({
        ...rw,
        snapshot: JSON.parse(rw.snapshot),
      })),
    });
  } catch (err) { next(err); }
});

// ── POST /requests/:id/submit ──
// DRAFT -> PENDING (with server-side validation)
router.post('/:id/submit', async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { requestWidgets: true },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot submit request in ${request.status} status` });
    }

    // Validate all widget snapshots
    const allErrors = [];
    for (const rw of request.requestWidgets) {
      const snapshot = JSON.parse(rw.snapshot);
      const errors = validateWidget(snapshot);
      if (errors.length > 0) {
        allErrors.push({ widget: snapshot.title || snapshot.slug, errors });
      }
    }

    if (allErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: allErrors });
    }

    // Transition to PENDING
    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'PENDING' },
    });

    // Update widget statuses
    const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
    await prisma.widget.updateMany({
      where: { id: { in: widgetIds } },
      data: { status: 'PENDING' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'submit',
        userId: req.user.id,
        targetId: request.id,
        details: JSON.stringify({ widgetCount: widgetIds.length }),
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// ── POST /requests/:id/approve ──
// PENDING -> APPROVED (CHECKER only)
router.post('/:id/approve', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can approve' });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { requestWidgets: true },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve request in ${request.status} status` });
    }

    // Optional: approve only selected widgets
    const { selectedWidgetIds } = req.body;
    const widgetIds = selectedWidgetIds
      ? request.requestWidgets.filter(rw => selectedWidgetIds.includes(rw.widgetId)).map(rw => rw.widgetId)
      : request.requestWidgets.map(rw => rw.widgetId);

    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
    });

    await prisma.widget.updateMany({
      where: { id: { in: widgetIds } },
      data: { status: 'APPROVED' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'approve',
        userId: req.user.id,
        targetId: request.id,
        details: JSON.stringify({ approvedWidgets: widgetIds.length }),
      },
    });

    // Fire-and-forget: sync status to Kinetic
    KineticSync.syncStatusChange(req.params.id, 'APPROVED', req.user)
      .catch(err => console.warn('[Kinetic] Approve sync failed:', err.message));

    res.json(updated);
  } catch (err) { next(err); }
});

// ── POST /requests/:id/reject ──
// PENDING -> REJECTED (CHECKER only)
router.post('/:id/reject', async (req, res, next) => {
  try {
    if (req.user.role !== 'CHECKER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only CHECKER or SUPER_ADMIN can reject' });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { requestWidgets: true },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject request in ${request.status} status` });
    }

    const { reason } = req.body;

    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectionReason: reason || '' },
    });

    const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
    await prisma.widget.updateMany({
      where: { id: { in: widgetIds } },
      data: { status: 'REJECTED' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'reject',
        userId: req.user.id,
        targetId: request.id,
        details: JSON.stringify({ reason, widgetCount: widgetIds.length }),
      },
    });

    // Fire-and-forget: sync status to Kinetic
    KineticSync.syncStatusChange(req.params.id, 'REJECTED', req.user)
      .catch(err => console.warn('[Kinetic] Reject sync failed:', err.message));

    res.json(updated);
  } catch (err) { next(err); }
});

// ── POST /requests/:id/reopen ──
// APPROVED/REJECTED -> DRAFT (re-edit)
router.post('/:id/reopen', async (req, res, next) => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { requestWidgets: true },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'APPROVED' && request.status !== 'REJECTED') {
      return res.status(400).json({ error: `Cannot reopen request in ${request.status} status` });
    }

    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT', rejectionReason: '' },
    });

    const widgetIds = request.requestWidgets.map(rw => rw.widgetId);
    await prisma.widget.updateMany({
      where: { id: { in: widgetIds } },
      data: { status: 'DRAFT' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'reopen',
        userId: req.user.id,
        targetId: request.id,
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
