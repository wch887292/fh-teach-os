// 阶段7 数据导出与备份自测：临时 express 实例挂载 dataopsRouter 监听 8812
// 严禁 import src/index.ts（其硬编码 8801 且运行中被占用）
// 运行：cd apps/server && npx tsx scripts/selftest-stage7.ts
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataopsRouter } from '../src/modules/dataops';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backupsDir = join(__dirname, '../../../data/backups');

const app = express();
// mock 认证态（dataops.ts 内部检查 req.auth，挂载链上游本由 authMiddleware 注入）
app.use('/api/dataops', ((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  (req as unknown as { auth: unknown }).auth = { userId: 1, tenantId: 1, role: 'admin' };
  next();
}) as express.RequestHandler, dataopsRouter);

const server = app.listen(8812, () => {
  void (async () => {
    let failed = 0;
    const check = (name: string, cond: boolean, detail = '') => {
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + detail}`);
      if (!cond) failed++;
    };
    try {
      const base = 'http://localhost:8812/api/dataops';

      // 1. POST /backup
      let r = await fetch(`${base}/backup`, { method: 'POST' });
      let d = (await r.json()) as { fileName?: string; sizeBytes?: number };
      check('POST /backup 201', r.status === 201, `status=${r.status} body=${JSON.stringify(d)}`);
      const fileName = d.fileName ?? '';
      check('备份文件名格式 teachos-YYYYMMDD-HHmmss.db', /^teachos-\d{8}-\d{6}\.db$/.test(fileName), `fileName=${fileName}`);
      check('备份文件确实生成', fileName !== '' && existsSync(join(backupsDir, fileName)));
      check('sizeBytes 为正数', typeof d.sizeBytes === 'number' && d.sizeBytes > 0, `sizeBytes=${d.sizeBytes}`);

      // 2. GET /backups
      r = await fetch(`${base}/backups`);
      const list = (await r.json()) as { fileName: string; sizeBytes: number; mtimeMs: number }[];
      check('GET /backups 200 且至少一条', r.status === 200 && Array.isArray(list) && list.length >= 1, `n=${Array.isArray(list) ? list.length : JSON.stringify(list)}`);

      // 3. GET /export/users 脱敏
      r = await fetch(`${base}/export/users`);
      const users = (await r.json()) as Record<string, unknown>[];
      const noHash = Array.isArray(users) && users.length > 0 && users.every((u) => !('passwordHash' in u));
      check('GET /export/users 200 且逐行无 passwordHash', r.status === 200 && noHash, `status=${r.status}`);
      check('导出响应带 attachment 头', (r.headers.get('content-disposition') ?? '').includes('attachment'));

      // 4. GET /export/notexist 400
      r = await fetch(`${base}/export/notexist`);
      check('GET /export/notexist 400', r.status === 400, `status=${r.status}`);

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
