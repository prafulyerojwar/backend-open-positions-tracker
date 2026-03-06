// src/models/positionModel.js
import { pool } from '../db.js';

export async function listPositions({ status, clientId, q, limit = 50, offset = 0 } = {}) {
  const where = [];
  const args = [];

  if (status) { args.push(status); where.push(`p.status = $${args.length}`); }
  if (clientId) { args.push(clientId); where.push(`p.client_id = $${args.length}`); }
  if (q) { args.push(`%${q}%`); where.push(`(p.opportunity_project ILIKE $${args.length} OR p.notes ILIKE $${args.length})`); }

  args.push(Number(limit) || 50);
  args.push(Number(offset) || 0);

  const { rows } = await pool.query(
    `SELECT p.*, c.name AS client_name
     FROM positions p
     LEFT JOIN clients c ON c.id = p.client_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.created_at DESC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows;
}

export async function insertPositions(rows) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      const cols = Object.keys(r);
      const vals = Object.values(r);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await client.query(
        `INSERT INTO positions (${cols.join(',')}) VALUES (${ph})`,
        vals
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}