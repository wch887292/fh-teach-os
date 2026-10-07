/**
 * 阶段5-2 教师角色细粒度权限验证脚本
 * 用法：node apps/server/scripts/verify-rbac.js（服务需已在 8801 端口运行）
 * 只输出 PASS / FAIL 与「方法 路径 状态码」，绝不打印密码与 token 明文。
 * 退出码：全部 PASS 为 0，存在 FAIL 为 1。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 8801;
const PWD_FILE = path.resolve(__dirname, '../../../data/dev-seed-passwords.txt');

// ── 逐行解析密码文件：tenant01 行格式 用户名 密码 角色 tenantId ───────
function loadPasswords() {
  const text = fs.readFileSync(PWD_FILE, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const map = {};
  for (const line of lines) {
    // 文件里每行可能是 "用户名=密码,角色=admin,tenantId=1" 或纯文本
    // 这里按「用户名=密码,角色=...,tenantId=...」格式解析
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const username = line.slice(0, eq).trim();
    const rest = line.slice(eq + 1).trim();
    // 第一段（逗号前）即密码
    const password = rest.split(',')[0].trim();
    map[username] = password;
  }
  return map;
}

function rawRequest(method, urlPath, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(
      { host: HOST, port: PORT, path: urlPath, method, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(username, password) {
  const res = await rawRequest('POST', '/api/auth/login', { body: { username, password } });
  if (res.status !== 200) {
    throw new Error(`登录失败 ${username}（HTTP ${res.status}）`);
  }
  const json = JSON.parse(res.body || '{}');
  return json.token;
}

let passCount = 0;
let failCount = 0;

async function check(desc, method, urlPath, token, body, expected) {
  const res = await rawRequest(method, urlPath, { token, body });
  const ok = res.status === expected;
  if (ok) passCount += 1;
  else failCount += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${desc}  ${method} ${urlPath} => ${res.status} (期望 ${expected})`
  );
}

(async () => {
  const passwords = loadPasswords();
  const adminToken = await login('admin', passwords['admin']);
  const salesToken = await login('sales01', passwords['sales01']);
  const teacherToken = await login('teacher01', passwords['teacher01']);

  console.log('── teacher01 权限矩阵 ──');
  // course 出课：GET 放行，写方法 403
  await check('teacher GET course', 'GET', '/api/course/courses', teacherToken, null, 200);
  await check('teacher POST course', 'POST', '/api/course/courses', teacherToken, { name: 'x' }, 403);
  await check('teacher PATCH course', 'PATCH', '/api/course/courses/1/status', teacherToken, { status: '已满' }, 403);
  // qa 答疑：GET 放行，写方法 403
  await check('teacher GET qa', 'GET', '/api/qa/questions', teacherToken, null, 200);
  await check('teacher POST qa', 'POST', '/api/qa/questions', teacherToken, { student: 'x' }, 403);
  await check('teacher PATCH qa', 'PATCH', '/api/qa/questions/1/status', teacherToken, { status: '已解决' }, 403);
  // learning 培学：GET 放行，PATCH 额外放行
  await check('teacher GET learning', 'GET', '/api/learning/records', teacherToken, null, 200);
  await check('teacher PATCH learning', 'PATCH', '/api/learning/records/1/status', teacherToken, { status: '已完成' }, 200);
  await check('teacher POST learning', 'POST', '/api/learning/records', teacherToken, { student: 'x' }, 403);
  // conversion / acquisition / data：任何方法 403
  await check('teacher GET conversion', 'GET', '/api/conversion/leads', teacherToken, null, 403);
  await check('teacher POST conversion', 'POST', '/api/conversion/leads', teacherToken, { name: 'x' }, 403);
  await check('teacher GET acquisition', 'GET', '/api/acquisition/channels', teacherToken, null, 403);
  await check('teacher POST acquisition', 'POST', '/api/acquisition/channels', teacherToken, { name: 'x' }, 403);
  await check('teacher GET data', 'GET', '/api/data/series', teacherToken, null, 403);
  await check('teacher POST data', 'POST', '/api/data/series', teacherToken, { date: '2026-10-08' }, 403);

  console.log('── sales01 六板块 GET 各 200 ──');
  const salesGetPaths = [
    ['course', '/api/course/courses'],
    ['qa', '/api/qa/questions'],
    ['learning', '/api/learning/records'],
    ['conversion', '/api/conversion/leads'],
    ['acquisition', '/api/acquisition/channels'],
    ['data', '/api/data/series'],
  ];
  for (const [label, p] of salesGetPaths) {
    await check(`sales GET ${label}`, 'GET', p, salesToken, null, 200);
  }

  console.log('── admin 六板块 GET 各 200 ──');
  for (const [label, p] of salesGetPaths) {
    await check(`admin GET ${label}`, 'GET', p, adminToken, null, 200);
  }

  console.log(`\n结果：PASS ${passCount} 条，FAIL ${failCount} 条`);
  console.log(failCount === 0 ? 'PASS' : 'FAIL');
  process.exit(failCount === 0 ? 0 : 1);
})().catch((err) => {
  console.log('FAIL  脚本执行异常：' + err.message);
  process.exit(1);
});
