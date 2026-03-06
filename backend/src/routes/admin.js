// src/routes/admin.js
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parseExcelAndSync } from '../services/excel.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post(
  '/sync',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'file is required (.xlsx)' });
      const result = await parseExcelAndSync(
        req.file.buffer,
        req.file.originalname,     // CSV/XLSX detection
        req.user?.sub
      );
      res.json(result);
    } catch (e) { next(e); }
  }
);

export default router;