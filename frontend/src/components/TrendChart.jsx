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
          <CartesianGrid strokeDasharray="3 3" stroke="#c8b090" />
          <XAxis dataKey="label" stroke="#7c5e38" fontSize={11} />
          <YAxis domain={[0, 10]} stroke="#7c5e38" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#ecddd0', border: '1px solid #c8b090', borderRadius: 8 }}
            labelStyle={{ color: '#2b1e0c' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="avgHappiness" name="Happiness" stroke="#b86020" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="avgProgress" name="Progress" stroke="#50823c" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
