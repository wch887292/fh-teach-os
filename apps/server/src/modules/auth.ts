import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

export const authRouter = Router();

const JWT_SECRET = () => process.env.JWT_SECRET ?? '';
const TOKEN_EXPIRES_IN = '8h';

interface UserRow {
  id: number;
  tenantId: number;
  username: string;
  role: string;
  status: string;
  passwordHash: string;
}

function fetchUserById(id: number): UserRow | undefined {
  const row = db
    .prepare('SELECT id, tenantId, username, role, status, passwordHash FROM users WHERE id = ?')
    .get(id) as unknown as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: row.id as number,
    tenantId: row.tenantId as number,
    username: row.username as string,
    role: (row.role as string) ?? 'sales',
    status: (row.status as string) ?? '启用中',
    passwordHash: row.passwordHash as string,
  };
}

function fetchUserByUsername(username: string): UserRow | undefined {
  const row = db
    .prepare('SELECT id, tenantId, username, role, status, passwordHash FROM users WHERE username = ?')
    .get(username) as unknown as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: row.id as number,
    tenantId: row.tenantId as number,
    username: row.username as string,
    role: (row.role as string) ?? 'sales',
    status: (row.status as string) ?? '启用中',
    passwordHash: row.passwordHash as string,
  };
}

// POST /login — 用户名密码登录，签发 JWT
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'username 与 password 必填' });
    return;
  }

  const user = fetchUserByUsername(username);

  // 密码错误或用户不存在统一 401，不泄露具体原因
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  if (user.status !== '启用中') {
    res.status(403).json({ error: '账号已停用' });
    return;
  }

  const secret = JWT_SECRET();
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    secret,
    { algorithm: 'HS256', expiresIn: TOKEN_EXPIRES_IN }
  );

  res.json({
    token,
    expiresIn: TOKEN_EXPIRES_IN,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
  });
});

// GET /me — 从 Authorization Bearer 解析 token，返回当前用户
authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization ?? '';
  const match = authHeader.match(/^Bearer\s+(\S+)$/);
  if (!match) {
    res.status(401).json({ error: '缺少或格式错误的 Authorization header' });
    return;
  }

  const rawToken = match[1];
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(rawToken, JWT_SECRET(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
    return;
  }

  const userId = payload.userId as number;
  if (!userId) {
    res.status(401).json({ error: 'token 载荷缺少 userId' });
    return;
  }

  const user = fetchUserById(userId);
  if (!user || user.status !== '启用中') {
    res.status(401).json({ error: '用户不存在或已停用' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      role: user.role,
    },
  });
});
