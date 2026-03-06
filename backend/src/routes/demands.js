// src/routes/demands.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listPositions, insertPositions } from '../models/positionModel.js';
import { getAllColumns } from '../models/configModel.js';
import { mapIncomingRowToDb, validateRowAgainstConfig } from '../services/positionMapper.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, clientId, q, limit, offset } = req.query;
    const data = await listPositions({ status, clientId, q, limit, offset });
    res.json({ data });
  } catch (e) { next(e); }
});

router.post('/bulk', requireAuth, async (req, res, next) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [];
    if (!payload.length) return res.status(400).json({ message: 'Array of rows required' });

    const config = await getAllColumns();

    const mapped = [];
    const errors = [];
    for (let i = 0; i < payload.length; i++) {
      const row = payload[i];
      const issues = validateRowAgainstConfig(row, config);
      if (issues.length) {
        errors.push({ index: i, errors: issues });
        continue;
      }
      mapped.push(await mapIncomingRowToDb(row));
    }

    if (errors.length) return res.status(422).json({ message: 'Validation errors', errors });

    await insertPositions(mapped);
    res.json({ inserted: mapped.length });
  } catch (e) { next(e); }
});

export default router;