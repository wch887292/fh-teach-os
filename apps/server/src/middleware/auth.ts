import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 扩展 Express Request 类型，挂载认证信息。
 * authMiddleware 成功后会将 auth 属性写入 req，
 * 后续 requireRole 等中间件可安全读取。
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        tenantId: number;
        role: string;
      };
    }
  }
}

const EXEMPT_PATHS = ['/api/health'];

/**
 * authMiddleware — 全量 JWT 校验中间件。
 * 挂载在所有业务路由之前，校验 Authorization Bearer token。
 * - 缺少 /api/ 前缀或非豁免路径：直接 401
 * - 豁免路径（/api/health）：跳过校验，直接 next
 * - token 缺失 / 格式错误 / 校验失败：统一 401 JSON
 * - 成功：解析 payload，将 userId / tenantId / role 挂载到 req.auth
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 关键：用 req.originalUrl 快照，避免子路由前缀剥除导致路径误判
  // req.path 在 app.use('/api/xxx', router) 进入子路由后会被剥掉挂载前缀
  const reqPath = (req.originalUrl || req.url || '').split('?')[0];

  // 豁免探活路径，不要求 token
  if (EXEMPT_PATHS.includes(reqPath)) {
    next();
    return;
  }

  // 只保护 /api/ 开头的请求，非 API 请求直接放行
  if (!reqPath.startsWith('/api/')) {
    next();
    return;
  }

  const authHeader = req.headers.authorization ?? '';
  const match = authHeader.match(/^Bearer\s+(\S+)$/);

  if (!match) {
    res.status(401).json({ error: '缺少或格式错误的 Authorization header' });
    return;
  }

  const rawToken = match[1];
  const secret = process.env.JWT_SECRET ?? '';

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(rawToken, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
    return;
  }

  const userId = payload.userId as number;
  const tenantId = payload.tenantId as number;
  const role = (payload.role as string) ?? 'sales';

  if (!userId) {
    res.status(401).json({ error: 'token 载荷缺少 userId' });
    return;
  }

  req.auth = { userId, tenantId, role };
  next();
}

/**
 * requireRole — RBAC 角色守卫工厂。
 * 接收允许的角色名数组，返回一个中间件：
 * - 未通过 authMiddleware（req.auth 缺失）→ 401
 * - req.auth.role 不在允许名单内 → 403
 * - 角色匹配 → 放行 next
 */
export function requireRole(roles: string[]) {
  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    if (!req.auth) {
      res.status(401).json({ error: '未认证，请先登录' });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: `权限不足，需要角色：${roles.join(' / ')}` });
      return;
    }

    next();
  };
}

/**
 * teacherRoleGuard — 教师角色细粒度权限守卫（阶段5-2）。
 * 只对 role === 'teacher' 的用户生效；admin / sales 直接放行，行为完全不变。
 *
 * 权限矩阵（teacher 角色）：
 * - course（出课）：GET 放行，POST / PATCH / DELETE 等写方法 403
 * - qa（答疑）：GET 放行，写方法 403
 * - learning（培学）：GET 放行 + PATCH 额外放行（进度更新），其余写方法 403
 * - conversion（转化）/ acquisition（获课）/ data（数据看板）：任何方法一律 403
 *
 * 403 响应体统一为 JSON，带 error 字段说明无权限。
 */
export function teacherRoleGuard(allowedRead: boolean, allowTeacherPatch: boolean) {
  return function teacherGuard(req: Request, res: Response, next: NextFunction): void {
    const role = req.auth?.role;
    // 非 teacher 角色（admin / sales）不受本中间件约束，保持原有全放行行为
    if (role !== 'teacher') {
      next();
      return;
    }

    const method = (req.method || 'GET').toUpperCase();
    const isGet = method === 'GET' || method === 'HEAD';
    const isPatch = method === 'PATCH';

    if (isGet) {
      // 读权限：仅 course / qa / learning 板块允许 teacher 读取
      if (allowedRead) {
        next();
        return;
      }
      res.status(403).json({ error: '教师角色无权限访问该板块' });
      return;
    }

    if (isPatch && allowTeacherPatch) {
      // 培学板块额外放行 teacher 的 PATCH（进度更新）
      next();
      return;
    }

    // 写方法（POST / PUT / DELETE / 未放行的 PATCH）一律 403
    res.status(403).json({ error: '教师角色无权限执行该操作' });
  };
}
