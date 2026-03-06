// src/index.js
process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION', e));

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cfg from './config.js';
import { migrate, evolve } from './db.js';
import { errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import ssoRoutes from './routes/auth_sso.js';
import demandRoutes from './routes/demands.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';
import clientRoutes from './routes/clients.js';

import { startSchedulers } from './services/scheduler.js';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: (_origin, cb) => cb(null, true), credentials: true }));

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, name: 'Open Positions Tracker API' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', ssoRoutes);
app.use('/api/v1/demands', demandRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/clients', clientRoutes);

app.use(errorHandler);

(async () => {
  await migrate();
  await evolve();     // align fulfillment + external_req_id
  // (No mock seeding at runtime)
  app.listen(cfg.port, () => console.log(`API listening on :${cfg.port}`));
  startSchedulers();
})();