import { Router } from 'express';

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

const leads: Lead[] = [
  { id: 1, name: '张伟', source: '抖音', course: 'Python 实战营', amount: 6999, status: '已成交' },
  { id: 2, name: '李娜', source: '小红书', course: 'AI 绘画入门', amount: 1299, status: '跟进中' },
  { id: 3, name: '王强', source: '朋友推荐', course: '数据分析进阶', amount: 4999, status: '新线索' },
  { id: 4, name: '赵敏', source: '官网表单', course: '全栈开发', amount: 12999, status: '已流失' },
  { id: 5, name: '陈静', source: '抖音', course: 'Python 实战营', amount: 6999, status: '已成交' },
  { id: 6, name: '刘洋', source: '线下活动', course: 'AI 绘画入门', amount: 1299, status: '新线索' },
];

let nextId = 7;

export const conversionRouter = Router();

conversionRouter.get('/leads', (_req, res) => {
  res.json(leads);
});

conversionRouter.post('/leads', (req, res) => {
  const { name, source, course, amount } = req.body || {};
  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name 必填' });
    return;
  }
  const lead: Lead = {
    id: nextId++,
    name: name,
    source: typeof source === 'string' ? source : '',
    course: typeof course === 'string' ? course : '',
    amount: typeof amount === 'number' ? amount : Number(amount) || 0,
    status: '新线索',
  };
  leads.push(lead);
  res.status(201).json(lead);
});

conversionRouter.patch('/leads/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const lead = leads.find((l) => l.id === idNum);
  if (!lead) {
    res.status(404).json({ error: '线索不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as LeadStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  lead.status = status as LeadStatus;
  res.json(lead);
});

conversionRouter.get('/stats', (_req, res) => {
  const total = leads.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let totalAmount = 0;
  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    if (lead.status === '已成交') totalAmount += lead.amount;
  }
  const closedCount = byStatus['已成交'] || 0;
  const conversionRate = total === 0 ? 0 : Math.round((closedCount / total) * 10000) / 100;
  res.json({ total, byStatus, totalAmount, conversionRate });
});
