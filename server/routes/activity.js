import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

// ── GET /activity?page=1&limit=50&action=approve ──
// Paginated activity log
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.userId) where.userId = req.query.userId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      logs: logs.map(l => ({ ...l, details: JSON.parse(l.details) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

export default router;
