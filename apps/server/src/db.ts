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

seedIfEmpty('series', 'id', [
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (1, '2026-10-01', 12, 35000, 86)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (2, '2026-10-02', 8, 22000, 74)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (3, '2026-10-03', 15, 41000, 92)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (4, '2026-10-04', 6, 18500, 65)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (5, '2026-10-05', 20, 53000, 108)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (6, '2026-10-06', 9, 27500, 79)`,
  `INSERT OR IGNORE INTO series (id, date, newLeads, revenue, activeStudents) VALUES (7, '2026-10-07', 14, 38000, 95)`,
]);
