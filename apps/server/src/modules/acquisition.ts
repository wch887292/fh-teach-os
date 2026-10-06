import { Router } from 'express';
import { db } from '../db';

type ChannelStatus = '启用中' | '已停用';
type ChannelType = '线上' | '线下' | '推荐';

interface Channel {
  id: number;
  name: string;
  type: string;
  investment: number;
  costPerLead: number;
  status: ChannelStatus;
}

const VALID_STATUSES: ChannelStatus[] = ['启用中', '已停用'];

export const acquisitionRouter = Router();

function fetchAllChannels(): Channel[] {
  const rows = db.prepare(
    'SELECT id, name, type, investment, costPerLead, status FROM channels ORDER BY id ASC'
  ).all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    name: (r.name as string) ?? '',
    type: (r.type as string) ?? '',
    investment: Number(r.investment ?? 0),
    costPerLead: Number(r.costPerLead ?? 0),
    status: (r.status as ChannelStatus) ?? '启用中',
  }));
}

acquisitionRouter.get('/channels', (_req, res) => {
  res.json(fetchAllChannels());
});

acquisitionRouter.post('/channels', (req, res) => {
  const { name, type, investment, costPerLead } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name 必填' });
    return;
  }

  const investmentNum = investment !== undefined && investment !== null && investment !== ''
    ? Number(investment)
    : 0;
  const costPerLeadNum = costPerLead !== undefined && costPerLead !== null && costPerLead !== ''
    ? Number(costPerLead)
    : 0;

  if (Number.isNaN(investmentNum) || Number.isNaN(costPerLeadNum)) {
    res.status(400).json({ error: 'investment / costPerLead 必须为有效数字' });
    return;
  }

  const typeStr = typeof type === 'string' && type.trim() !== '' ? type : '线上';

  const stmt = db.prepare(
    `INSERT INTO channels (name, type, investment, costPerLead, status) VALUES (?, ?, ?, ?, '启用中')`
  );
  const result = stmt.run(name, typeStr, investmentNum, costPerLeadNum);
  const id = Number(result.lastInsertRowid);
  const channel: Channel = {
    id,
    name,
    type: typeStr,
    investment: investmentNum,
    costPerLead: costPerLeadNum,
    status: '启用中',
  };
  res.status(201).json(channel);
});

acquisitionRouter.patch('/channels/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const found = db.prepare('SELECT id FROM channels WHERE id = ?').get(idNum);
  if (!found) {
    res.status(404).json({ error: '渠道不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as ChannelStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE channels SET status = ? WHERE id = ?').run(status, idNum);
  const updated = db.prepare(
    'SELECT id, name, type, investment, costPerLead, status FROM channels WHERE id = ?'
  ).get(idNum) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    name: updated.name ?? '',
    type: updated.type ?? '',
    investment: Number(updated.investment ?? 0),
    costPerLead: Number(updated.costPerLead ?? 0),
    status: updated.status as ChannelStatus,
  });
});

acquisitionRouter.get('/stats', (_req, res) => {
  const rows = db.prepare(
    'SELECT status, investment, costPerLead FROM channels'
  ).all() as unknown as { status: string; investment: number; costPerLead: number }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let totalInvestment = 0;
  let costPerLeadSum = 0;
  for (const row of rows) {
    const st = (row.status as ChannelStatus) ?? '启用中';
    byStatus[st] = (byStatus[st] || 0) + 1;
    totalInvestment += Number(row.investment ?? 0);
    costPerLeadSum += Number(row.costPerLead ?? 0);
  }
  const avgCostPerLead = total === 0 ? 0 : Math.round((costPerLeadSum / total) * 100) / 100;
  res.json({ total, byStatus, totalInvestment, avgCostPerLead });
});
