import { Router } from 'express';

type QuestionStatus = '待回复' | '处理中' | '已解决';

interface Question {
  id: number;
  student: string;
  course: string;
  question: string;
  status: QuestionStatus;
}

const VALID_STATUSES: QuestionStatus[] = ['待回复', '处理中', '已解决'];

const questions: Question[] = [
  { id: 1, student: '张伟', course: 'Python 实战营', question: '函数参数默认值写法不清楚', status: '已解决' },
  { id: 2, student: '李娜', course: 'AI 绘画入门', question: '生成的图像模糊怎么调参', status: '处理中' },
  { id: 3, student: '王强', course: '数据分析进阶', question: 'pandas groupby 结果排序问题', status: '待回复' },
  { id: 4, student: '赵敏', course: '全栈开发', question: '前后端跨域 CORS 报错处理', status: '已解决' },
  { id: 5, student: '陈静', course: 'Python 实战营', question: '异步函数 await 使用疑问', status: '待回复' },
  { id: 6, student: '刘洋', course: 'AI 绘画入门', question: '提示词如何让画面更逼真', status: '处理中' },
];

let nextId = 7;

export const qaRouter = Router();

qaRouter.get('/questions', (_req, res) => {
  res.json(questions);
});

qaRouter.post('/questions', (req, res) => {
  const { student, course, question } = req.body || {};
  if (typeof student !== 'string' || student.trim() === '') {
    res.status(400).json({ error: 'student 必填' });
    return;
  }
  const item: Question = {
    id: nextId++,
    student,
    course: typeof course === 'string' ? course : '',
    question: typeof question === 'string' ? question : '',
    status: '待回复',
  };
  questions.push(item);
  res.status(201).json(item);
});

qaRouter.patch('/questions/:id/status', (req, res) => {
  const idNum = Number(req.params.id);
  const item = questions.find((q) => q.id === idNum);
  if (!item) {
    res.status(404).json({ error: '问题不存在' });
    return;
  }
  const { status } = req.body || {};
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as QuestionStatus)) {
    res.status(400).json({ error: `status 必须是 ${VALID_STATUSES.join(' / ')}` });
    return;
  }
  item.status = status as QuestionStatus;
  res.json(item);
});

qaRouter.get('/stats', (_req, res) => {
  const total = questions.length;
  const byStatus: Record<string, number> = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  for (const q of questions) {
    byStatus[q.status] = (byStatus[q.status] || 0) + 1;
  }
  const resolvedCount = byStatus['已解决'] || 0;
  const resolveRate = total === 0 ? 0 : Math.round((resolvedCount / total) * 10000) / 100;
  res.json({ total, byStatus, resolveRate });
});
