// 阶段8 数据恢复自测：临时 express 实例挂载 dataopsRouter 监听 8814
// 严禁 import src/index.ts（其硬编码 8801 且运行中被占用）
// 运行：cd apps/server && npx tsx scripts/selftest-stage8.ts
import express from 'express';
import { existsSync, copyFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataopsRouter } from '../src/modules/dataops';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../../data');
const backupsDir = join(dataDir, 'backups');
const dbPath = join(dataDir, 'teachos.db');

const app = express();
app.use(express.json());
// mock 认证态（dataops.ts 内部检查 req.auth，挂载链上游本由 authMiddleware 注入）
app.use('/api/dataops', ((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  (req as unknown as { auth: unknown }).auth = { userId: 1, tenantId: 1, role: 'admin' };
  next();
}) as express.RequestHandler, dataopsRouter);

const server = app.listen(8814, () => {
  void (async () => {
    let failed = 0;
    const check = (name: string, cond: boolean, detail = '') => {
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + detail}`);
      if (!cond) failed++;
    };
    try {
      const base = 'http://localhost:8814/api/dataops';

      // 0. 造一个测试备份文件用于还原
      if (!existsSync(backupsDir)) {
        // 仅确保目录存在（dataops.ts 内备份接口会建，但自测需先有目录）
        mkdirSync(backupsDir, { recursive: true });
      }
      const testBackup = 'teachos-test-restore.db';
      const testBackupPath = join(backupsDir, testBackup);
      copyFileSync(dbPath, testBackupPath); // 基于当前主库造一份

      // 1. POST /restore 缺 fileName → 400
      let r = await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      check('POST /restore 缺 fileName 400', r.status === 400, `status=${r.status}`);

      // 2. POST /restore 文件名含 .. 路径穿越 → 400
      r = await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: '../teachos.db' }) });
      check('POST /restore 文件名含 .. 400', r.status === 400, `status=${r.status}`);

      // 2b. 含正斜杠也应 400
      r = await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: 'a/b.db' }) });
      check('POST /restore 文件名含 / 400', r.status === 400, `status=${r.status}`);

      // 3. POST /restore 不存在的文件 → 404
      r = await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: 'teachos-not-exist.db' }) });
      check('POST /restore 不存在文件 404', r.status === 404, `status=${r.status}`);

      // 4. POST /restore 真实备份 → 200 且 restoredFrom 正确
      r = await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: testBackup }) });
      const d = (await r.json()) as { restoredFrom?: string; note?: string };
      check('POST /restore 真实备份 200', r.status === 200, `status=${r.status} body=${JSON.stringify(d)}`);
      check('restoredFrom 等于测试备份名', d.restoredFrom === testBackup, `restoredFrom=${d.restoredFrom}`);
      check('note 提示重启生效', typeof d.note === 'string' && d.note.includes('重启'), `note=${d.note}`);

      // 清理测试备份文件
      try { unlinkSync(testBackupPath); } catch {}

      server.close();
      console.log(failed === 0 ? '\nSELFTEST PASS' : `\nSELFTEST FAILED（${failed} 项）`);
      process.exit(failed === 0 ? 0 : 1);
    } catch (e) {
      console.error('自测异常:', e);
      server.close();
      process.exit(1);
    }
  })();
});
