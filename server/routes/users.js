import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

const SUPER_ADMIN_EMAIL = 'satyam.gupta@apnamart.in';

// ── GET /users/me ──
router.get('/me', async (req, res) => {
  res.json(req.user);
});

// ── GET /users/checkers ──
// Returns checker list + SUPER_ADMIN (non-removable)
router.get('/checkers', async (_req, res, next) => {
  try {
    // Get all users in the checker list
    const checkers = await prisma.checkerList.findMany({
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
// Add a user to the checker list (SUPER_ADMIN only)
router.post('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();

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

    // Add to checker list (ignore if already exists)
    await prisma.checkerList.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { next(err); }
});

// ── DELETE /users/checkers ──
// Remove a user from the checker list (SUPER_ADMIN only)
router.delete('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();

    // Cannot remove SUPER_ADMIN
    if (lowerEmail === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Cannot remove SUPER_ADMIN from checker list' });
    }

    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.checkerList.deleteMany({ where: { userId: user.id } });

    // Reset role back to MAKER (auth middleware will resolve on next request)
    await prisma.user.update({ where: { id: user.id }, data: { role: 'MAKER' } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
