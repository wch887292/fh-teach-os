import { Router } from 'express';

interface DailyMetric {
  id: number;
  date: string;
  newLeads: number;
  revenue: number;
  activeStudents: number;
}

const series: DailyMetric[] = [
  { id: 1, date: '2026-10-01', newLeads: 12, revenue: 35000, activeStudents: 86 },
  { id: 2, date: '2026-10-02', newLeads: 8, revenue: 22000, activeStudents: 74 },
  { id: 3, date: '2026-10-03', newLeads: 15, revenue: 41000, activeStudents: 92 },
  { id: 4, date: '2026-10-04', newLeads: 6, revenue: 18500, activeStudents: 65 },
  { id: 5, date: '2026-10-05', newLeads: 20, revenue: 53000, activeStudents: 108 },
  { id: 6, date: '2026-10-06', newLeads: 9, revenue: 27500, activeStudents: 79 },
  { id: 7, date: '2026-10-07', newLeads: 14, revenue: 38000, activeStudents: 95 },
];

let nextId = 8;

export const dataRouter = Router();

dataRouter.get('/series', (_req, res) => {
  const sorted = [...series].sort((a, b) => a.id - b.id);
  res.json(sorted);
});

dataRouter.post('/series', (req, res) => {
  const { date, newLeads, revenue, activeStudents } = req.body || {};

  if (typeof date !== 'string' || date.trim() === '') {
    res.status(400).json({ error: 'date 必填' });
    return;
  }

  const newLeadsNum = Number(newLeads);
  const revenueNum = Number(revenue);
  const activeStudentsNum = Number(activeStudents);

  if (Number.isNaN(newLeadsNum) || Number.isNaN(revenueNum) || Number.isNaN(activeStudentsNum)) {
    res.status(400).json({ error: 'newLeads / revenue / activeStudents 必须为有效数字' });
    return;
  }

  const record: DailyMetric = {
    id: nextId++,
    date,
    newLeads: newLeadsNum,
    revenue: revenueNum,
    activeStudents: activeStudentsNum,
  };
  series.push(record);
  res.status(201).json(record);
});

dataRouter.get('/summary', (_req, res) => {
  const totalDays = series.length;
  let totalLeads = 0;
  let totalRevenue = 0;
  let totalActive = 0;
  for (const item of series) {
    totalLeads += item.newLeads;
    totalRevenue += item.revenue;
    totalActive += item.activeStudents;
  }
  const avgActiveStudents =
    totalDays === 0 ? 0 : Math.round((totalActive / totalDays) * 100) / 100;
  res.json({ totalDays, totalLeads, totalRevenue, avgActiveStudents });
});
