import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

// ── GET /comments/widget/:id ──
// Get all comments for a widget
router.get('/widget/:id', async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { widgetId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { email: true, name: true } } },
    });
    res.json(comments);
  } catch (err) { next(err); }
});

// ── POST /comments ──
// Add a comment to a widget
router.post('/', async (req, res, next) => {
  try {
    const { widgetId, text } = req.body;
    if (!widgetId || !text) {
      return res.status(400).json({ error: 'widgetId and text are required' });
    }

    const comment = await prisma.comment.create({
      data: {
        widgetId,
        authorId: req.user.id,
        text,
      },
      include: { author: { select: { email: true, name: true } } },
    });

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// ── DELETE /comments/:id ──
// Delete a comment (author only)
router.delete('/:id', async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.authorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
