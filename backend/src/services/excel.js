// src/services/excel.js
import XLSX from 'xlsx';
import { pool } from '../db.js';
import { getAllColumns } from '../models/configModel.js';
import { upsertClientByName } from '../models/clientModel.js';

const STRICT = String(process.env.SYNC_STRICT || 'false') === 'true';

async function buildEnumSets() {
  const rows = await getAllColumns();
  const toSet = key => new Set((rows.find(r => r.key === key)?.options || []));
  return {
    priority: toSet('priority'),
    type: toSet('type'),
    level: toSet('careerLevel') || toSet('level'),
    location: toSet('location'),
    status: toSet('status'),
  };
}

function makeValidator(enumMap) {
  return (row) => {
    const errors = [];
    if (row.priority && !enumMap.priority.has(row.priority)) errors.push(`priority[${row.priority}] not in enum`);
    if (row.type && !enumMap.type.has(row.type)) errors.push(`type[${row.type}] not in enum`);
    if (row.level && !enumMap.level.has(row.level)) errors.push(`level[${row.level}] not in enum`);
    if (row.location && !enumMap.location.has(row.location)) errors.push(`location[${row.location}] not in enum`);
    if (row.status && !enumMap.status.has(row.status)) errors.push(`status[${row.status}] not in enum`);
    return errors;
  };
}

const FIELD_MAP = {
  'Priority': 'priority',
  'Type': 'type',
  'Client': 'client',
  'Opportunity / Project': 'project',
  'Probability %': 'probability',
  'Est. Start Date': 'startDate',
  'Role': 'role',
  'Career Level': 'level',
  'Location': 'location',
  'Primary Skill': 'skills',
  'Status': 'status',
};

function normalizeRow(row) {
  const out = {};
  const lowerKeyed = {};
  Object.keys(row || {}).forEach(k => { lowerKeyed[k.trim().toLowerCase()] = row[k]; });

  Object.entries(FIELD_MAP).forEach(([xlsxCol, apiField]) => {
    const exact = row?.[xlsxCol];
    const loose = lowerKeyed[xlsxCol.trim().toLowerCase()];
    const val = exact !== undefined ? exact : loose;
    if (val !== undefined && val !== null) out[apiField] = val;
  });

  if (typeof out.probability === 'string') {
    const n = Number(out.probability.replace('%', '').trim());
    if (!Number.isNaN(n)) out.probability = n;
  }
  return out;
}

async function upsertClientByNameTx(clientName, tx) {
  const q = `
    INSERT INTO clients(name) VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `;
  const { rows } = await tx.query(q, [clientName]);
  if (rows[0]) return rows[0];
  const r2 = await tx.query('SELECT id, name FROM clients WHERE name=$1', [clientName]);
  return r2.rows[0];
}

async function insertPosition(apiRow, tx, userId = null) {
  const patch = {};
  if (apiRow.project)   patch.opportunity_project = apiRow.project;
  if (apiRow.startDate) patch.estimated_start_date = apiRow.startDate;
  if (apiRow.level)     patch.career_level = apiRow.level;
  if (apiRow.skills)    patch.skill = apiRow.skills;

  const cols = [
    'priority','type','client_id','opportunity_project','probability',
    'estimated_start_date','role','career_level','location','skill','status','created_by'
  ];
  const vals = [
    apiRow.priority ?? null,
    apiRow.type ?? null,
    apiRow.client_id ?? null,
    patch.opportunity_project ?? null,
    apiRow.probability ?? null,
    patch.estimated_start_date ?? null,
    apiRow.role ?? null,
    patch.career_level ?? null,
    apiRow.location ?? null,
    patch.skill ?? null,
    apiRow.status ?? null,
    userId,
  ];
  const ph = vals.map((_, i) => `$${i + 1}`).join(',');
  await tx.query(`INSERT INTO positions (${cols.join(',')}) VALUES (${ph})`, vals);
}

function parseAnyFile(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const csvText = buffer.toString('utf8');
    const wb = XLSX.read(csvText, { type: 'string' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const clients = XLSX.utils.sheet_to_json(sheet);
    return { clientRows: clients, posRows: [] };
  }

  const wb = XLSX.read(buffer, { type: 'buffer' });
  const clientsSheet   = wb.Sheets['Clients'];
  const positionsSheet = wb.Sheets['Positions'] || wb.Sheets['OpenPositions'] || wb.Sheets['Sheet1'];

  const clientRows = clientsSheet   ? XLSX.utils.sheet_to_json(clientsSheet)   : [];
  const posRows    = positionsSheet ? XLSX.utils.sheet_to_json(positionsSheet) : [];

  return { clientRows, posRows };
}

export async function parseExcelAndSync(buffer, filename, userId = null) {
  const { clientRows, posRows } = parseAnyFile(buffer, filename);
  const enumSets = await buildEnumSets();
  const validateStaticEnums = makeValidator(enumSets);

  console.log('[SYNC] filename =', filename);
  console.log('[SYNC] clientRows count =', Array.isArray(clientRows) ? clientRows.length : 'n/a');
  console.log('[SYNC] posRows count =', Array.isArray(posRows) ? posRows.length : 'n/a');

  if (!clientRows.length && !posRows.length) {
    return { ok: false, message: 'No Clients or Positions found in file' };
  }

  const clientNames = new Set();
  clientRows.forEach(r => {
    const name = (r['Client'] || r['Name'] || r['client'] || '').toString().trim();
    if (name) clientNames.add(name);
  });

  let clientsUpserted = 0;
  let positionsInserted = 0;
  let skipped = 0;
  const errors = [];

  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');

    for (const name of clientNames) {
      const before = await tx.query('SELECT 1 FROM clients WHERE name=$1', [name]);
      await upsertClientByNameTx(name, tx);
      if (before.rowCount === 0) clientsUpserted++;
    }

    for (const raw of posRows) {
      const apiRow = normalizeRow(raw);
      const enumErrors = validateStaticEnums(apiRow);
      if (enumErrors.length && STRICT) {
        skipped++;
        errors.push({ row: raw, reason: enumErrors.join('; ') });
        continue;
      }

      const clientName = (apiRow.client || '').toString().trim();
      if (!clientName) {
        skipped++;
        errors.push({ row: raw, reason: 'Missing Client' });
        continue;
      }
      const clientRec = await upsertClientByNameTx(clientName, tx);
      if (!clientRec?.id) {
        skipped++;
        errors.push({ row: raw, reason: `Cannot upsert/find client ${clientName}` });
        continue;
      }
      apiRow.client_id = clientRec.id;

      await insertPosition(apiRow, tx, userId);
      positionsInserted++;
    }

    await tx.query('COMMIT');
  } catch (e) {
    await tx.query('ROLLBACK');
    console.error('[SYNC] ERROR:', e?.message || e);
    throw e;
  } finally {
    tx.release();
  }

  return {
    ok: true,
    message: 'Sync complete',
    clientsUpserted,
    positionsInserted,
    skipped,
    errors
  };
}