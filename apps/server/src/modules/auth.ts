import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

export const authRouter = Router();
export const userAdminRouter = Router();

const JWT_SECRET = () => process.env.JWT_SECRET ?? '';
const TOKEN_EXPIRES_IN = '8h';

// 用户管理（阶段6-2）：所有写操作需 admin 角色，由 index.ts 包裹 requireRole(['admin'])
const VALID_ROLES = ['admin', 'sales', 'teacher'];
const VALID_USER_STATUS = ['启用', '停用'];

function publicUserView(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    username: row.username as string,
    role: (row.role as string) ?? 'sales',
    tenantId: row.tenantId as number,
    status: (row.status as string) ?? '启用中',
  };
}

// GET /users — 返回全部用户数组，只含 id, username, role, tenantId, status
userAdminRouter.get('/users', (req, res) => {
  const { status } = req.query || {};
  const validStatus = status && VALID_USER_STATUS.includes(status);
  
  const rows = db
    .prepare('SELECT id, username, role, tenantId, status FROM users')
    .all() as unknown as Record<string, unknown>[];
  
  if (validStatus) {
    res.json(rows.filter((row) => row.status === validStatus));
  } else {
    res.json(rows.map(publicUserView));
  }
});

// POST /users — 新增用户，校验 username 重复、role 白名单、密码长度
userAdminRouter.post('/users', (req, res) => {
  const { username, password, role, tenantId } = req.body || {};
  
  if (!username || !password || !role || !tenantId) {
    res.status(400).json({ error: '必须提供 username, password, role, tenantId' });
    return;
  }

  if (typeof username !== 'string' || typeof password !== 'string' || typeof role !== 'string' || typeof tenantId !== 'number') {
    res.status(400).json({ error: '参数类型错误' });
    return;
  }

  if (username.trim() === '') {
    res.status(400).json({ error: '用户名不能为空' });
    return;
  }

  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ error: `角色 ${role} 不在白名单内` });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: '密码长度不足 8 位' });
    return;
  }

  // 检查用户名是否已存在
  const existingUser = db
    .prepare('SELECT 1 FROM users WHERE username = ?')
    .get(username) as unknown as { 1: 1 } | undefined;
  
  if (existingUser) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }

  // 插入新用户，用 bcryptjs 哈希密码
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (tenantId, username, passwordHash, role, status) VALUES (?, ?, ?, ?, ?)').run(
    tenantId,
    username,
    hash,
    role,
    '启用中',
  );
  
  // 返回不含密码的新用户对象
  const newUser = db
    .prepare('SELECT id, username, role, tenantId, status FROM users WHERE username = ?')
    .get(username) as unknown as Record<string, unknown> | undefined;
  
  if (!newUser) {
    res.status(500).json({ error: '插入用户失败' });
    return;
  }

  res.status(201).json({
    user: publicUserView(newUser),
  });
});

// PATCH /users/:id/status — 修改用户状态（启用/停用）
userAdminRouter.patch('/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  
  if (!status) {
    res.status(400).json({ error: '必须提供 status 参数' });
    return;
  }

  if (!VALID_USER_STATUS.includes(status)) {
    res.status(400).json({ error: `状态 ${status} 不在白名单内` });
    return;
  }

  const user = db
    .prepare('SELECT id, username, role, tenantId, status FROM users WHERE id = ?')
    .get(id) as unknown as Record<string, unknown> | undefined;
  
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  // 禁止停用自己
  if (user.id === req.auth?.userId) {
    res.status(400).json({ error: '不能停用自己的账号' });
    return;
  }
  
  // 更新用户状态
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  
  // 返回更新后用户对象
  const updatedUser = db
    .prepare('SELECT id, username, role, tenantId, status FROM users WHERE id = ?')
    .get(id) as unknown as Record<string, unknown> | undefined;
  
  if (!updatedUser) {
    res.status(500).json({ error: '更新用户状态失败' });
    return;
  }

  res.json({
    user: publicUserView(updatedUser),
  });
});

// PATCH /users/:id/role — 修改用户角色
userAdminRouter.patch('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  
  if (!role) {
    res.status(400).json({ error: '必须提供 role 参数' });
    return;
  }

  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: `角色 ${role} 不在白名单内` });
    return;
  }
  
  const user = db
    .prepare('SELECT id, username, role, tenantId, status FROM users WHERE id = ?')
    .get(id) as unknown as Record<string, unknown> | undefined;
  
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  // 禁止修改自己的角色
  if (user.id === req.auth?.userId) {
    res.status(400).json({ error: '不能修改自己的角色' });
    return;
  }
  
  // 更新用户角色
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  
  // 返回更新后用户对象
  const updatedUser = db
    .prepare('SELECT id, username, role, tenantId, status FROM users WHERE id = ?')
    .get(id) as unknown as Record<string, unknown> | undefined;
  
  if (!updatedUser) {
    res.status(500).json({ error: '更新用户角色失败' });
    return;
  }

  res.json({
    user: publicUserView(updatedUser),
  });
});

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
