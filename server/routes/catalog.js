import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

// ── GET /catalog/search?q=rice&limit=20 ──
// Search products by name or item code
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const take = Math.min(parseInt(limit, 10) || 20, 100);

    // Search by itemCode (exact) or name (contains)
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { itemCode: q.trim() },
          { name: { contains: q.trim() } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (err) { next(err); }
});

// ── GET /catalog/batch?codes=746,5005,2476 ──
// Batch lookup by item codes
router.get('/batch', async (req, res, next) => {
  try {
    const { codes } = req.query;
    if (!codes) return res.status(400).json({ error: 'codes parameter is required' });

    const codeList = codes.split(',').map(c => c.trim()).filter(Boolean);

    const products = await prisma.product.findMany({
      where: { itemCode: { in: codeList } },
    });

    // Return as a map: code -> product
    const map = {};
    for (const p of products) {
      map[p.itemCode] = p;
    }

    res.json(map);
  } catch (err) { next(err); }
});

export default router;
