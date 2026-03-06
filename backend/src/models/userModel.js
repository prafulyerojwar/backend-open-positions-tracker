// src/models/userModel.js
import { pool } from '../db.js';

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE lower(email)=lower($1) LIMIT 1',
    [email]
  );
  return rows[0];
}