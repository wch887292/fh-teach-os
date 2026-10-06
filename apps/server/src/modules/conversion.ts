import { Router } from 'express';
import { db } from '../db';

type LeadStatus = '新线索' | '跟进中' | '已成交' | '已流失';

interface Lead {
  id: number;
  name: string;
  source: string;
  course: string;
  amount: number;
  status: LeadStatus;
}

const VALID_STATUSES: LeadStatus[] = ['新线索', '跟进中', '已成交', '已流失'];

export const conversionRouter = Router();

function fetchAllLeads(): Lead[] {
  const rows = db.prepare('SELECT id, name, source, course, amount, status FROM leads').all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    name: (r.name as string) ?? '',
    source: (r.source as string) ?? '',
    course: (r.course as string) ?? '',
    amount: Number(r.amount ?? 0),
    status: (r.status as LeadStatus) ?? '新线索',
  }));
}

conversionRouter.get('/leads', (_req, res) => {
  res.json(fetchAllLeads());
});

conversionRouter.post('/leads', (req, res) => {
  const { name, source, course, amount } = req.body || {};
  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name 必填' });
    return;
  }
  const sourceStr = typeof source === 'string' ? source : '';
  const courseStr = typeof course === 'string' ? course : '';
  const amountNum = typeof amount === 'number' ? amount : Number(amount) || 0;

  const stmt = db.prepare(
    `INSERT INTO leads (name, source, course, amount, status) VALUES (?, ?, ?, ?, '新线索')`
  );
  const result = stmt.run(name, sourceStr, courseStr, amountNum);
  const id = Number(result.lastInsertRowid);
  const lead: Lead = {
    id,
    name,
    source: sourceStr,
    course: courseStr,
    amount: amountNum,
    status: '新线索',
  };
  res.status(201).json(lead);
});

conversionRouter.patch('/leads/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const found = db.prepare('SELECT id, name, source, course, amount, status FROM leads WHERE id = ?').get(idNum);
  if (!found) {
    res.status(404).json({ error: '线索不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as LeadStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, idNum);
  const updated = db.prepare('SELECT id, name, source, course, amount, status FROM leads WHERE id = ?').get(idNum) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    name: updated.name ?? '',
    source: updated.source ?? '',
    course: updated.course ?? '',
    amount: Number(updated.amount ?? 0),
    status: updated.status as LeadStatus,
  });
});

conversionRouter.get('/stats', (_req, res) => {
  const rows = db.prepare('SELECT status, amount FROM leads').all() as unknown as { status: string; amount: number }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let totalAmount = 0;
  for (const row of rows) {
    const st = (row.status as LeadStatus) ?? '新线索';
    byStatus[st] = (byStatus[st] || 0) + 1;
    if (st === '已成交') totalAmount += Number(row.amount ?? 0);
  }
  const closedCount = byStatus['已成交'] || 0;
  const conversionRate = total === 0 ? 0 : Math.round((closedCount / total) * 10000) / 100;
  res.json({ total, byStatus, totalAmount, conversionRate });
});
