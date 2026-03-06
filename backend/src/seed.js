// src/seed.js
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import cfg from './config.js';

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@opt.local';
  const plain = process.env.ADMIN_PASSWORD || 'Admin@123';
  const rounds = cfg.bcryptRounds || 10;

  const { rows } = await pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email]);
  if (rows.length) return;

  const hash = await bcrypt.hash(plain, rounds);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)`,
    ['Admin', email, hash, 'ADMIN']
  );
}

// Dev-only: if you ever need to inject mock positions from a file, guard it:
// export async function seedFromMockIfEnabled() { ... }