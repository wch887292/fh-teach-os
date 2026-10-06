import { Router } from 'express';
import { db } from '../db';

type CourseStatus = '招生中' | '已满' | '已结课';

interface Course {
  id: number;
  name: string;
  teacher: string;
  price: number;
  totalStudents: number;
  capacity: number;
  status: CourseStatus;
}

const VALID_STATUSES: CourseStatus[] = ['招生中', '已满', '已结课'];

export const courseRouter = Router();

function fetchAllCourses(): Course[] {
  const rows = db.prepare(
    'SELECT id, name, teacher, price, totalStudents, capacity, status FROM courses ORDER BY id ASC'
  ).all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    name: (r.name as string) ?? '',
    teacher: (r.teacher as string) ?? '',
    price: Number(r.price ?? 0),
    totalStudents: Number(r.totalStudents ?? 0),
    capacity: Number(r.capacity ?? 0),
    status: (r.status as CourseStatus) ?? '招生中',
  }));
}

courseRouter.get('/courses', (_req, res) => {
  res.json(fetchAllCourses());
});

courseRouter.post('/courses', (req, res) => {
  const { name, teacher, price, totalStudents, capacity } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name 必填' });
    return;
  }

  const priceNum = price !== undefined && price !== null && price !== ''
    ? Number(price)
    : 0;
  const totalStudentsNum = totalStudents !== undefined && totalStudents !== null && totalStudents !== ''
    ? Number(totalStudents)
    : 0;
  const capacityNum = capacity !== undefined && capacity !== null && capacity !== ''
    ? Number(capacity)
    : 0;

  if (Number.isNaN(priceNum) || Number.isNaN(totalStudentsNum) || Number.isNaN(capacityNum)) {
    res.status(400).json({ error: 'price / totalStudents / capacity 必须为有效数字' });
    return;
  }

  const teacherStr = typeof teacher === 'string' ? teacher : '';

  const stmt = db.prepare(
    `INSERT INTO courses (name, teacher, price, totalStudents, capacity, status) VALUES (?, ?, ?, ?, ?, '招生中')`
  );
  const result = stmt.run(name, teacherStr, priceNum, totalStudentsNum, capacityNum);
  const id = Number(result.lastInsertRowid);
  const course: Course = {
    id,
    name,
    teacher: teacherStr,
    price: priceNum,
    totalStudents: totalStudentsNum,
    capacity: capacityNum,
    status: '招生中',
  };
  res.status(201).json(course);
});

courseRouter.patch('/courses/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const found = db.prepare('SELECT id FROM courses WHERE id = ?').get(idNum);
  if (!found) {
    res.status(404).json({ error: '课程不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as CourseStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE courses SET status = ? WHERE id = ?').run(status, idNum);
  const updated = db.prepare(
    'SELECT id, name, teacher, price, totalStudents, capacity, status FROM courses WHERE id = ?'
  ).get(idNum) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    name: updated.name ?? '',
    teacher: updated.teacher ?? '',
    price: Number(updated.price ?? 0),
    totalStudents: Number(updated.totalStudents ?? 0),
    capacity: Number(updated.capacity ?? 0),
    status: updated.status as CourseStatus,
  });
});

courseRouter.get('/stats', (_req, res) => {
  const rows = db.prepare(
    'SELECT status, price, totalStudents FROM courses'
  ).all() as unknown as { status: string; price: number; totalStudents: number }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let totalStudentsSum = 0;
  let priceSum = 0;
  for (const row of rows) {
    const st = (row.status as CourseStatus) ?? '招生中';
    byStatus[st] = (byStatus[st] || 0) + 1;
    totalStudentsSum += Number(row.totalStudents ?? 0);
    priceSum += Number(row.price ?? 0);
  }
  const avgPrice = total === 0 ? 0 : Math.round((priceSum / total) * 100) / 100;
  res.json({ total, byStatus, totalStudents: totalStudentsSum, avgPrice });
});
