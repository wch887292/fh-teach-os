import { Router } from 'express';
import { db } from '../db';

type RecordStatus = '学习中' | '已完成' | '已暂停';

interface LearningRecord {
  id: number;
  student: string;
  course: string;
  progress: number;
  status: RecordStatus;
}

const VALID_STATUSES: RecordStatus[] = ['学习中', '已完成', '已暂停'];

export const learningRouter = Router();

function fetchAllRecords(): LearningRecord[] {
  const rows = db.prepare('SELECT id, student, course, progress, status FROM records').all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    student: (r.student as string) ?? '',
    course: (r.course as string) ?? '',
    progress: Number(r.progress ?? 0),
    status: (r.status as RecordStatus) ?? '学习中',
  }));
}

learningRouter.get('/records', (_req, res) => {
  res.json(fetchAllRecords());
});

learningRouter.post('/records', (req, res) => {
  const { student, course, progress } = req.body || {};
  if (typeof student !== 'string' || student.trim() === '') {
    res.status(400).json({ error: 'student 必填' });
    return;
  }
  let progressNum = 0;
  if (progress !== undefined && progress !== null && progress !== '') {
    progressNum = Number(progress);
    if (Number.isNaN(progressNum)) {
      res.status(400).json({ error: 'progress 必须是数字' });
      return;
    }
  }
  const courseStr = typeof course === 'string' ? course : '';

  const stmt = db.prepare(
    `INSERT INTO records (student, course, progress, status) VALUES (?, ?, ?, '学习中')`
  );
  const result = stmt.run(student, courseStr, progressNum);
  const id = Number(result.lastInsertRowid);
  const record: LearningRecord = {
    id,
    student,
    course: courseStr,
    progress: progressNum,
    status: '学习中',
  };
  res.status(201).json(record);
});

learningRouter.patch('/records/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const found = db.prepare('SELECT id FROM records WHERE id = ?').get(idNum);
  if (!found) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as RecordStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE records SET status = ? WHERE id = ?').run(status, idNum);
  const updated = db.prepare('SELECT id, student, course, progress, status FROM records WHERE id = ?').get(idNum) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    student: updated.student ?? '',
    course: updated.course ?? '',
    progress: Number(updated.progress ?? 0),
    status: updated.status as RecordStatus,
  });
});

learningRouter.get('/stats', (_req, res) => {
  const rows = db.prepare('SELECT status, progress FROM records').all() as unknown as { status: string; progress: number }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let progressSum = 0;
  for (const row of rows) {
    const st = (row.status as RecordStatus) ?? '学习中';
    byStatus[st] = (byStatus[st] || 0) + 1;
    progressSum += Number(row.progress ?? 0);
  }
  const avgProgress = total === 0 ? 0 : Math.round((progressSum / total) * 100) / 100;
  res.json({ total, byStatus, avgProgress });
});
