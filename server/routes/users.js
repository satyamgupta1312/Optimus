import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import * as KineticSync from '../services/KineticSyncService.js';

const router = Router();

const SUPER_ADMIN_EMAIL = 'satyam.gupta@apnamart.in';

// ── GET /users/me ──
router.get('/me', async (req, res) => {
  res.json(req.user);
});

// ── GET /users/checkers ──
// Returns checker list for the current environment + SUPER_ADMIN (non-removable)
router.get('/checkers', async (req, res, next) => {
  try {
    const env = req.env; // Set by auth middleware from X-Optimus-Env header

    // Get all users in the checker list for THIS environment
    const checkers = await prisma.checkerList.findMany({
      where: { env },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });

    const result = checkers.map(c => ({
      ...c.user,
      addedAt: c.addedAt,
    }));

    // Always include SUPER_ADMIN at the top (non-removable, per wiki §2)
    const superAdmin = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
      select: { id: true, email: true, name: true, role: true },
    });

    if (superAdmin) {
      const alreadyIncluded = result.some(u => u.email === SUPER_ADMIN_EMAIL);
      if (!alreadyIncluded) {
        result.unshift({ ...superAdmin, addedAt: null, isSuperAdmin: true });
      } else {
        // Mark the existing entry
        const idx = result.findIndex(u => u.email === SUPER_ADMIN_EMAIL);
        if (idx !== -1) result[idx].isSuperAdmin = true;
      }
    }

    res.json(result);
  } catch (err) { next(err); }
});

// ── POST /users/checkers ──
// Add a user to the checker list for the current environment (SUPER_ADMIN only)
router.post('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();
    const env = req.env;

    // SUPER_ADMIN cannot be added to checker list (already has all powers)
    if (lowerEmail === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ error: 'SUPER_ADMIN already has all checker powers' });
    }

    // Upsert the user first, set role to CHECKER
    const user = await prisma.user.upsert({
      where: { email: lowerEmail },
      update: { role: 'CHECKER', ...(name && { name }) },
      create: { email: lowerEmail, name: name || email.split('@')[0], role: 'CHECKER' },
    });

    // Add to checker list for THIS environment (ignore if already exists)
    await prisma.checkerList.upsert({
      where: { userId_env: { userId: user.id, env } },
      update: {},
      create: { userId: user.id, env },
    });

    // Fire-and-forget Kinetic sync
    KineticSync.syncUserRoleAdd(
      { email: user.email, name: user.name, role: 'CHECKER' },
      env,
      req.user,
    ).catch(() => {});

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { next(err); }
});

// ── DELETE /users/checkers ──
// Remove a user from the checker list for the current environment (SUPER_ADMIN only)
router.delete('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();
    const env = req.env;

    // Cannot remove SUPER_ADMIN
    if (lowerEmail === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Cannot remove SUPER_ADMIN from checker list' });
    }

    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete only the checker entry for THIS environment
    await prisma.checkerList.deleteMany({ where: { userId: user.id, env } });

    // Check if user is still a checker in ANY environment
    const remainingEntries = await prisma.checkerList.count({ where: { userId: user.id } });
    if (remainingEntries === 0) {
      // No checker entries left — reset role to MAKER
      await prisma.user.update({ where: { id: user.id }, data: { role: 'MAKER' } });
    }

    // Fire-and-forget Kinetic sync (soft-delete: is_active = 0)
    KineticSync.syncUserRoleRemove(lowerEmail, env).catch(() => {});

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
