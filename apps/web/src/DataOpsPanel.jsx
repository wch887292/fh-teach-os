import React, { useState, useEffect, useCallback } from 'react';
import { authFetch, isAuthError } from './api';

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  panel: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnDisabled: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#94a3b8',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'not-allowed',
  },
  tableWrap: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    overflow: 'auto',
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
  td: {
    padding: '10px 12px',
    color: '#1e293b',
    borderBottom: '1px solid #f8fafc',
  },
  select: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    fontSize: 13,
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 200,
  },
  formRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  empty: {
    padding: '16px 12px',
    color: '#cbd5e1',
    fontSize: 13,
  },
};

const EXPORT_TABLES = [
  'leads',
  'questions',
  'records',
  'series',
  'channels',
  'courses',
  'users',
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function DataOpsPanel({ onAuthFailure }) {
  const [backups, setBackups] = useState([]);
  const [exportTable, setExportTable] = useState('leads');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const loadBackups = useCallback(async () => {
    setError('');
    try {
      const res = await authFetch('/api/dataops/backups');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          onAuthFailure && onAuthFailure(new Error('unauthorized'));
          return;
        }
        throw new Error('HTTP ' + res.status);
      }
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载备份列表失败：' + (err instanceof Error ? err.message : String(err)));
    }
  }, [onAuthFailure]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleBackup = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch('/api/dataops/backup', { method: 'POST' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          onAuthFailure && onAuthFailure(new Error('unauthorized'));
          return;
        }
        let msg = '备份失败';
        try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
        setError(msg);
        return;
      }
      const data = await res.json();
      setSuccess(`备份成功：${data.fileName} (${formatBytes(data.sizeBytes)})`);
      await loadBackups();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('备份请求失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/api/dataops/export/${exportTable}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          onAuthFailure && onAuthFailure(new Error('unauthorized'));
          return;
        }
        let msg = '导出失败';
        try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 从 Content-Disposition 解析文件名，兜底用表名-日期.json
      const cd = res.headers.get('Content-Disposition') || '';
      let fileName = `${exportTable}-${new Date().toISOString().slice(0, 10)}.json`;
      const match = cd.match(/filename="?([^"]+)"?/);
      if (match) fileName = match[1];
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(`已下载：${fileName}`);
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('导出请求失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div style={styles.page}>
      {/* 备份管理 */}
      <div style={styles.panel}>
        <h2 style={styles.title}>备份管理</h2>
        <p style={styles.subtitle}>点击立即备份将当前数据库复制到 data/backups 目录，文件名含时间戳</p>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            style={busy ? styles.btnDisabled : styles.btn}
            onClick={handleBackup}
            disabled={busy}
          >
            {busy ? '备份中...' : '立即备份'}
          </button>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>文件名</th>
                <th style={styles.th}>大小</th>
                <th style={styles.th}>修改时间</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr><td colSpan={3} style={{...styles.td, ...styles.empty}}>暂无备份文件</td></tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.fileName}>
                    <td style={styles.td}>{b.fileName}</td>
                    <td style={styles.td}>{formatBytes(b.sizeBytes)}</td>
                    <td style={styles.td}>{formatTime(b.mtimeMs)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 数据导出 */}
      <div style={styles.panel}>
        <h2 style={styles.title}>数据导出</h2>
        <p style={styles.subtitle}>选择表名导出 JSON，文件将自动下载（users 表已剔除 passwordHash）</p>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <div style={styles.formRow}>
          <label style={styles.label}>导出表</label>
          <select
            style={styles.select}
            value={exportTable}
            onChange={(e) => setExportTable(e.target.value)}
          >
            {EXPORT_TABLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button style={styles.btn} onClick={handleExport} disabled={busy}>
            {busy ? '导出中...' : '导出 JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}