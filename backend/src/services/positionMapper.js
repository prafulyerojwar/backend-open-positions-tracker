// src/services/positionMapper.js
import { upsertClientByName } from '../models/clientModel.js';

const toDate = (s) => (s ? new Date(s) : null);
const toNum  = (n) => (n === '' || n == null ? null : Number(n));

export async function mapIncomingRowToDb(row) {
  const client = row.client ? await upsertClientByName(row.client) : null;

  const dbObj = {
    priority: row.priority ?? null,
    type: row.type ?? null,
    client_id: client?.id ?? null,
    opportunity_project: row.opportunity ?? null,
    probability: toNum(row.probability),
    estimated_start_date: toDate(row.estStartDate),
    estimated_end_date: toDate(row.estEndDate),
    service_line: row.serviceLine ?? null,
    practice: row.practice ?? null,
    delivery_unit: row.deliveryUnit ?? null,
    role: row.role ?? null,
    career_level: row.careerLevel ?? null,
    location: row.location ?? null,
    skill: row.skill ?? null,
    fulfillment: row.fulfillment ?? null,          // now column
    external_req_id: row.externalReqId ?? null,    // now column
    status: row.status ?? null,
    create_date: toDate(row.createDate),
    notes: row.notes ?? null,
    dynamic_fields: {}
  };

  const known = new Set([
    'priority','type','client','opportunity','probability','estStartDate','estEndDate',
    'serviceLine','practice','deliveryUnit','role','careerLevel','location','skill',
    'fulfillment','status','externalReqId','createDate','notes','id'
  ]);
  for (const [k, v] of Object.entries(row)) {
    if (!known.has(k)) dbObj.dynamic_fields[k] = v;
  }

  return dbObj;
}

export function validateRowAgainstConfig(row, configRows) {
  const issues = [];
  const cfg = Object.fromEntries(configRows.map(c => [c.key, c]));

  for (const [k, v] of Object.entries(row)) {
    const c = cfg[k];
    if (!c) continue;

    if (c.required && (v === undefined || v === null || v === '')) {
      issues.push(`${k} is required`);
    }
    if (c.input_type === 'select' && Array.isArray(c.options) && v != null) {
      if (!c.options.includes(v)) issues.push(`${k} value '${v}' not allowed`);
    }
    if (c.input_type === 'number' && v != null && Number.isNaN(Number(v))) {
      issues.push(`${k} must be a number`);
    }
    if (c.input_type === 'date' && v != null && Number.isNaN(Date.parse(v))) {
      issues.push(`${k} must be a valid date`);
    }
  }
  return issues;
}