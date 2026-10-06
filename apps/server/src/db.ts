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

// 开发种子密码（bcryptjs cost 10 硬编码 hash）：
// admin / Admin@2026（role=admin）、sales01 / Sales@2026（role=sales）、teacher01 / Teacher@2026（role=teacher）
// ⚠️ 正式部署必须修改密码或重新生成 hash，勿将 seed hash 用于生产环境
// 按 username 逐条 ensure：不存在才插入，避免已有 seed 时重复写入
const seedUsers: Array<{ tenantId: number; username: string; passwordHash: string; role: string }> = [
  { tenantId: 1, username: 'admin',     passwordHash: '$2b$10$k.ikp/iuz98q5tG7UviHRuFdZ3a8Gn2bbpme2x6cYwB6R8vL2ZQOG', role: 'admin' },
  { tenantId: 1, username: 'sales01',   passwordHash: '$2b$10$q.43RMn/cn.Rg74FueOAPOSBmGD6NYUeZdhMR0JugLm04Gj3aZRQK', role: 'sales' },
  { tenantId: 1, username: 'teacher01', passwordHash: '$2b$10$NaiT.PifbDyDboRBhmAX6evLIayobwls4JT20scmnH2Bc.Ka2V5UG', role: 'teacher' },
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
