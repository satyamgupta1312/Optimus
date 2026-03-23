import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

// ── GET / ──
// List all locations for current env. ?enabledOnly=true for active only
router.get('/', async (req, res, next) => {
  try {
    const where = { env: req.env };
    if (req.query.enabledOnly === 'true') {
      where.isEnabled = true;
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { label: 'asc' }],
    });

    res.json(locations);
  } catch (err) { next(err); }
});

// ── POST / ──
// Create a custom location
router.post('/', async (req, res, next) => {
  try {
    const { key, levelTag, levelProperty, slugSuffix, label, type } = req.body;

    if (!key || !levelTag || !levelProperty || !slugSuffix || !label || !type) {
      return res.status(400).json({ error: 'Missing required fields: key, levelTag, levelProperty, slugSuffix, label, type' });
    }

    const location = await prisma.location.create({
      data: {
        key,
        env: req.env,
        levelTag,
        levelProperty,
        slugSuffix,
        label,
        type,
        isDefault: false,
        isEnabled: true,
        isCustom: true,
      },
    });

    // Fire-and-forget sync to ClickHouse
    KineticSync.syncLocationUpsert(location).catch(() => {});

    res.status(201).json(location);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `Location with key "${req.body.key}" already exists` });
    }
    next(err);
  }
});

// ── PATCH /:key/toggle ──
// Toggle isEnabled. Blocks toggling isDefault entries.
router.patch('/:key/toggle', async (req, res, next) => {
  try {
    const location = await prisma.location.findUnique({
      where: { key_env: { key: req.params.key, env: req.env } },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (location.isDefault) {
      return res.status(403).json({ error: 'Cannot toggle default locations' });
    }

    const updated = await prisma.location.update({
      where: { id: location.id },
      data: { isEnabled: !location.isEnabled },
    });

    // Fire-and-forget sync to ClickHouse
    KineticSync.syncLocationUpsert(updated).catch(() => {});

    res.json(updated);
  } catch (err) { next(err); }
});

// ── DELETE /:key ──
// Delete custom locations only (isCustom: true)
router.delete('/:key', async (req, res, next) => {
  try {
    const location = await prisma.location.findUnique({
      where: { key_env: { key: req.params.key, env: req.env } },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (!location.isCustom) {
      return res.status(403).json({ error: 'Only custom locations can be deleted' });
    }

    await prisma.location.delete({ where: { id: location.id } });

    // Fire-and-forget sync to ClickHouse (soft-delete)
    KineticSync.syncLocationDelete(location.key, location.env).catch(() => {});

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /sync-all ──
// One-time bulk sync all locations from Prisma to ClickHouse
router.post('/sync-all', async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany();
    await KineticSync.syncLocationsBulk(locations);
    res.json({ synced: locations.length });
  } catch (err) { next(err); }
});

export default router;
