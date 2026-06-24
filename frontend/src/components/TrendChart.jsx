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
          <CartesianGrid strokeDasharray="3 3" stroke="#5c4e36" />
          <XAxis dataKey="label" stroke="#b8a884" fontSize={11} />
          <YAxis domain={[0, 10]} stroke="#b8a884" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#3d3220', border: '1px solid #5c4e36', borderRadius: 8 }}
            labelStyle={{ color: '#f5ebd6' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="avgHappiness" name="Happiness" stroke="#d4a056" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="avgProgress" name="Progress" stroke="#8aa867" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
