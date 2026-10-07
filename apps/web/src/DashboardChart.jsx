import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CHART_COLORS = {
  newLeads: '#3b82f6',
  revenue: '#10b981',
  activeStudents: '#f59e0b',
};

export default function DashboardChart({ records }) {
  const data = Array.isArray(records)
    ? records.map((r) => ({
        date: r.date,
        newLeads: Number(r.newLeads ?? 0),
        revenue: Number(r.revenue ?? 0),
        activeStudents: Number(r.activeStudents ?? 0),
      }))
    : [];

  const containerStyle = {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginBottom: 20,
    padding: 16,
  };

  const titleStyle = {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px',
  };

  const emptyStyle = {
    padding: 32,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    height: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (data.length === 0) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>趋势图</h3>
        <div style={emptyStyle}>暂无数据</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>趋势图</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              label={{
                value: '收入',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#64748b' },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              label={{
                value: '新线索 / 日均活跃',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 12, fill: '#64748b' },
              }}
            />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 8, fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="收入"
              stroke={CHART_COLORS.revenue}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="newLeads"
              name="新线索"
              stroke={CHART_COLORS.newLeads}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeStudents"
              name="日均活跃"
              stroke={CHART_COLORS.activeStudents}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
