import React, { useState, useEffect } from 'react';
import AcquisitionPanel from './AcquisitionPanel';
import CoursePanel from './CoursePanel';
import DashboardChart from './DashboardChart';
import Login from './Login';
import AuditPanel from './AuditPanel';
import { authFetch, clearToken, isAuthError, getToken } from './api';

const MODULE_META = {
  acquisition: { name: '获课', description: '招生获客、线索管理', online: true },
  course:      { name: '出课', description: '课程交付、教学管理', online: true },
  conversion:  { name: '转化', description: '线索转化、成交跟进', online: true },
  qa:          { name: '答疑', description: '学生答疑、客服支持', online: true },
  learning:    { name: '培学', description: '学习管理、成长跟踪', online: false },
  data:        { name: '数据', description: '数据看板、运营洞察', online: false },
};

const getNextConversionStatus = (current) => {
  if (current === '新线索') return '跟进中';
  if (current === '跟进中') return '已成交';
  return null;
};

const getNextQaStatus = (current) => {
  if (current === '待回复') return '处理中';
  if (current === '处理中') return '已解决';
  return null;
};

const getNextChannelStatus = (current) => {
  if (current === '启用中') return '已停用';
  return null;
};

// 各板块 tab 标签，与 MODULE_META 的 key 对应
const TAB_LABELS = [
  { key: 'acquisition', label: '获课板块' },
  { key: 'course', label: '出课板块' },
  { key: 'conversion', label: '转化板块' },
  { key: 'qa', label: '答疑板块' },
  { key: 'learning', label: '培学板块' },
  { key: 'data', label: '数据看板' },
];

// teacher 角色可见的板块 key（出课 / 答疑 / 培学），其余角色显示全部
const TEACHER_VISIBLE = ['course', 'qa', 'learning'];

// 按角色返回可见板块 key 列表
function getVisibleKeys(role) {
  if (role === 'teacher') return TEACHER_VISIBLE;
  return TAB_LABELS.map((t) => t.key);
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));
  const [tab, setTab] = useState('总览');
  const [modules, setModules] = useState([]);
  const [connected, setConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');

  // 拉取当前用户角色（GET /api/auth/me），失败静默保持空串（后续逻辑按全显处理）
  const fetchRole = () => {
    authFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user && data.user.role) {
          setRole(data.user.role);
        }
      })
      .catch(() => {});
  };

  // 401 统一兜底：清 token 回登录页
  const handleAuthFailure = (err) => {
    if (isAuthError(err)) {
      setLoggedIn(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
  };

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    fetchRole();
    // 重新拉取一次模块状态，进入主界面
    authFetch('/api/modules')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setConnected(true);
        return res.json();
      })
      .then((data) => setModules(data))
      .catch((err) => {
        if (isAuthError(err)) setConnected(false);
        else setConnected(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRole();
    authFetch('/api/modules')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setConnected(true);
        return res.json();
      })
      .then((data) => setModules(data))
      .catch((err) => {
        handleAuthFailure(err);
        setConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  // 当前 tab 若被角色过滤掉，自动切到角色可见的第一个板块 tab
  useEffect(() => {
    if (!role) return;
    const visibleKeys = getVisibleKeys(role);
    const currentKey = TAB_LABELS.find((t) => t.label === tab)?.key;
    // 板块体系外的 tab（总览、审计日志等）不受角色过滤影响
    if (currentKey === undefined) return;
    if (visibleKeys.includes(currentKey)) return;
    const firstVisible = TAB_LABELS.find((t) => visibleKeys.includes(t.key));
    if (firstVisible) setTab(firstVisible.label);
  }, [role, tab]);

  if (!loggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const visibleKeys = getVisibleKeys(role || 'admin');

  const items = (
    modules.length > 0
      ? modules
          .map((mod) => ({
            key: typeof mod === 'string' ? mod : mod.name,
            status: typeof mod === 'string' ? (MODULE_META[mod]?.online ? 'online' : 'planned') : mod.status,
          }))
          .filter((it) => visibleKeys.includes(it.key))
      : Object.entries(MODULE_META)
          .filter(([key]) => visibleKeys.includes(key))
          .map(([key, meta]) => ({ key, status: meta.online ? 'online' : 'planned' }))
  );

  // 按角色过滤可见 tab（保持原始顺序：获课、出课、总览、转化、答疑、培学、数据看板）
  const visibleTabs = TAB_LABELS.filter((t) => visibleKeys.includes(t.key));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Teach-OS · 教育操作系统</h1>
            <p style={styles.subtitle}>六大板块 · 会 AI 的人 + 系统，替代传统小教育团队</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </header>

      <nav style={styles.tabs}>
        {visibleTabs
          .filter((t) => t.key === 'acquisition')
          .map((t) => (
            <button key={t.key}
              style={{ ...styles.tabBtn, ...(tab === t.label ? styles.tabActive : {}) }}
              onClick={() => setTab(t.label)}
            >
              {t.label}
            </button>
          ))}
        {visibleTabs
          .filter((t) => t.key === 'course')
          .map((t) => (
            <button key={t.key}
              style={{ ...styles.tabBtn, ...(tab === t.label ? styles.tabActive : {}) }}
              onClick={() => setTab(t.label)}
            >
              {t.label}
            </button>
          ))}
        <button
          style={{ ...styles.tabBtn, ...(tab === '总览' ? styles.tabActive : {}) }}
          onClick={() => setTab('总览')}
        >
          总览
        </button>
        {visibleTabs
          .filter((t) => !['acquisition', 'course'].includes(t.key))
          .map((t) => (
            <button key={t.key}
              style={{ ...styles.tabBtn, ...(tab === t.label ? styles.tabActive : {}) }}
              onClick={() => setTab(t.label)}
            >
              {t.label}
            </button>
          ))}
        {role === 'admin' && (
          <button
            key="audit"
            style={{ ...styles.tabBtn, ...(tab === '审计日志' ? styles.tabActive : {}) }}
            onClick={() => setTab('审计日志')}
          >
            审计日志
          </button>
        )}
      </nav>

      {tab === '获课板块' ? (
        <AcquisitionPanel onAuthFailure={handleAuthFailure} />
      ) : tab === '出课板块' ? (
        <CoursePanel onAuthFailure={handleAuthFailure} />
      ) : tab === '总览' ? (
        <>
          <div style={styles.statusBar}>
            <span style={styles.statusDot(connected)}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  marginRight: 6,
                  background: connected ? '#22c55e' : connected === false ? '#ef4444' : '#94a3b8',
                }}
              />
              后端{connected ? '已连接' : connected === false ? '未连接' : '检测中…'}
            </span>
          </div>

          {loading ? (
            <div style={styles.loading}>加载中…</div>
          ) : (
            <div style={styles.grid}>
              {items.map((item) => {
                const m = MODULE_META[item.key] || { name: item.key, description: '' };
                const status = connected && item.status === 'online';
                return (
                  <div
                    key={item.key}
                    style={{
                      ...styles.card,
                      borderLeft: `4px solid ${status ? '#22c55e' : '#f59e0b'}`,
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <span style={styles.cardTitle}>{m.name}</span>
                      <span
                        style={{
                          ...styles.badge,
                          background: status ? '#dcfce7' : '#fef3c7',
                          color: status ? '#166534' : '#92400e',
                        }}
                      >
                        {status ? '在线' : '待开发'}
                      </span>
                    </div>
                    <p style={styles.cardDesc}>{m.description}</p>
                    <code style={styles.code}>{item.key}</code>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : tab === '转化板块' ? (
        <ConversionPanel onAuthFailure={handleAuthFailure} />
      ) : tab === '答疑板块' ? (
        <QaPanel onAuthFailure={handleAuthFailure} />
      ) : tab === '数据看板' ? (
        <DataPanel onAuthFailure={handleAuthFailure} />
      ) : tab === '审计日志' ? (
        <AuditPanel onAuthFailure={handleAuthFailure} />
      ) : (
        <LearningPanel onAuthFailure={handleAuthFailure} />
      )}

      <footer style={styles.footer}>
        <p style={styles.footerLine}>晋江市飞虹智科技企业管理有限公司</p>
        <p style={styles.footerLine}>飞扬企源研发中心</p>
        <p style={styles.footerLine}>负责人：吴赐虹</p>
      </footer>
    </div>
  );
}

function ConversionPanel({ onAuthFailure }) {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({ name: '', source: '', course: '', amount: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        authFetch('/api/conversion/stats'),
        authFetch('/api/conversion/leads'),
      ]);
      if (!statsRes.ok || !leadsRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setLeads(await leadsRes.json());
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载转化数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const advanceStatus = async (lead) => {
    const next = getNextConversionStatus(lead.status);
    if (!next) return;
    setBusy(true);
    try {
      const res = await authFetch(`/api/conversion/leads/${lead.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('推进状态失败');
    } finally {
      setBusy(false);
    }
  };

  const submitLead = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/api/conversion/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          source: form.source,
          course: form.course,
          amount: Number(form.amount) || 0,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ name: '', source: '', course: '', amount: '' });
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('新增线索失败');
    } finally {
      setBusy(false);
    }
  };

  const statItems = [
    { label: '线索总数', value: stats?.total ?? 0 },
    { label: '跟进中', value: stats?.byStatus?.['跟进中'] ?? 0 },
    { label: '已成交', value: stats?.byStatus?.['已成交'] ?? 0 },
    { label: '转化率', value: `${stats?.conversionRate ?? 0}%` },
    { label: '成交金额', value: `¥${(stats?.totalAmount ?? 0).toLocaleString()}` },
  ];

  const statusColors = {
    '新线索': { bg: '#eff6ff', color: '#1d4ed8' },
    '跟进中': { bg: '#fef3c7', color: '#92400e' },
    '已成交': { bg: '#dcfce7', color: '#166534' },
    '已流失': { bg: '#fee2e2', color: '#991b1b' },
  };

  return (
    <div>
      <div style={styles.statsRow}>
        {statItems.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>姓名</th>
              <th style={styles.th}>来源</th>
              <th style={styles.th}>课程</th>
              <th style={styles.th}>金额</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const next = getNextConversionStatus(lead.status);
              const sc = statusColors[lead.status] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={lead.id} style={styles.tr}>
                  <td style={styles.td}>{lead.name}</td>
                  <td style={styles.td}>{lead.source}</td>
                  <td style={styles.td}>{lead.course}</td>
                  <td style={styles.td}>¥{Number(lead.amount).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {next ? (
                      <button
                        style={styles.advanceBtn}
                        onClick={() => advanceStatus(lead)}
                        disabled={busy}
                      >
                        推进为{next}
                      </button>
                    ) : (
                      <span style={styles.actionPlaceholder}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} style={styles.td}>暂无线索</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitLead}>
        <h3 style={styles.formTitle}>新增线索</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="姓名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="来源"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="课程"
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="金额"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}

function LearningPanel({ onAuthFailure }) {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ student: '', course: '', progress: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, recordsRes] = await Promise.all([
        authFetch('/api/learning/stats'),
        authFetch('/api/learning/records'),
      ]);
      if (!statsRes.ok || !recordsRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setRecords(await recordsRes.json());
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载培学数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const markCompleted = async (record) => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/learning/records/${record.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '已完成' }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('标记完成失败');
    } finally {
      setBusy(false);
    }
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/api/learning/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: form.student,
          course: form.course,
          progress: form.progress === '' ? undefined : Number(form.progress),
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ student: '', course: '', progress: '' });
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('新增记录失败');
    } finally {
      setBusy(false);
    }
  };

  const statItems = [
    { label: '学员总数', value: stats?.total ?? 0 },
    { label: '记录总数', value: stats?.total ?? 0 },
    { label: '学习中', value: stats?.byStatus?.['学习中'] ?? 0 },
    { label: '已完成', value: stats?.byStatus?.['已完成'] ?? 0 },
    { label: '平均进度', value: `${stats?.avgProgress ?? 0}%` },
  ];

  const statusColors = {
    '学习中': { bg: '#eff6ff', color: '#1d4ed8' },
    '已完成': { bg: '#dcfce7', color: '#166534' },
    '已暂停': { bg: '#fef3c7', color: '#92400e' },
  };

  return (
    <div>
      <div style={styles.statsRow5}>
        {statItems.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>学生</th>
              <th style={styles.th}>课程</th>
              <th style={styles.th}>进度</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const sc = statusColors[record.status] || { bg: '#f1f5f9', color: '#475569' };
              const showCompleteBtn = record.status === '学习中';
              return (
                <tr key={record.id} style={styles.tr}>
                  <td style={styles.td}>{record.student}</td>
                  <td style={styles.td}>{record.course}</td>
                  <td style={styles.td}>{record.progress}%</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {record.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {showCompleteBtn ? (
                      <button
                        style={styles.advanceBtn}
                        onClick={() => markCompleted(record)}
                        disabled={busy}
                      >
                        标记完成
                      </button>
                    ) : (
                      <span style={styles.actionPlaceholder}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.td}>暂无记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitRecord}>
        <h3 style={styles.formTitle}>新增记录</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="学生"
            value={form.student}
            onChange={(e) => setForm({ ...form, student: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="课程"
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="进度"
            type="number"
            min="0"
            max="100"
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: e.target.value })}
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}

function QaPanel({ onAuthFailure }) {
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ student: '', course: '', question: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, questionsRes] = await Promise.all([
        authFetch('/api/qa/stats'),
        authFetch('/api/qa/questions'),
      ]);
      if (!statsRes.ok || !questionsRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setQuestions(await questionsRes.json());
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载答疑数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const advanceStatus = async (question) => {
    const next = getNextQaStatus(question.status);
    if (!next) return;
    setBusy(true);
    try {
      const res = await authFetch(`/api/qa/questions/${question.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('推进状态失败');
    } finally {
      setBusy(false);
    }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/api/qa/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: form.student,
          course: form.course,
          question: form.question,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ student: '', course: '', question: '' });
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('新增问题失败');
    } finally {
      setBusy(false);
    }
  };

  const statItems = [
    { label: '问题总数', value: stats?.total ?? 0 },
    { label: '待回复', value: stats?.byStatus?.['待回复'] ?? 0 },
    { label: '处理中', value: stats?.byStatus?.['处理中'] ?? 0 },
    { label: '解决率', value: `${stats?.resolveRate ?? 0}%` },
  ];

  const statusColors = {
    '待回复': { bg: '#eff6ff', color: '#1d4ed8' },
    '处理中': { bg: '#fef3c7', color: '#92400e' },
    '已解决': { bg: '#dcfce7', color: '#166534' },
  };

  return (
    <div>
      <div style={styles.statsRow4}>
        {statItems.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>学生</th>
              <th style={styles.th}>课程</th>
              <th style={styles.th}>问题</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const next = getNextQaStatus(question.status);
              const sc = statusColors[question.status] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={question.id} style={styles.tr}>
                  <td style={styles.td}>{question.student}</td>
                  <td style={styles.td}>{question.course}</td>
                  <td style={styles.td}>{question.question}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {question.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {next ? (
                      <button
                        style={styles.advanceBtn}
                        onClick={() => advanceStatus(question)}
                        disabled={busy}
                      >
                        推进为{next}
                      </button>
                    ) : (
                      <span style={styles.actionPlaceholder}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {questions.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.td}>暂无问题</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitQuestion}>
        <h3 style={styles.formTitle}>新增问题</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="学生"
            value={form.student}
            onChange={(e) => setForm({ ...form, student: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="课程"
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="问题"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            required
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}

function DataPanel({ onAuthFailure }) {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ date: '', newLeads: '', revenue: '', activeStudents: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [summaryRes, recordsRes] = await Promise.all([
        authFetch('/api/data/summary'),
        authFetch('/api/data/series'),
      ]);
      if (!summaryRes.ok || !recordsRes.ok) throw new Error('HTTP ' + summaryRes.status);
      setSummary(await summaryRes.json());
      setRecords(await recordsRes.json());
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载数据看板失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submitRecord = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/api/data/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          newLeads: Number(form.newLeads),
          revenue: Number(form.revenue),
          activeStudents: Number(form.activeStudents),
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ date: '', newLeads: '', revenue: '', activeStudents: '' });
      await loadAll();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('新增记录失败');
    } finally {
      setBusy(false);
    }
  };

  const statItems = [
    { label: '记录天数', value: summary?.totalDays ?? 0 },
    { label: '新线索合计', value: summary?.totalLeads ?? 0 },
    { label: '收入合计', value: `¥${(summary?.totalRevenue ?? 0).toLocaleString()}` },
    { label: '日均活跃', value: summary?.avgActiveStudents ?? 0 },
  ];

  return (
    <div>
      <div style={styles.statsRow4}>
        {statItems.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <DashboardChart records={records} />

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>日期</th>
              <th style={styles.th}>新线索</th>
              <th style={styles.th}>收入</th>
              <th style={styles.th}>活跃学员</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}>{r.date}</td>
                <td style={styles.td}>{r.newLeads}</td>
                <td style={styles.td}>¥{r.revenue.toLocaleString()}</td>
                <td style={styles.td}>{r.activeStudents}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={4} style={styles.td}>暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitRecord}>
        <h3 style={styles.formTitle}>新增记录</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="日期"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="新线索"
            type="number"
            min="0"
            value={form.newLeads}
            onChange={(e) => setForm({ ...form, newLeads: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="收入"
            type="number"
            min="0"
            value={form.revenue}
            onChange={(e) => setForm({ ...form, revenue: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="活跃学员"
            type="number"
            min="0"
            value={form.activeStudents}
            onChange={(e) => setForm({ ...form, activeStudents: e.target.value })}
            required
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '32px 24px',
    color: '#1e293b',
  },
  header: {
    marginBottom: 28,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  logoutBtn: {
    padding: '8px 18px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: 14,
    color: '#64748b',
  },
  tabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 24,
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: 12,
  },
  tabBtn: {
    padding: '8px 20px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#475569',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#0f172a',
    color: '#ffffff',
    border: '1px solid #0f172a',
  },
  statusBar: {
    marginBottom: 16,
    fontSize: 13,
    color: '#64748b',
  },
  statusDot: (connected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: connected ? '#16a34a' : connected === false ? '#dc2626' : '#64748b',
  }),
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 15,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#ffffff',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
  },
  badge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 500,
  },
  cardDesc: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
  },
  code: {
    display: 'inline-block',
    marginTop: 10,
    fontSize: 11,
    color: '#94a3b8',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: 4,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  statsRow5: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  statsRow4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: '#ffffff',
    borderRadius: 10,
    padding: '18px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #f1f5f9',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  tableWrap: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    overflow: 'auto',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f8fafc',
  },
  td: {
    padding: '10px 12px',
    color: '#1e293b',
  },
  statusBadge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 500,
  },
  advanceBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  actionPlaceholder: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  form: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  formTitle: {
    margin: '0 0 14px',
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
  formRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  input: {
    flex: '1 1 140px',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    fontSize: 13,
    color: '#1e293b',
    outline: 'none',
    background: '#f8fafc',
  },
  submitBtn: {
    padding: '8px 24px',
    borderRadius: 6,
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTop: '1px solid #e2e8f0',
  },
  footerLine: {
    margin: '4px 0',
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
};
