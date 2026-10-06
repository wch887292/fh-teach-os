import { Router } from 'express';
import { db } from '../db';

type QuestionStatus = '待回复' | '处理中' | '已解决';

interface Question {
  id: number;
  student: string;
  course: string;
  question: string;
  status: QuestionStatus;
}

const VALID_STATUSES: QuestionStatus[] = ['待回复', '处理中', '已解决'];

export const qaRouter = Router();

function fetchAllQuestions(): Question[] {
  const rows = db.prepare('SELECT id, student, course, question, status FROM questions').all() as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    student: (r.student as string) ?? '',
    course: (r.course as string) ?? '',
    question: (r.question as string) ?? '',
    status: (r.status as QuestionStatus) ?? '待回复',
  }));
}

qaRouter.get('/questions', (_req, res) => {
  res.json(fetchAllQuestions());
});

qaRouter.post('/questions', (req, res) => {
  const { student, course, question } = req.body || {};
  if (typeof student !== 'string' || student.trim() === '') {
    res.status(400).json({ error: 'student 必填' });
    return;
  }
  const courseStr = typeof course === 'string' ? course : '';
  const questionStr = typeof question === 'string' ? question : '';

  const stmt = db.prepare(
    `INSERT INTO questions (student, course, question, status) VALUES (?, ?, ?, '待回复')`
  );
  const result = stmt.run(student, courseStr, questionStr);
  const id = Number(result.lastInsertRowid);
  const item: Question = {
    id,
    student,
    course: courseStr,
    question: questionStr,
    status: '待回复',
  };
  res.status(201).json(item);
});

qaRouter.patch('/questions/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const found = db.prepare('SELECT id FROM questions WHERE id = ?').get(idNum);
  if (!found) {
    res.status(404).json({ error: '问题不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as QuestionStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  db.prepare('UPDATE questions SET status = ? WHERE id = ?').run(status, idNum);
  const updated = db.prepare('SELECT id, student, course, question, status FROM questions WHERE id = ?').get(idNum) as unknown as Record<string, unknown>;
  res.json({
    id: updated.id,
    student: updated.student ?? '',
    course: updated.course ?? '',
    question: updated.question ?? '',
    status: updated.status as QuestionStatus,
  });
});

qaRouter.get('/stats', (_req, res) => {
  const rows = db.prepare('SELECT status FROM questions').all() as unknown as { status: string }[];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  for (const row of rows) {
    const st = (row.status as QuestionStatus) ?? '待回复';
    byStatus[st] = (byStatus[st] || 0) + 1;
  }
  const resolvedCount = byStatus['已解决'] || 0;
  const resolveRate = total === 0 ? 0 : Math.round((resolvedCount / total) * 10000) / 100;
  res.json({ total, byStatus, resolveRate });
});
