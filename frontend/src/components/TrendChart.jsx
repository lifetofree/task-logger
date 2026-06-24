import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function TrendChart({ data }) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
          <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="avgHappiness" name="Happiness" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="avgProgress" name="Progress" stroke="#4ade80" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
