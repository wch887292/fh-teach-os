import React, { useState } from 'react';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: 24,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#1e293b',
    borderRadius: 14,
    padding: 32,
    border: '1px solid #334155',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#f8fafc',
    textAlign: 'center',
  },
  subtitle: {
    margin: '8px 0 24px',
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #475569',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
  },
  error: {
    background: '#7f1d1d',
    color: '#fecaca',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    padding: '11px 0',
    borderRadius: 8,
    border: 'none',
    background: '#22c55e',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.6,
  },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '登录失败，请稍后再试');
        return;
      }

      const data = await res.json();
      if (!data.token) {
        setError('登录响应缺少 token');
        return;
      }

      localStorage.setItem('teachos-token', data.token);
      onLogin();
    } catch {
      setError('网络异常，无法连接服务器');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Teach-OS</h1>
        <p style={styles.subtitle}>教育操作系统 · 登录</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={submit}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-username">用户名</label>
            <input
              id="login-username"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-password">密码</label>
            <input
              id="login-password"
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(busy ? styles.buttonDisabled : {}) }}
            disabled={busy}
          >
            {busy ? '登录中…' : '登录'}
          </button>
        </form>

        <p style={styles.hint}>开发环境默认账号：admin / Admin@2026</p>
      </div>
    </div>
  );
}
