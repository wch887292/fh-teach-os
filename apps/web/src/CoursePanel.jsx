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
  },
  form: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  formTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 600,
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
};

const statusColors = {
  '招生中': { bg: '#eff6ff', color: '#1d4ed8' },
  '已满': { bg: '#fef3c7', color: '#92400e' },
  '已结课': { bg: '#f1f5f9', color: '#475569' },
};

export default function CoursePanel() {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ name: '', teacher: '', price: '', totalStudents: '', capacity: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, coursesRes] = await Promise.all([
        fetch('/api/course/stats'),
        fetch('/api/course/courses'),
      ]);
      if (!statsRes.ok || !coursesRes.ok) throw new Error('HTTP ' + statsRes.status);
      setStats(await statsRes.json());
      setCourses(await coursesRes.json());
    } catch {
      setError('加载出课数据失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submitCourse = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/course/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          teacher: form.teacher,
          price: Number(form.price) || 0,
          totalStudents: Number(form.totalStudents) || 0,
          capacity: Number(form.capacity) || 0,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setForm({ name: '', teacher: '', price: '', totalStudents: '', capacity: '' });
      await loadAll();
    } catch {
      setError('新增课程失败');
    } finally {
      setBusy(false);
    }
  };

  const markFull = async (course) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/course/courses/${course.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '已满' }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await loadAll();
    } catch {
      setError('标记已满失败');
    } finally {
      setBusy(false);
    }
  };

  const statItems = [
    { label: '课程总数', value: stats?.total ?? 0 },
    { label: '招生中', value: stats?.byStatus?.['招生中'] ?? 0 },
    { label: '学员合计', value: stats?.totalStudents ?? 0 },
    { label: '平均价格', value: `¥${(stats?.avgPrice ?? 0).toLocaleString()}` },
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
              <th style={styles.th}>课程名称</th>
              <th style={styles.th}>讲师</th>
              <th style={styles.th}>价格</th>
              <th style={styles.th}>学员数</th>
              <th style={styles.th}>容量</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => {
              const sc = statusColors[course.status] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={course.id} style={styles.tr}>
                  <td style={styles.td}>{course.name}</td>
                  <td style={styles.td}>{course.teacher}</td>
                  <td style={styles.td}>¥{Number(course.price).toLocaleString()}</td>
                  <td style={styles.td}>{course.totalStudents}</td>
                  <td style={styles.td}>{course.capacity}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>
                      {course.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {course.status === '招生中' ? (
                      <button
                        style={styles.advanceBtn}
                        onClick={() => markFull(course)}
                        disabled={busy}
                      >
                        标记已满
                      </button>
                    ) : (
                      <span style={styles.actionPlaceholder}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {courses.length === 0 && (
              <tr>
                <td colSpan={7} style={styles.td}>暂无课程</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.form} onSubmit={submitCourse}>
        <h3 style={styles.formTitle}>新增课程</h3>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="课程名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="讲师"
            value={form.teacher}
            onChange={(e) => setForm({ ...form, teacher: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="价格"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="学员数"
            type="number"
            value={form.totalStudents}
            onChange={(e) => setForm({ ...form, totalStudents: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="容量"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            提交
          </button>
        </div>
      </form>
    </div>
  );
}
