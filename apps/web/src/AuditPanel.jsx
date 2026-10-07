import React, { useState, useEffect, useCallback } from 'react';
import { authFetch, isAuthError } from './api';

const LIMIT_OPTIONS = [50, 100, 200];

// 状态码着色：200-299 绿 / 400-499 橙 / 500+ 红 / 其他灰
function statusColor(status) {
  const code = Number(status);
  if (code >= 200 && code < 300) return { color: '#16a34a', background: '#dcfce7' };
  if (code >= 400 && code < 500) return { color: '#b45309', background: '#fef3c7' };
  if (code >= 500) return { color: '#dc2626', background: '#fee2e2' };
  return { color: '#64748b', background: '#f1f5f9' };
}

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  select: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    fontSize: 13,
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  countHint: {
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    maxHeight: 560,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    position: 'sticky',
    top: 0,
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    whiteSpace: 'nowrap',
    background: '#ffffff',
    zIndex: 1,
  },
  tr: {
    borderBottom: '1px solid #f8fafc',
  },
  td: {
    padding: '9px 12px',
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  mono: {
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    fontSize: 12,
  },
  statusBadge: {
    display: 'inline-block',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 500,
    minWidth: 44,
    textAlign: 'center',
  },
  empty: {
    padding: '10px 12px',
    color: '#cbd5e1',
    fontSize: 13,
  },
};

export default function AuditPanel({ onAuthFailure }) {
  const [logs, setLogs] = useState([]);
  const [limit, setLimit] = useState(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (useLimit) => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/audit/logs?limit=${useLimit}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [onAuthFailure]);

  useEffect(() => {
    loadLogs(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLimitChange = (e) => {
    const next = Number(e.target.value);
    setLimit(next);
    loadLogs(next);
  };

  return (
    <div>
      <div style={styles.topBar}>
        <div>
          <div style={styles.title}>审计日志</div>
          <div style={styles.countHint}>共 {logs.length} 条</div>
        </div>
        <div style={styles.controls}>
          <select
            style={styles.select}
            value={limit}
            onChange={handleLimitChange}
          >
            {LIMIT_OPTIONS.map((v) => (
              <option key={v} value={v}>最近 {v} 条</option>
            ))}
          </select>
          <button
            style={styles.refreshBtn}
            onClick={() => loadLogs(limit)}
            disabled={loading}
          >
            刷新
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>时间</th>
              <th style={styles.th}>方法</th>
              <th style={styles.th}>路径</th>
              <th style={styles.th}>状态码</th>
              <th style={styles.th}>耗时(ms)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const sc = statusColor(log.status);
              return (
                <tr key={log.id} style={styles.tr}>
                  <td style={{ ...styles.td, ...styles.mono }}>{log.ts}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{log.method}</td>
                  <td style={styles.td}>{log.path}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...sc }}>{log.status}</span>
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {Number(log.durationMs).toFixed(1)}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && !error && (
              <tr>
                <td colSpan={5} style={styles.empty}>暂无审计日志</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
