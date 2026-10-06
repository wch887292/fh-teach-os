import express from 'express';
import { conversionRouter } from './modules/conversion';
import { qaRouter } from './modules/qa';
import { learningRouter } from './modules/learning';
import { dataRouter } from './modules/data';
import { acquisitionRouter } from './modules/acquisition';
import { courseRouter } from './modules/course';
import { authRouter } from './modules/auth';
import { auditMiddleware, auditRouter } from './middleware/audit';
import { riskMiddleware } from './middleware/risk';

// ── 启动校验：JWT_SECRET 必须设置，secret 不入库不入 git ────────────────
if (!process.env.JWT_SECRET) {
  console.error('错误：未设置环境变量 JWT_SECRET。请在启动前执行：set JWT_SECRET=<随机字符串>（Windows）或 export JWT_SECRET=<随机字符串>（Linux/Mac）');
  process.exit(1);
}

const app = express();
const port = 8801;

app.use(express.json());
// 公共底座：先限流，再审计（顺序固定 risk → audit）
app.use(riskMiddleware);
app.use(auditMiddleware);
// 审计日志查询路由
app.use('/api/audit', auditRouter);
// 登录鉴权路由
app.use('/api/auth', authRouter);
// 现有六板块路由
app.use('/api/conversion', conversionRouter);
app.use('/api/qa', qaRouter);
app.use('/api/learning', learningRouter);
app.use('/api/data', dataRouter);
app.use('/api/acquisition', acquisitionRouter);
app.use('/api/course', courseRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'teach-os' });
});

app.get('/api/modules', (req, res) => {
  res.json([
    { name: 'acquisition', status: 'online' },
    { name: 'course', status: 'online' },
    { name: 'conversion', status: 'online' },
    { name: 'qa', status: 'online' },
    { name: 'learning', status: 'online' },
    { name: 'data', status: 'online' }
  ]);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
