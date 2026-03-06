// src/models/clientModel.js
import { pool } from '../db.js';

function normName(name) {
  return (name || '').trim();
}

export async function upsertClientByNameCI(args, tx = pool) {
  const isStringArg = typeof args === 'string';
  const {
    name,
    industry = null,
    deliveryUnit = null,
    duHead = null,
    indiaHiringPOC = null,
  } = isStringArg ? { name: args } : (args || {});

  const n = normName(name);
  if (!n) throw new Error('name is required');
  const db = tx || pool;

  // Case-insensitive select
  const sel = await db.query(
    'SELECT * FROM clients WHERE lower(name) = lower($1) LIMIT 1',
    [n]
  );

  if (sel.rows[0]) {
    const c = sel.rows[0];
    const noDetails =
      industry == null && !deliveryUnit && !duHead && !indiaHiringPOC;
    if (noDetails) return c;

    const details = {
      ...(c.contact_details || {}),
      ...(deliveryUnit ? { deliveryUnit } : {}),
      ...(duHead ? { duHead } : {}),
      ...(indiaHiringPOC ? { indiaHiringPOC } : {})
    };

    const upd = await db.query(
      `UPDATE clients
         SET name=$1,
             industry=COALESCE($2, industry),
             contact_details=$3,
             updated_at=now()
       WHERE id=$4
       RETURNING *`,
      [n, industry, details, c.id]
    );
    return upd.rows[0];
  }

  const details = {
    ...(deliveryUnit ? { deliveryUnit } : {}),
    ...(duHead ? { duHead } : {}),
    ...(indiaHiringPOC ? { indiaHiringPOC } : {})
  };

  const ins = await db.query(
    `INSERT INTO clients(name, industry, contact_details)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO NOTHING
     RETURNING *`,
    [n, industry, details]
  );

  if (ins.rows[0]) return ins.rows[0];

  const sel2 = await db.query(
    'SELECT * FROM clients WHERE lower(name) = lower($1) LIMIT 1',
    [n]
  );
  return sel2.rows[0] || null;
}

export async function upsertClientByName(nameOrObj, tx) {
  if (typeof nameOrObj === 'string') {
    return upsertClientByNameCI({ name: nameOrObj }, tx);
  }
  return upsertClientByNameCI(nameOrObj, tx);
}

export async function bulkUpsertClientsByName(names = []) {
  const out = [];
  for (const n of names) {
    if (!n || !String(n).trim()) continue;
    const c = await upsertClientByNameCI(String(n).trim());
    out.push(c);
  }
  return out;
}

export async function getClients({ q = '', limit = 50, offset = 0 } = {}) {
  const args = [];
  const where = [];
  if (q) {
    args.push(`%${q}%`);
    where.push(`name ILIKE $${args.length}`);
  }
  args.push(Number(limit) || 50);
  args.push(Number(offset) || 0);
  const { rows } = await pool.query(
    `SELECT * FROM clients
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY name ASC
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args
  );
  return rows;
}

export async function getClientById(id) {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id=$1', [id]);
  return rows[0];
}

export async function updateClient(id, payload = {}) {
  const fields = [];
  const vals = [];
  let i = 1;

  for (const [k, v] of Object.entries(payload)) {
    if (!['name', 'industry', 'contact_details'].includes(k)) continue;
    fields.push(`${k}=$${i++}`);
    vals.push(v);
  }
  if (!fields.length) return getClientById(id);

  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE clients SET ${fields.join(', ')}, updated_at=now() WHERE id=$${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export async function deleteClient(id) {
  await pool.query('DELETE FROM clients WHERE id=$1', [id]);
  return { deleted: true };
}