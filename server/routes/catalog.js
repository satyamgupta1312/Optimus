import { Router } from 'express';
import * as WidgetData from '../services/WidgetDataService.js';

const router = Router();

// ── GET /catalog/search?q=rice&limit=20 ──
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const products = await WidgetData.searchProducts(q, take);
    res.json(products);
  } catch (err) { next(err); }
});

// ── GET /catalog/batch?codes=746,5005,2476 ──
router.get('/batch', async (req, res, next) => {
  try {
    const { codes } = req.query;
    if (!codes) return res.status(400).json({ error: 'codes parameter is required' });

    const codeList = codes.split(',').map(c => c.trim()).filter(Boolean);
    const map = await WidgetData.batchProducts(codeList);
    res.json(map);
  } catch (err) { next(err); }
});

export default router;
