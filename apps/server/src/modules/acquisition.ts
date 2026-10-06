import { Router } from 'express';
import { db } from '../db';

type ChannelStatus = '启用中' | '已停用';

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

function fetchAllChannels(tenantId: number): Channel[] {
  const rows = db.prepare(
    'SELECT id, name, type, investment, costPerLead, status FROM channels WHERE tenantId = ?'
  ).all(tenantId) as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    name: (r.name as string) ?? '',
    type: (r.type as string) ?? '线上',
    investment: Number(r.investment ?? 0),
    costPerLead: Number(r.costPerLead ?? 0),
    status: (r.status as ChannelStatus) ?? '启用中',
  }));
}

acquisitionRouter.get('/channels', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  res.json(fetchAllChannels(req.auth.tenantId));
});

acquisitionRouter.post('/channels', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  const { name, type, investment, costPerLead } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name 必填' });
    return;
  }

  const investmentNum =
    investment !== undefined && investment !== null && investment !== ''
      ? Number(investment)
      : 0;
  const costPerLeadNum =
    costPerLead !== undefined && costPerLead !== null && costPerLead !== ''
      ? Number(costPerLead)
      : 0;

  if (Number.isNaN(investmentNum) || Number.isNaN(costPerLeadNum)) {
    res.status(400).json({ error: 'investment / costPerLead 必须为有效数字' });
    return;
  }

  const typeStr = typeof type === 'string' ? type : '线上';

  const stmt = db.prepare(
    `INSERT INTO channels (name, type, investment, costPerLead, status, tenantId) VALUES (?, ?, ?, ?, '启用中', ?)`
  );
  const result = stmt.run(name, typeStr, investmentNum, costPerLeadNum, req.auth.tenantId);
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
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  const idNum = Number(req.params.id);
  const tenantId = req.auth.tenantId;
  const found = db.prepare('SELECT id FROM channels WHERE id = ? AND tenantId = ?').get(idNum, tenantId);
  if (!found) {
    res.status(404).json({ error: '渠道不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as ChannelStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE channels SET status = ? WHERE id = ? AND tenantId = ?').run(status, idNum, tenantId);
  const updated = db.prepare(
    'SELECT id, name, type, investment, costPerLead, status FROM channels WHERE id = ? AND tenantId = ?'
  ).get(idNum, tenantId) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    name: updated.name ?? '',
    type: updated.type ?? '线上',
    investment: Number(updated.investment ?? 0),
    costPerLead: Number(updated.costPerLead ?? 0),
    status: updated.status as ChannelStatus,
  });
});

acquisitionRouter.get('/stats', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  const rows = db.prepare(
    'SELECT status, investment, costPerLead FROM channels WHERE tenantId = ?'
  ).all(req.auth.tenantId) as unknown as { status: string; investment: number; costPerLead: number }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let totalInvestment = 0;
  let totalCostPerLead = 0;
  for (const row of rows) {
    const st = (row.status as ChannelStatus) ?? '启用中';
    byStatus[st] = (byStatus[st] || 0) + 1;
    totalInvestment += Number(row.investment ?? 0);
    totalCostPerLead += Number(row.costPerLead ?? 0);
  }
  const avgCostPerLead = total === 0 ? 0 : Math.round((totalCostPerLead / total) * 100) / 100;
  res.json({ total, byStatus, totalInvestment, avgCostPerLead });
});
