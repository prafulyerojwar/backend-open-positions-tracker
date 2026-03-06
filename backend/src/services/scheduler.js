// src/services/scheduler.js
import cron from 'node-cron';
import { pool } from '../db.js';
import { sendWeekendSummary } from './email.js';

function rowsToCsv(rows) {
  if (!rows.length) return 'priority,type,client,role,status\n';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[\",\\n]/.test(s) ? `"${s.replace(/\"/g,'""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(','))
  ].join('\n');
}

// Every Saturday 10:00 Asia/Kolkata
export function startSchedulers() {
  cron.schedule('0 10 * * 6', async () => {
    const { rows: summary } = await pool.query(`
      SELECT status, COUNT(*) AS cnt
      FROM positions
      GROUP BY status
      ORDER BY status
    `);
    const items = summary.map(r => `<li><b>${r.status || 'N/A'}</b>: ${r.cnt}</li>`).join('');
    const html = `
      <h3>Open Positions - Weekly Summary</h3>
      <ul>${items}</ul>
      <p>Generated automatically.</p>
    `;

    const { rows: details } = await pool.query(`
      SELECT
        p.priority, p.type, c.name AS client, p.role, p.status,
        p.opportunity_project, p.location, p.service_line, p.practice,
        p.delivery_unit, p.create_date, p.external_req_id
      FROM positions p
      LEFT JOIN clients c ON c.id = p.client_id
      ORDER BY p.created_at DESC
      LIMIT 2000
    `);
    const csv = rowsToCsv(details);

    try {
      await sendWeekendSummary(html, undefined, [
        { filename: 'open-positions-weekly.csv', content: csv, contentType: 'text/csv' }
      ]);
    } catch (e) {
      console.error('Email error', e);
    }
  }, { timezone: 'Asia/Kolkata' });
}