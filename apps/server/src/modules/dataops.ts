import { Router } from 'express';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db';

// 数据库与 backups 目录路径：本文件在 apps/server/src/modules/ 下，
// 往上四跳（modules → src → server → apps）到工作区根
// 即 I:/Teach-OS/data/teachos.db 与 I:/Teach-OS/data/backups/
const __dirname = dirname(fileURLToPath(import.meta.url));
function resolveFromBase(base: string, rel: string): string {
  const parts = rel.split('/');
  let p = base;
  for (const part of parts) {
    if (part === '..') p = dirname(p);
    else if (part !== '.') p = join(p, part);
  }
  return p;
}

const dataDir = resolveFromBase(__dirname, '../../../../data');
const dbPath = join(dataDir, 'teachos.db');
const backupsDir = join(dataDir, 'backups');

// 白名单表：业务表 + users（导出时剔除 passwordHash）
const EXPORT_WHITELIST: string[] = [
  'leads',
  'questions',
  'records',
  'series',
  'channels',
  'courses',
  'users',
];

// 仅允许白名单内的表名通过（防 SQL 注入），其余一律 400
function assertTableAllowed(table: string): boolean {
  return EXPORT_WHITELIST.includes(table);
}

// 时间戳格式 YYYYMMDD-HHmmss
function timestampSuffix(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${mo}${da}-${h}${mi}${s}`;
}

// 导出文件名里的日期部分 YYYY-MM-DD
function dateSuffix(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dataopsRouter = Router();

// 一、POST /backup 执行备份
dataopsRouter.post('/backup', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  try {
    if (!existsSync(dbPath)) {
      res.status(500).json({ error: '数据库文件不存在，无法备份' });
      return;
    }
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }
    const fileName = `teachos-${timestampSuffix(new Date())}.db`;
    const dest = join(backupsDir, fileName);
    copyFileSync(dbPath, dest);
    const sizeBytes = statSync(dest).size;
    res.status(201).json({ fileName, sizeBytes });
  } catch (err) {
    res.status(500).json({ error: '备份失败：' + (err instanceof Error ? err.message : String(err)) });
  }
});

// 二、GET /backups 列出备份
dataopsRouter.get('/backups', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  if (!existsSync(backupsDir)) {
    res.json([]);
    return;
  }
  const files = readdirSync(backupsDir)
    .filter((f) => f.endsWith('.db'))
    .map((fileName) => {
      const st = statSync(join(backupsDir, fileName));
      return { fileName, sizeBytes: st.size, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.fileName.localeCompare(a.fileName)); // 文件名倒序（时间戳倒序）
  res.json(files);
});

// 三、GET /export/:table 导出表白名单 JSON
dataopsRouter.get('/export/:table', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: '未认证，请先登录' });
    return;
  }
  const table = req.params.table;
  if (!assertTableAllowed(table)) {
    res
      .status(400)
      .json({ error: `不支持的表：${table}。可导出白名单表：${EXPORT_WHITELIST.join('、')}` });
    return;
  }
  try {
    let rows: Record<string, unknown>[];
    if (table === 'users') {
      const all = db.prepare('SELECT * FROM users').all() as unknown as Record<string, unknown>[];
      // 逐行剔除 passwordHash
      rows = all.map((row) => {
        const copy = { ...row };
        delete copy.passwordHash;
        return copy;
      });
    } else {
      rows = db.prepare(`SELECT * FROM ${table}`).all() as unknown as Record<string, unknown>[];
    }
    const fileName = `${table}-${dateSuffix(new Date())}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '导出失败：' + (err instanceof Error ? err.message : String(err)) });
  }
});

export { EXPORT_WHITELIST };
