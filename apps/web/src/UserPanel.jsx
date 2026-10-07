import React, { useState, useEffect, useCallback } from 'react';
import { authFetch, isAuthError } from './api';

const ROLE_OPTIONS = ['admin', 'sales', 'teacher'];

// 状态徽标配色
const statusColors = {
  '启用中': { bg: '#dcfce7', color: '#166534' },
  '启用': { bg: '#dcfce7', color: '#166534' },
  '停用': { bg: '#fee2e2', color: '#991b1b' },
};

// 角色徽标配色
const roleColors = {
  admin: { bg: '#fee2e2', color: '#991b1b' },
  sales: { bg: '#eff6ff', color: '#1d4ed8' },
  teacher: { bg: '#fef3c7', color: '#92400e' },
};

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
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
  },
  formRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
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
  label: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
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
    display: 'inline-block',
    minWidth: 52,
    textAlign: 'center',
  },
  roleBadge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 500,
    display: 'inline-block',
    minWidth: 48,
    textAlign: 'center',
  },
  actionBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  inlineSelect: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    fontSize: 12,
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
  },
  empty: {
    padding: '16px 12px',
    color: '#cbd5e1',
    fontSize: 13,
  },
};

export default function UserPanel({ onAuthFailure }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'sales',
    tenantId: '1',
  });

  // 拉取当前用户信息（获取 id，用于判断「不能停用自己/改自己角色」）
  const fetchMe = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.user && data.user.id) {
        setCurrentUserId(data.user.id);
      }
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); }
    }
  }, [onAuthFailure]);

  const loadUsers = useCallback(async () => {
    setError('');
    setSuccess('');
    try {
      const res = await authFetch('/api/auth/users');
      if (!res.ok) {
        if (res.status === 403) {
          setError('无权限访问用户管理');
          return;
        }
        throw new Error('HTTP ' + res.status);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('加载用户列表失败');
    }
  }, [onAuthFailure]);

  useEffect(() => {
    fetchMe();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          tenantId: Number(form.tenantId) || 1,
        }),
      });
      if (!res.ok) {
        let msg = '创建用户失败';
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch { /* ignore */ }
        if (res.status === 403) msg = '无权限执行该操作';
        setError(msg);
        return;
      }
      setSuccess('用户创建成功');
      setForm({ username: '', password: '', role: 'sales', tenantId: '1' });
      await loadUsers();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('创建用户失败');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (user) => {
    // 不能停用自己的账号
    if (user.id === currentUserId && user.status !== '停用') {
      setError('不能停用自己的账号');
      return;
    }
    const targetStatus = user.status === '停用' ? '启用' : '停用';
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/api/auth/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        let msg = '操作失败';
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch { /* ignore */ }
        if (res.status === 403) msg = '无权限执行该操作';
        setError(msg);
        return;
      }
      setSuccess(`用户「${user.username}」状态已更新`);
      await loadUsers();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    if (newRole === user.role) return;
    // 不能修改自己的角色
    if (user.id === currentUserId) {
      setError('不能修改自己的角色');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/api/auth/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        let msg = '操作失败';
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch { /* ignore */ }
        if (res.status === 403) msg = '无权限执行该操作';
        setError(msg);
        return;
      }
      setSuccess(`用户「${user.username}」角色已更新为 ${newRole}`);
      await loadUsers();
    } catch (err) {
      if (isAuthError(err)) { onAuthFailure && onAuthFailure(err); return; }
      setError('操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.title}>用户管理</div>
        <div style={styles.subtitle}>仅管理员可操作用户列表与角色状态</div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && !error && <div style={styles.success}>{success}</div>}

      <div style={styles.panel}>
        <form style={styles.form} onSubmit={handleCreate}>
          <div style={styles.formTitle}>新建用户</div>
          <div style={styles.formRow}>
            <div>
              <div style={styles.label}>用户名</div>
              <input
                style={styles.input}
                placeholder="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <div style={styles.label}>密码</div>
              <input
                style={styles.input}
                type="password"
                placeholder="至少 8 位"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <div>
              <div style={styles.label}>角色</div>
              <select
                style={styles.select}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={styles.label}>租户编号</div>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={busy}>
              创建用户
            </button>
          </div>
        </form>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>用户名</th>
              <th style={styles.th}>角色</th>
              <th style={styles.th}>租户</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const sc = statusColors[user.status] || { bg: '#f1f5f9', color: '#475569' };
              const rc = roleColors[user.role] || { bg: '#f1f5f9', color: '#475569' };
              const canToggle = !(user.id === currentUserId && user.status !== '停用');
              const canRole = user.id !== currentUserId;
              return (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.username}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.roleBadge, background: rc.bg, color: rc.color }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>{user.tenantId}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleToggleStatus(user)}
                        disabled={busy || !canToggle}
                      >
                        {user.status === '停用' ? '启用' : '停用'}
                      </button>
                      <select
                        style={styles.inlineSelect}
                        value={user.role}
                        disabled={busy || !canRole}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !error && (
              <tr>
                <td colSpan={5} style={styles.empty}>暂无用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
