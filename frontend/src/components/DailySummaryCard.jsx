import React from 'react';

function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toFixed(1);
}

export default function DailySummaryCard({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title">Daily Summary</h3>
        <div className="empty-state">No entries yet for this day.</div>
      </div>
    );
  }
  const count = entries.length;
  const avgHappiness =
    entries.reduce((sum, e) => sum + e.happiness, 0) / count;
  const avgProgress =
    entries.reduce((sum, e) => sum + e.progress, 0) / count;
  const completed = entries.filter((e) => e.progress === 5).length;
  const successRate = Math.round((completed / count) * 100);

  return (
    <div className="card">
      <h3 className="section-title">Daily Summary</h3>
      <div className="summary-grid">
        <div className="summary-stat">
          <span className="value">{count}</span>
          <span className="label">Entries</span>
        </div>
        <div className="summary-stat">
          <span className="value">{formatNumber(avgHappiness)}</span>
          <span className="label">Avg Happy</span>
        </div>
        <div className="summary-stat">
          <span className="value">{formatNumber(avgProgress)}</span>
          <span className="label">Avg Progress</span>
        </div>
        <div className="summary-stat" style={{ gridColumn: '1 / -1' }}>
          <span className="value">{successRate}%</span>
          <span className="label">Success Rate</span>
        </div>
      </div>
    </div>
  );
}
