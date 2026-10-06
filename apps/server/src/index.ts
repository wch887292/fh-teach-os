import express from 'express';
import { conversionRouter } from './modules/conversion';
import { qaRouter } from './modules/qa';
import { learningRouter } from './modules/learning';
import { dataRouter } from './modules/data';
import { acquisitionRouter } from './modules/acquisition';
import { courseRouter } from './modules/course';
import { auditMiddleware, auditRouter } from './middleware/audit';
import { riskMiddleware } from './middleware/risk';

const app = express();
const port = 8801;

app.use(express.json());
// 公共底座：先限流，再审计（顺序固定 risk → audit）
app.use(riskMiddleware);
app.use(auditMiddleware);
// 审计日志查询路由
app.use('/api/audit', auditRouter);
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
