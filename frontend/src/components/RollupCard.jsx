import React from 'react';

function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toFixed(2);
}

export default function RollupCard({ rollup }) {
  if (!rollup) return null;
  const successPct = rollup.successRate != null ? Math.round(rollup.successRate * 100) : 0;
  return (
    <div className="card">
      <h3 className="section-title">{rollup.period === 'week' ? 'Last 7 Days' : 'Last 30 Days'}</h3>
      <div className="rollup-grid">
        <div className="rollup-stat">
          <span className="value">{rollup.count}</span>
          <span className="label">Entries</span>
        </div>
        <div className="rollup-stat">
          <span className="value">{successPct}%</span>
          <span className="label">Success</span>
        </div>
        <div className="rollup-stat">
          <span className="value">{formatNumber(rollup.avgHappiness)}</span>
          <span className="label">Avg Happy</span>
        </div>
        <div className="rollup-stat">
          <span className="value">{formatNumber(rollup.avgProgress)}</span>
          <span className="label">Avg Progress</span>
        </div>
      </div>
    </div>
  );
}
