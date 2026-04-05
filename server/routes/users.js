import { Router } from 'express';
import * as WidgetData from '../services/WidgetDataService.js';

const router = Router();

const SUPER_ADMIN_IDENTIFIERS = ['satyam.gupta@apnamart.in', 'satyam'];

// ── GET /users/me ──
router.get('/me', async (req, res) => {
  res.json(req.user);
});

// ── GET /users/checkers ──
router.get('/checkers', async (req, res, next) => {
  try {
    const checkers = await WidgetData.listCheckers(req.env);

    const result = checkers.map(c => ({
      email: c.email,
      name: c.name,
      role: c.role,
      addedAt: c.addedAt,
    }));

    // Filter out super admins from dynamic list (they're shown separately in UI)
    const filtered = result.filter(u => !SUPER_ADMIN_IDENTIFIERS.includes(u.email));

    res.json(filtered);
  } catch (err) { next(err); }
});

// ── POST /users/checkers ──
router.post('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();

    if (SUPER_ADMIN_IDENTIFIERS.includes(lowerEmail)) {
      return res.status(400).json({ error: 'SUPER_ADMIN already has all checker powers' });
    }

    const user = await WidgetData.addChecker(lowerEmail, name, req.env, req.user.email);

    res.status(201).json({ success: true, user });
  } catch (err) { next(err); }
});

// ── DELETE /users/checkers ──
router.delete('/checkers', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can manage checkers' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const lowerEmail = email.toLowerCase();

    if (SUPER_ADMIN_IDENTIFIERS.includes(lowerEmail)) {
      return res.status(400).json({ error: 'Cannot remove SUPER_ADMIN from checker list' });
    }

    await WidgetData.removeChecker(lowerEmail, req.env);

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
