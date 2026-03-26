import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── GET /header-widgets ──
// Get both header widget slots
router.get('/', async (_req, res, next) => {
  try {
    const headers = await prisma.headerWidget.findMany();
    const result = {
      primaryMasthead: null,
      secondaryMasthead: null,
    };

    for (const h of headers) {
      result[h.id] = JSON.parse(h.config);
    }

    res.json(result);
  } catch (err) { next(err); }
});

// ── PUT /header-widgets ──
// Update one or both header widget slots
// Body: { primaryMasthead?: {...}, secondaryMasthead?: {...} }
router.put('/', async (req, res, next) => {
  try {
    const { primaryMasthead, secondaryMasthead } = req.body;

    const ops = [];
    if (primaryMasthead !== undefined) {
      ops.push(
        prisma.headerWidget.upsert({
          where: { id: 'primaryMasthead' },
          update: { config: JSON.stringify(primaryMasthead) },
          create: { id: 'primaryMasthead', config: JSON.stringify(primaryMasthead) },
        })
      );
    }
    if (secondaryMasthead !== undefined) {
      ops.push(
        prisma.headerWidget.upsert({
          where: { id: 'secondaryMasthead' },
          update: { config: JSON.stringify(secondaryMasthead) },
          create: { id: 'secondaryMasthead', config: JSON.stringify(secondaryMasthead) },
        })
      );
    }

    if (ops.length === 0) {
      return res.status(400).json({ error: 'Provide primaryMasthead or secondaryMasthead' });
    }

    await prisma.$transaction(ops);

    KineticSync.logActivitySafe({
      action: 'update',
      user: req.user,
      targetId: 'headerWidgets',
      targetType: 'headerWidgets',
      details: { updated: Object.keys(req.body) },
      env: req.env,
    });

    // Return updated state
    const headers = await prisma.headerWidget.findMany();
    const result = { primaryMasthead: null, secondaryMasthead: null };
    for (const h of headers) {
      result[h.id] = JSON.parse(h.config);
    }
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
