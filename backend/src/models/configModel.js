// src/models/configModel.js
import { pool } from '../db.js';

export async function getAllColumns() {
  const { rows } = await pool.query(
    `SELECT id, key, label, input_type, options, required, is_active, order_index
     FROM master_config
     WHERE is_active = true
     ORDER BY order_index ASC, id ASC`
  );
  return rows;
}

export async function upsertColumns(columns = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of columns) {
      await client.query(
        `INSERT INTO master_config (key, label, input_type, options, required, is_active, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (key) DO UPDATE
         SET label=EXCLUDED.label,
             input_type=EXCLUDED.input_type,
             options=EXCLUDED.options,
             required=EXCLUDED.required,
             is_active=EXCLUDED.is_active,
             order_index=EXCLUDED.order_index`,
        [
          c.key,
          c.label || c.key,
          c.input_type,
          c.options ?? null,
          !!c.required,
          (c.is_active ?? true),
          Number.isFinite(c.order_index) ? c.order_index : 0
        ]
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