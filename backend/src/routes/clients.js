// src/routes/clients.js
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getClients, getClientById, upsertClientByNameCI, updateClient, deleteClient, bulkUpsertClientsByName
} from '../models/clientModel.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const includeDetails = String(req.query.includeDetails || 'false') === 'true';
    const search = req.query.search || '';
    const data = await getClients({ q: search, limit: req.query.limit, offset: req.query.offset });
    if (!includeDetails) {
      return res.json({ data: data.map(r => ({ id: r.id, name: r.name })) });
    }
    return res.json({
      data: data.map(r => ({
        id: r.id,
        name: r.name,
        industry: r.industry || null,
        deliveryUnit: r.contact_details?.deliveryUnit || null,
        duHead: r.contact_details?.duHead || null,
        indiaHiringPOC: r.contact_details?.indiaHiringPOC || null
      }))
    });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('ADMIN','LEAD'), async (req, res, next) => {
  try {
    const { name, industry, deliveryUnit, duHead, indiaHiringPOC } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });
    const c = await upsertClientByNameCI({ name, industry, deliveryUnit, duHead, indiaHiringPOC });
    res.status(201).json({
      id: c.id,
      name: c.name,
      industry: c.industry || null,
      deliveryUnit: c.contact_details?.deliveryUnit || null,
      duHead: c.contact_details?.duHead || null,
      indiaHiringPOC: c.contact_details?.indiaHiringPOC || null
    });
  } catch (e) { next(e); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const c = await getClientById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json({ data: c });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireRole('ADMIN','LEAD'), async (req, res, next) => {
  try {
    const c = await updateClient(req.params.id, req.body || {});
    res.json({ data: c });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await deleteClient(req.params.id);
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

router.post('/bulk', requireAuth, requireRole('ADMIN','LEAD'), async (req, res, next) => {
  try {
    const { clients } = req.body || {};
    if (!Array.isArray(clients) || !clients.length) {
      return res.status(400).json({ message: 'clients: string[] required' });
    }
    const list = await bulkUpsertClientsByName(clients);
    res.json({ upserted: list.length, data: list.map(c => ({ id: c.id, name: c.name })) });
  } catch (e) { next(e); }
});

export default router;