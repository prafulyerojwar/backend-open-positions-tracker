// src/routes/config.js
import { Router } from 'express';
import { getAllColumns, upsertColumns } from '../models/configModel.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/columns', requireAuth, async (_req, res, next) => {
  try {
    const data = await getAllColumns();
    res.json({ data });
  } catch (e) { next(e); }
});

router.put('/columns', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [];
    await upsertColumns(payload);
    const data = await getAllColumns();
    res.json({ updated: payload.length, data });
  } catch (e) { next(e); }
});

export default router;