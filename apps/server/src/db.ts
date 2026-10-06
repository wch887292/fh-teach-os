import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 数据库文件放在工作区根目录下的 data/teachos.db
// 即 I:/Teach-OS/data/teachos.db
// db.ts 在 apps/server/src/db.ts，往上三跳（src → server → apps → 根）
const dbDir = resolvePath(__dirname, '../../../data');
const dbPath = `${dbDir}/teachos.db`;

function resolvePath(base: string, rel: string): string {
  const parts = rel.split('/');
  let p = base;
  for (const part of parts) {
    if (part === '..') {
      p = dirname(p);
    } else if (part !== '.') {
      p = `${p}/${part}`;
    }
  }
  return p;
}

mkdirSync(dbDir, { recursive: true });

export const db = new DatabaseSync(dbPath);

// ── 建表 ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    source TEXT,
    course TEXT,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT '新线索'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    student TEXT NOT NULL,
    course  TEXT,
    question TEXT,
    status  TEXT DEFAULT '待回复'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    student  TEXT NOT NULL,
    course   TEXT,
    progress REAL DEFAULT 0,
    status   TEXT DEFAULT '学习中'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    date           TEXT NOT NULL,
    newLeads       REAL DEFAULT 0,
    revenue        REAL DEFAULT 0,
    activeStudents REAL DEFAULT 0
  );
`);

// ── 预置示例数据（仅在表为空时插入）────────────────────────────────────

function seedIfEmpty(table: string, countCol: string, inserts: string[]): void {
  const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
  if (result.cnt === 0) {
    for (const sql of inserts) {
      db.exec(sql);
    }
  }
}

seedIfEmpty('leads', 'id', [
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (1, '张伟', '抖音', 'Python 实战营', 6999, '已成交')`,
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (2, '李娜', '小红书', 'AI 绘画入门', 1299, '跟进中')`,
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (3, '王强', '朋友推荐', '数据分析进阶', 4999, '新线索')`,
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (4, '赵敏', '官网表单', '全栈开发', 12999, '已流失')`,
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (5, '陈静', '抖音', 'Python 实战营', 6999, '已成交')`,
  `INSERT OR IGNORE INTO leads (id, name, source, course, amount, status) VALUES (6, '刘洋', '线下活动', 'AI 绘画入门', 1299, '新线索')`,
]);

seedIfEmpty('questions', 'id', [
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (1, '张伟', 'Python 实战营', '函数参数默认值写法不清楚', '已解决')`,
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (2, '李娜', 'AI 绘画入门', '生成的图像模糊怎么调参', '处理中')`,
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (3, '王强', '数据分析进阶', 'pandas groupby 结果排序问题', '待回复')`,
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (4, '赵敏', '全栈开发', '前后端跨域 CORS 报错处理', '已解决')`,
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (5, '陈静', 'Python 实战营', '异步函数 await 使用疑问', '待回复')`,
  `INSERT OR IGNORE INTO questions (id, student, course, question, status) VALUES (6, '刘洋', 'AI 绘画入门', '提示词如何让画面更逼真', '处理中')`,
]);

seedIfEmpty('records', 'id', [
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (1, '张伟', 'Python 实战营', 100, '已完成')`,
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (2, '李娜', 'AI 绘画入门', 65, '学习中')`,
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (3, '王强', '数据分析进阶', 30, '学习中')`,
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (4, '赵敏', '全栈开发', 100, '已完成')`,
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (5, '陈静', 'Python 实战营', 45, '已暂停')`,
  `INSERT OR IGNORE INTO records (id, student, course, progress, status) VALUES (6, '刘洋', 'AI 绘画入门', 20, '学习中')`,
]);

// ── 获课板块：招生渠道表 ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    type        TEXT DEFAULT '线上',
    investment  REAL DEFAULT 0,
    costPerLead REAL DEFAULT 0,
    status      TEXT DEFAULT '启用中'
  );
`);

// ── 出课板块：课程表 ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    teacher       TEXT,
    price         REAL DEFAULT 0,
    totalStudents REAL DEFAULT 0,
    capacity      REAL DEFAULT 0,
    status        TEXT DEFAULT '招生中'
  );
`);

seedIfEmpty('channels', 'id', [
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (1, '抖音信息流', '线上', 50000, 120, '启用中')`,
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (2, '小红书达人合作', '线上', 35000, 95, '启用中')`,
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (3, '线下地推活动', '线下', 20000, 80, '已停用')`,
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (4, '老学员转介绍', '推荐', 10000, 40, '启用中')`,
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (5, '百度竞价广告', '线上', 45000, 150, '已停用')`,
  `INSERT OR IGNORE INTO channels (id, name, type, investment, costPerLead, status) VALUES (6, '高校社团合作', '线下', 15000, 60, '启用中')`,
]);

seedIfEmpty('courses', 'id', [
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (1, 'Python 实战营', '张老师', 6999, 28, 40, '招生中')`,
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (2, 'AI 绘画入门', '李老师', 1299, 40, 40, '已满')`,
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (3, '数据分析进阶', '王老师', 4999, 18, 30, '招生中')`,
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (4, '全栈开发精英班', '赵老师', 12999, 45, 45, '已满')`,
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (5, '少儿编程启蒙', '陈老师', 2999, 50, 50, '已结课')`,
  `INSERT OR IGNORE INTO courses (id, name, teacher, price, totalStudents, capacity, status) VALUES (6, '前端工程化实战', '刘老师', 5999, 12, 35, '招生中')`,
]);

seedIfEmpty('series', 'id', [
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (1, '2026-10-01', 12, 35000, 86)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (2, '2026-10-02', 8, 22000, 74)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (3, '2026-10-03', 15, 41000, 92)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (4, '2026-10-04', 6, 18500, 65)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (5, '2026-10-05', 20, 53000, 108)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (6, '2026-10-06', 9, 27500, 79)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (7, '2026-10-07', 14, 38000, 95)`,
]);

// ── 公共底座：审计日志表 ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         TEXT DEFAULT (datetime('now')),
    method     TEXT,
    path       TEXT,
    status     INTEGER,
    durationMs REAL
  );
`);

// ── 登录鉴权：租户表 ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL UNIQUE,
    status    TEXT DEFAULT '启用中',
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

seedIfEmpty('tenants', 'id', [
  `INSERT OR IGNORE INTO tenants (id, name) VALUES (1, '飞虹智总部')`,
]);

// ── 登录鉴权：用户表 ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tenantId     INTEGER NOT NULL,
    username     TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role         TEXT DEFAULT 'sales',
    status       TEXT DEFAULT '启用中',
    createdAt    TEXT DEFAULT (datetime('now'))
  );
`);

// 开发种子账号（bcryptjs cost 10 加密，密码来源 data/dev-seed-passwords.txt，该文件已被 gitignore 不入库）
// ⚠️ 正式部署必须修改密码或重新生成 hash，勿将 seed hash 用于生产环境
// 按 username 逐条 ensure：已存在则跳过，不存在才插入（支持增量新增种子用户）
// 三条种子：admin(admin)、sales01(sales)、teacher01(teacher)，tenantId 均为 1
const seedUsers: Array<{ username: string; tenantId: number; passwordHash: string; role: string }> = [
  // admin / Admin@2026
  { username: 'admin', tenantId: 1, role: 'admin', passwordHash: '$2b$10$1YHcx72yShefV74m0RoKr.jQ5fpkP9NEK2bmQkOPwGNQQefGrMM8W' },
  // sales01 / Sales@2026
  { username: 'sales01', tenantId: 1, role: 'sales', passwordHash: '$2b$10$kkB6SnjBBZnMP8m1Oz9LRubOHjiRRdrhBJuFpwK0RLwS/XJMTc1wu' },
  // teacher01 / Teacher@2026
  { username: 'teacher01', tenantId: 1, role: 'teacher', passwordHash: '$2b$10$8UAE5vGG9GO6QomZTxHjL.N.kiqQGwtdPKFG8pc.4sjGOajzafExu' },
];

for (const seed of seedUsers) {
  const exists = db
    .prepare('SELECT 1 FROM users WHERE username = ?')
    .get(seed.username) as unknown as { 1: 1 } | undefined;
  if (!exists) {
    db.prepare('INSERT INTO users (tenantId, username, passwordHash, role) VALUES (?, ?, ?, ?)').run(
      seed.tenantId,
      seed.username,
      seed.passwordHash,
      seed.role,
    );
  }
}

// ── 多租户：六张业务表追加 tenantId 列（仅在不存在时 ALTER）────────────────
function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('leads', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('questions', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('records', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('series', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('channels', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('courses', 'tenantId', 'INTEGER NOT NULL DEFAULT 1');

// ── 多租户：tenants 逐条 ensure（已存在则跳过，支持增量新增）────────────────
const seedTenants: Array<{ name: string; status: string }> = [
  { name: '飞虹智总部', status: '启用中' },
  { name: '测试租户二', status: '启用中' },
];

for (const seed of seedTenants) {
  const exists = db
    .prepare('SELECT 1 FROM tenants WHERE name = ?')
    .get(seed.name) as unknown as { 1: 1 } | undefined;
  if (!exists) {
    db.prepare('INSERT INTO tenants (name, status) VALUES (?, ?)').run(seed.name, seed.status);
  }
}

// ── 多租户：追加 tenant02 种子用户（租户二，角色 admin）────────────────────
// 密码来源 data/dev-seed-passwords.txt 里 tenant02 行：tenant02=Admin@2026,role=admin,tenantId=2
// bcryptjs cost 10 加密，⚠️ 正式部署必须修改密码或重新生成 hash
const tenant02Hash = '$2b$10$R83y34ikFBLmvKwEMP4kjeY2mZdLY8SjOqjviOvDM6HCS3HyL.Crm';
const tenant02Exists = db
  .prepare('SELECT 1 FROM users WHERE username = ?')
  .get('tenant02') as unknown as { 1: 1 } | undefined;
if (!tenant02Exists) {
  db.prepare(
    'INSERT INTO users (tenantId, username, passwordHash, role) VALUES (?, ?, ?, ?)'
  ).run(2, 'tenant02', tenant02Hash, 'admin');
}
