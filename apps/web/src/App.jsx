import React, { useState, useEffect } from 'react';

const MODULE_META = {
  acquisition: { name: '获课', description: '招生获客、线索管理', online: true },
  course:      { name: '出课', description: '课程交付、教学管理', online: true },
  conversion:  { name: '转化', description: '线索转化、成交跟进', online: true },
  qa:          { name: '答疑', description: '学生答疑、客服支持', online: false },
  learning:    { name: '培学', description: '学习管理、成长跟踪', online: false },
  data:        { name: '数据', description: '数据看板、运营洞察', online: false },
};

const getNextStatus = (current) => {
  if (current === '新线索') return '跟进中';
  if (current === '跟进中') return '已成交';
  return null;
};

export default function App() {
  const [tab, setTab] = useState('总览');
  const [modules, setModules] = useState([]);
  const [connected, setConnected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/modules')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setConnected(true);
        return res.json();
      })
      .then((data) => setModules(data))
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const items = (
    modules.length > 0
      ? modules.map((mod) => ({
          key: typeof mod === 'string' ? mod : mod.name,
          status: typeof mod === 'string' ? (MODULE_META[mod]?.online ? 'online' : 'planned') : mod.status,
        }))
      : Object.entries(MODULE_META).map(([key, meta]) => ({ key, status: meta.online ? 'online' : 'planned' }))
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Teach-OS · 教育操作系统</h1>
        <p style={styles.subtitle}>六大板块 · 会 AI 的人 + 系统，替代传统小教育团队</p>
      </header>

      <nav style={styles.tabs}>
        <button
          style={{ ...styles.tabBtn, ...(tab === '总览' ? styles.tabActive : {}) }}
          onClick={() => setTab('总览')}
        >
          总览
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === '转化板块' ? styles.tabActive : {}) }}
          onClick={() => setTab('转化板块')}
        >
          转化板块
        </button>
      </nav>

      {tab === '总览' ? (
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
      ) : (
        <ConversionPanel />
      )}

      <footer style={styles.footer}>
        <p style={styles.footerLine}>晋江市飞虹智科技企业管理有限公司</p>
        <p style={styles.footerLine}>飞扬企源研发中心</p>
        <p style={styles.footerLine}>负责人：吴赐虹</p>
      </footer>
    </div>
  );
}

function ConversionPanel() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({ name: '', source: '', course: '', amount: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch('/api/conversion/stats'),
        fetch('/api/conversion/leads'),
      ]);
      if (!statsRes.ok || !leadsRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setLeads(await leadsRes.json());
    } catch {
      setError('加载转化数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const advanceStatus = async (lead) => {
    const next = getNextStatus(lead.status);
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/conversion/leads/${lead.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await loadAll();
    } catch {
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
      const res = await fetch('/api/conversion/leads', {
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
    } catch {
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
              const next = getNextStatus(lead.status);
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

const styles = {
  page: {
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '32px 24px',
    color: '#1e293b',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: '8px 0 0',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  tabBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#1e293b',
    color: '#fff',
    border: '1px solid #1e293b',
  },
  statusBar: {
    marginBottom: 20,
  },
  statusDot: (connected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: connected ? '#16a34a' : connected === false ? '#dc2626' : '#64748b',
  }),
  loading: {
    color: '#64748b',
    padding: 40,
    textAlign: 'center',
    fontSize: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
  badge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 99,
    fontWeight: 600,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    margin: 0,
  },
  code: {
    display: 'block',
    marginTop: 10,
    fontSize: 11,
    color: '#94a3b8',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: 4,
    width: 'fit-content',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
  },
  tableWrap: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'auto',
    marginBottom: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    color: '#64748b',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 16px',
  },
  statusBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 99,
    fontWeight: 600,
  },
  advanceBtn: {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #22c55e',
    background: '#f0fdf4',
    color: '#166534',
    cursor: 'pointer',
  },
  actionPlaceholder: {
    color: '#cbd5e1',
  },
  form: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  formTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 600,
  },
  formRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 120,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    fontSize: 13,
  },
  submitBtn: {
    padding: '8px 20px',
    borderRadius: 6,
    border: 'none',
    background: '#1e293b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    marginTop: 40,
    paddingTop: 16,
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  footerLine: {
    margin: '2px 0',
    fontSize: 12,
    color: '#94a3b8',
  },
};
