import React, { useState, useEffect } from 'react';

const MODULE_META = {
  acquisition: { name: '获课', description: '招生获客、线索管理', online: true },
  course:      { name: '出课', description: '课程交付、教学管理', online: true },
  conversion:  { name: '转化', description: '线索转化、成交跟进', online: false },
  qa:          { name: '答疑', description: '学生答疑、客服支持', online: false },
  learning:    { name: '培学', description: '学习管理、成长跟踪', online: false },
  data:        { name: '数据', description: '数据看板、运营洞察', online: false },
};

export default function App() {
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

      <div style={styles.statusBar}>
        <span style={styles.statusDot(connected)}>
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

      <footer style={styles.footer}>
        <p style={styles.footerLine}>晋江市飞虹智科技企业管理有限公司</p>
        <p style={styles.footerLine}>飞扬企源研发中心</p>
        <p style={styles.footerLine}>负责人：吴赐虹</p>
      </footer>
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
  statusBar: {
    marginBottom: 20,
  },
  statusDot: (connected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: connected ? '#16a34a' : connected === false ? '#dc2626' : '#64748b',
    '&::before': {
      content: "''",
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: connected ? '#22c55e' : connected === false ? '#ef4444' : '#94a3b8',
    },
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
