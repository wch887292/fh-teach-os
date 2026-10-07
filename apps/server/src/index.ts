import express from 'express';
import { conversionRouter } from './modules/conversion';
import { qaRouter } from './modules/qa';
import { learningRouter } from './modules/learning';
import { dataRouter } from './modules/data';
import { acquisitionRouter } from './modules/acquisition';
import { courseRouter } from './modules/course';
import { authRouter, userAdminRouter } from './modules/auth';
import { dataopsRouter } from './modules/dataops';
import { auditMiddleware, auditRouter } from './middleware/audit';
import { riskMiddleware } from './middleware/risk';
import { authMiddleware, requireRole, teacherRoleGuard } from './middleware/auth';

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
// 登录鉴权路由（/login 与 /me 由 authRouter 内部自行校验，不走全量保护）
app.use('/api/auth', authRouter);
// 用户管理路由（阶段6-2）：须先通过 JWT 认证，再限制仅 admin 可操作
app.use('/api/auth', authMiddleware, requireRole(['admin']), userAdminRouter);
app.use('/api/dataops', authMiddleware, requireRole(['admin']), dataopsRouter);
// 审计日志查询路由：须先通过 JWT 认证，再限制仅 admin 可查
app.use('/api/audit', authMiddleware, requireRole(['admin']), auditRouter);
// JWT 全量保护：登录鉴权与审计之后、六板块之前挂载
app.use(authMiddleware);
// 六板块路由（teacher 角色细粒度权限：阶段5-2）
// conversion / acquisition / data：teacher 任何方法一律 403
app.use('/api/conversion', teacherRoleGuard(false, false), conversionRouter);
// qa（答疑）：teacher 仅 GET 读放行，写方法 403
app.use('/api/qa', teacherRoleGuard(true, false), qaRouter);
// learning（培学）：teacher GET 读放行 + PATCH 进度更新放行
app.use('/api/learning', teacherRoleGuard(true, true), learningRouter);
// data（数据看板）：teacher 任何方法一律 403
app.use('/api/data', teacherRoleGuard(false, false), dataRouter);
// acquisition（获课）：teacher 任何方法一律 403
app.use('/api/acquisition', teacherRoleGuard(false, false), acquisitionRouter);
// course（出课）：teacher 仅 GET 读放行，写方法 403
app.use('/api/course', teacherRoleGuard(true, false), courseRouter);

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
