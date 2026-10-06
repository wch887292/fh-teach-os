import { Router, type Request, type Response, type NextFunction } from 'express';
import { db } from '../db';

/**
 * 审计中间件：在响应结束时，将 /api/ 开头的请求写入 audit_logs 表。
 */
export function auditMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const startTime = Date.now();
  // 关键：在进入子路由前快照完整路径。
  // req.path 是动态 getter，请求进入 app.use('/api/xxx', router) 子路由时
  // req.url 会被剥掉挂载前缀且 handler 不调 next 时不恢复，
  // 导致 finish 触发时 req.path 变成 '/stats' 之类而被过滤漏记。
  // req.originalUrl 由 Express 入口设置后不会被改写，是可靠来源。
  const reqPath = (req.originalUrl || req.url || '').split('?')[0];

  _res.on('finish', () => {
    if (!reqPath.startsWith('/api/')) return;

    const durationMs = Date.now() - startTime;
    const stmt = db.prepare(
      'INSERT INTO audit_logs (ts, method, path, status, durationMs) VALUES (datetime(\'now\'), ?, ?, ?, ?)'
    );
    stmt.run(req.method, reqPath, _res.statusCode, durationMs);
  });

  next();
}

/**
 * 审计路由：提供 GET /logs 接口，返回 audit_logs 最近记录。
 */
export const auditRouter = Router();

auditRouter.get('/logs', (req: Request, res: Response) => {
  let limit = 50;
  const raw = req.query.limit;
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(Math.floor(parsed), 500);
    }
  }

  const rows = db.prepare(
    'SELECT id, ts, method, path, status, durationMs FROM audit_logs ORDER BY id DESC LIMIT ?'
  ).all(limit) as unknown as Record<string, unknown>[];

  const logs = rows.map((r) => ({
    id: r.id as number,
    ts: (r.ts as string) ?? '',
    method: (r.method as string) ?? '',
    path: (r.path as string) ?? '',
    status: Number(r.status ?? 0),
    durationMs: Number(r.durationMs ?? 0),
  }));

  res.json(logs);
});
