import { Router } from 'express';

type RecordStatus = '学习中' | '已完成' | '已暂停';

interface LearningRecord {
  id: number;
  student: string;
  course: string;
  progress: number;
  status: RecordStatus;
}

const VALID_STATUSES: RecordStatus[] = ['学习中', '已完成', '已暂停'];

const records: LearningRecord[] = [
  { id: 1, student: '张伟', course: 'Python 实战营', progress: 100, status: '已完成' },
  { id: 2, student: '李娜', course: 'AI 绘画入门', progress: 65, status: '学习中' },
  { id: 3, student: '王强', course: '数据分析进阶', progress: 30, status: '学习中' },
  { id: 4, student: '赵敏', course: '全栈开发', progress: 100, status: '已完成' },
  { id: 5, student: '陈静', course: 'Python 实战营', progress: 45, status: '已暂停' },
  { id: 6, student: '刘洋', course: 'AI 绘画入门', progress: 20, status: '学习中' },
];

let nextId = 7;

export const learningRouter = Router();

learningRouter.get('/records', (_req, res) => {
  res.json(records);
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
  const record: LearningRecord = {
    id: nextId++,
    student,
    course: typeof course === 'string' ? course : '',
    progress: progressNum,
    status: '学习中',
  };
  records.push(record);
  res.status(201).json(record);
});

learningRouter.patch('/records/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const record = records.find((r) => r.id === idNum);
  if (!record) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as RecordStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  record.status = status as RecordStatus;
  res.json(record);
});

learningRouter.get('/stats', (_req, res) => {
  const total = records.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  let progressSum = 0;
  for (const r of records) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    progressSum += r.progress;
  }
  const avgProgress = total === 0 ? 0 : Math.round((progressSum / total) * 100) / 100;
  res.json({ total, byStatus, avgProgress });
});
