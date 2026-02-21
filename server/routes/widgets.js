import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

// ── GET /widgets ──
// List all widgets, ordered by sortOrder
router.get('/', async (req, res, next) => {
  try {
    const { status, type, slug } = req.query;
    const where = { env: req.env };
    if (status) where.status = status;
    if (type) where.type = type;
    if (slug) where.slug = slug;

    const widgets = await prisma.widget.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { creator: { select: { email: true, name: true } } },
    });

    // Parse JSON fields
    const parsed = widgets.map(w => ({
      ...w,
      pnc: JSON.parse(w.pnc),
      config: JSON.parse(w.config),
      products: JSON.parse(w.products),
    }));

    res.json(parsed);
  } catch (err) { next(err); }
});

// ── POST /widgets ──
// Create a new widget
router.post('/', async (req, res, next) => {
  try {
    const { type, slug, title, titleHi, pnc, config, products, sortOrder } = req.body;

    const widget = await prisma.widget.create({
      data: {
        type,
        slug,
        env: req.env,
        title: title || '',
        titleHi: titleHi || '',
        pnc: JSON.stringify(pnc || {}),
        config: JSON.stringify(config || {}),
        products: JSON.stringify(products || []),
        sortOrder: sortOrder ?? 0,
        createdBy: req.user.id,
      },
    });

    // Create initial version
    await prisma.widgetVersion.create({
      data: {
        widgetId: widget.id,
        version: 1,
        snapshot: JSON.stringify({ ...req.body }),
        changedBy: req.user.email,
        changeLog: 'Created',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'create',
        userId: req.user.id,
        targetId: widget.id,
        details: JSON.stringify({ type, slug }),
      },
    });

    res.status(201).json({
      ...widget,
      pnc: JSON.parse(widget.pnc),
      config: JSON.parse(widget.config),
      products: JSON.parse(widget.products),
    });
  } catch (err) { next(err); }
});

// ── PATCH /widgets (bulk reorder) ──
// Body: { order: [{ id, sortOrder }] }
router.patch('/', async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array' });
    }

    await prisma.$transaction(
      order.map(({ id, sortOrder }) =>
        prisma.widget.update({ where: { id }, data: { sortOrder } })
      )
    );

    res.json({ success: true, updated: order.length });
  } catch (err) { next(err); }
});

// ── GET /widgets/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const widget = await prisma.widget.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { email: true, name: true } },
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });

    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    res.json({
      ...widget,
      pnc: JSON.parse(widget.pnc),
      config: JSON.parse(widget.config),
      products: JSON.parse(widget.products),
      versions: widget.versions.map(v => ({
        ...v,
        snapshot: JSON.parse(v.snapshot),
      })),
    });
  } catch (err) { next(err); }
});

// ── PUT /widgets/:id ──
// Full update
router.put('/:id', async (req, res, next) => {
  try {
    const { type, slug, title, titleHi, status, pnc, config, products, sortOrder } = req.body;

    // Get current version number
    const latestVersion = await prisma.widgetVersion.findFirst({
      where: { widgetId: req.params.id },
      orderBy: { version: 'desc' },
    });

    const widget = await prisma.widget.update({
      where: { id: req.params.id },
      data: {
        ...(type !== undefined && { type }),
        ...(slug !== undefined && { slug }),
        ...(title !== undefined && { title }),
        ...(titleHi !== undefined && { titleHi }),
        ...(status !== undefined && { status }),
        ...(pnc !== undefined && { pnc: JSON.stringify(pnc) }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(products !== undefined && { products: JSON.stringify(products) }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // Save version
    await prisma.widgetVersion.create({
      data: {
        widgetId: widget.id,
        version: (latestVersion?.version || 0) + 1,
        snapshot: JSON.stringify(req.body),
        changedBy: req.user.email,
        changeLog: 'Updated',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'update',
        userId: req.user.id,
        targetId: widget.id,
        details: JSON.stringify({ fields: Object.keys(req.body) }),
      },
    });

    res.json({
      ...widget,
      pnc: JSON.parse(widget.pnc),
      config: JSON.parse(widget.config),
      products: JSON.parse(widget.products),
    });
  } catch (err) { next(err); }
});

// ── PATCH /widgets/:id ──
// Partial update (same as PUT but semantic difference)
router.patch('/:id', async (req, res, next) => {
  try {
    const data = {};
    const { type, slug, title, titleHi, status, pnc, config, products, sortOrder } = req.body;

    if (type !== undefined) data.type = type;
    if (slug !== undefined) data.slug = slug;
    if (title !== undefined) data.title = title;
    if (titleHi !== undefined) data.titleHi = titleHi;
    if (status !== undefined) data.status = status;
    if (pnc !== undefined) data.pnc = JSON.stringify(pnc);
    if (config !== undefined) data.config = JSON.stringify(config);
    if (products !== undefined) data.products = JSON.stringify(products);
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const widget = await prisma.widget.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      ...widget,
      pnc: JSON.parse(widget.pnc),
      config: JSON.parse(widget.config),
      products: JSON.parse(widget.products),
    });
  } catch (err) { next(err); }
});

// ── DELETE /widgets/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.widget.delete({ where: { id: req.params.id } });

    await prisma.activityLog.create({
      data: {
        action: 'delete',
        userId: req.user.id,
        targetId: req.params.id,
      },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /widgets/:id/duplicate ──
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const source = await prisma.widget.findUnique({ where: { id: req.params.id } });
    if (!source) return res.status(404).json({ error: 'Widget not found' });

    const suffix = `_copy_${Date.now().toString(36)}`;
    const widget = await prisma.widget.create({
      data: {
        type: source.type,
        slug: source.slug + suffix,
        env: source.env,
        title: source.title + ' (Copy)',
        titleHi: source.titleHi,
        status: 'DRAFT',
        sortOrder: source.sortOrder + 1,
        pnc: source.pnc,
        config: source.config,
        products: source.products,
        createdBy: req.user.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'create',
        userId: req.user.id,
        targetId: widget.id,
        details: JSON.stringify({ duplicatedFrom: source.id }),
      },
    });

    res.status(201).json({
      ...widget,
      pnc: JSON.parse(widget.pnc),
      config: JSON.parse(widget.config),
      products: JSON.parse(widget.products),
    });
  } catch (err) { next(err); }
});

// ── GET /widgets/:id/versions ──
// Supports pagination: ?limit=20&cursor=5 (cursor = version number to start before)
router.get('/:id/versions', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = parseInt(req.query.cursor) || null;

    const where = { widgetId: req.params.id };
    if (cursor) where.version = { lt: cursor };

    const versions = await prisma.widgetVersion.findMany({
      where,
      orderBy: { version: 'desc' },
      take: limit,
    });

    const hasMore = versions.length === limit;
    const nextCursor = hasMore ? versions[versions.length - 1].version : null;

    res.json({
      versions: versions.map(v => ({
        ...v,
        snapshot: JSON.parse(v.snapshot),
      })),
      nextCursor,
      hasMore,
    });
  } catch (err) { next(err); }
});

export default router;
