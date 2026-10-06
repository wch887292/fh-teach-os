import { Router } from 'express';
import { db } from '../db';

interface DailyMetric {
  id: number;
  date: string;
  newLeads: number;
  revenue: number;
  activeStudents: number;
}

export const dataRouter = Router();

function fetchAllSeries(): DailyMetric[] {
  const rows = db.prepare('SELECT id, date, newLeads, revenue, activeStudents FROM series ORDER BY id ASC').all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    date: (r.date as string) ?? '',
    newLeads: Number(r.newLeads ?? 0),
    revenue: Number(r.revenue ?? 0),
    activeStudents: Number(r.activeStudents ?? 0),
  }));
}

dataRouter.get('/series', (_req, res) => {
  res.json(fetchAllSeries());
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

  const stmt = db.prepare(
    `INSERT INTO series (date, newLeads, revenue, activeStudents) VALUES (?, ?, ?, ?)`
  );
  const result = stmt.run(date, newLeadsNum, revenueNum, activeStudentsNum);
  const id = Number(result.lastInsertRowid);
  const record: DailyMetric = {
    id,
    date,
    newLeads: newLeadsNum,
    revenue: revenueNum,
    activeStudents: activeStudentsNum,
  };
  res.status(201).json(record);
});

dataRouter.get('/summary', (_req, res) => {
  const row = db.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(newLeads), 0) as totalLeads, COALESCE(SUM(revenue), 0) as totalRevenue, COALESCE(SUM(activeStudents), 0) as totalActive FROM series`
  ).get() as unknown as { cnt: number; totalLeads: number; totalRevenue: number; totalActive: number };
  const totalDays = row.cnt;
  const totalLeads = Number(row.totalLeads ?? 0);
  const totalRevenue = Number(row.totalRevenue ?? 0);
  const totalActive = Number(row.totalActive ?? 0);
  const avgActiveStudents =
    totalDays === 0 ? 0 : Math.round((totalActive / totalDays) * 100) / 100;
  res.json({ totalDays, totalLeads, totalRevenue, avgActiveStudents });
});
