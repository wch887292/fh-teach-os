import type { Request, Response, NextFunction } from 'express';

/**
 * 限流中间件：按客户端 IP 计数，60 秒窗口内最多 120 次请求。
 * 使用模块内 Map，窗口过期自动重置，过期条目清理避免内存膨胀。
 */
const WINDOW_MS = 60_000; // 60 秒
const MAX_REQUESTS = 120;  // 每窗口最大请求数

interface IpEntry {
  count: number;
  windowStart: number;
}

const ipMap = new Map<string, IpEntry>();

function getClientIp(req: Request): string {
  return req.ip ?? (req.socket?.remoteAddress ?? 'unknown');
}

export function riskMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();

  let entry = ipMap.get(ip);

  // 窗口过期则重置计数
  if (entry && now - entry.windowStart >= WINDOW_MS) {
    ipMap.delete(ip);
    entry = undefined;
  }

  if (!entry) {
    entry = { count: 0, windowStart: now };
    ipMap.set(ip, entry);
  }

  entry.count += 1;

  // 清理过期条目（每次请求时顺带清理，防止内存无限增长）
  for (const [key, val] of ipMap.entries()) {
    if (now - val.windowStart >= WINDOW_MS && key !== ip) {
      ipMap.delete(key);
    }
  }

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    return;
  }

  next();
}
