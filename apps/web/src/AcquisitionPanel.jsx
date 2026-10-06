import React, { useState, useEffect } from 'react';

const styles = {
  statsRow: {
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
  form: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  formTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 600,
  },
  actionPlaceholder: {
    color: '#cbd5e1',
  },
};

export default function AcquisitionPanel() {
  const [stats, setStats] = useState(null);
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({ name: '', type: '', investment: '', costPerLead: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, channelsRes] = await Promise.all([
        fetch('/api/acquisition/stats'),
        fetch('/api/acquisition/channels'),
      ]);
      if (!statsRes.ok || !channelsRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setChannels(await channelsRes.json());
    } catch {
      setError('加载获课数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submitChannel = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/acquisition/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          investment: Number(form.investment) || 0,
          costPerLead: Number(form.costPerLead) || 0,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ name: '', type: '', investment: '', costPerLead: '' });
      await loadAll();
    } catch {
      setError('新增渠道失败');
    } finally {
      setBusy(false);
    }
  };

  const advanceStatus = async (channel) => {
    const next = getNextChannelStatus(channel.status);
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/acquisition/channels/${channel.id}/status`, {
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

  const getNextChannelStatus = (current) => {
    if (current === '启用中') return '已停用';
    if (current === '已停用') return '启用中';
    return null;
  };

  const toggleLabel = (next) => (next === '已停用' ? '停用' : '启用');

  const statItems = [
    { label: '渠道总数', value: stats?.total ?? 0 },
    { label: '启用中', value: stats?.byStatus?.['启用中'] ?? 0 },
    { label: '已停用', value: stats?.byStatus?.['已停用'] ?? 0 },
    { label: '投入合计', value: `¥${(stats?.totalInvestment ?? 0).toLocaleString()}` },
  ];

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
              <th style={styles.th}>渠道名称</th>
              <th style={styles.th}>类型</th>
              <th style={styles.th}>投入</th>
              <th style={styles.th}>单线索成本</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => {
              const next = getNextChannelStatus(channel.status);
              const sc = statusColors[channel.status] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={channel.id} style={styles.tr}>
                  <td style={styles.td}>{channel.name}</td>
                  <td style={styles.td}>{channel.type}</td>
                  <td style={styles.td}>¥{Number(channel.investment).toLocaleString()}</td>
                  <td style={styles.td}>¥{Number(channel.costPerLead).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {channel.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {next ? (
                      <button
                        style={styles.advanceBtn}
                        onClick={() => advanceStatus(channel)}
                        disabled={busy}
                      >
                        {toggleLabel(next)}
                      </button>
                    ) : (
                      <span style={styles.actionPlaceholder}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {channels.length === 0 && (
              <tr>
                <td colSpan={6} style={styles.td}>暂无渠道</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitChannel}>
        <h3 style={styles.formTitle}>新增渠道</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="渠道名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="类型"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="投入"
            type="number"
            value={form.investment}
            onChange={(e) => setForm({ ...form, investment: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="单线索成本"
            type="number"
            value={form.costPerLead}
            onChange={(e) => setForm({ ...form, costPerLead: e.target.value })}
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}

const statusColors = {
  '启用中': { bg: '#dcfce7', color: '#166534' },
  '已停用': { bg: '#fee2e2', color: '#991b1b' },
};
