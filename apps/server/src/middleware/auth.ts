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
