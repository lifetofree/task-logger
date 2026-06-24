import React, { useMemo } from 'react';

function startOfYearUTC(year) {
  return new Date(Date.UTC(year, 0, 1));
}

function scoreToLevel(score) {
  if (score == null) return 0;
  if (score >= 4.5) return 5;
  if (score >= 3.75) return 4;
  if (score >= 3) return 3;
  if (score >= 2.25) return 2;
  if (score >= 1.5) return 1;
  return 0;
}

function dateRange(year) {
  const cells = [];
  const start = startOfYearUTC(year);
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startOffset = start.getUTCDay();
  const totalDays = Math.floor((todayUTC - start.getTime()) / 86400000) + 1;
  const weeks = Math.ceil((startOffset + totalDays) / 7);
  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const dayNum = idx - startOffset;
      if (dayNum < 0 || dayNum >= totalDays) {
        week.push(null);
      } else {
        const cellDate = new Date(start.getTime() + dayNum * 86400000);
        const iso = cellDate.toISOString().slice(0, 10);
        week.push(iso);
      }
    }
    cells.push(week);
  }
  return cells;
}

export default function Heatmap({ data, year }) {
  const cellMap = useMemo(() => {
    const map = {};
    for (const d of data || []) {
      map[d.date] = d.score;
    }
    return map;
  }, [data]);

  const weeks = useMemo(() => dateRange(year), [year]);
  const today = new Date().toISOString().slice(0, 10);

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title">Activity Heatmap</h3>
        <div className="empty-state">Log some entries to see your heatmap.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="section-title">Activity Heatmap ({year})</h3>
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="heatmap-week">
            {week.map((date, di) => {
              if (!date) {
                return <div key={di} className="heatmap-cell" style={{ visibility: 'hidden' }} />;
              }
              const score = cellMap[date];
              const level = scoreToLevel(score);
              const isFuture = date > today;
              return (
                <div
                  key={di}
                  className="heatmap-cell"
                  data-level={isFuture ? 0 : level}
                  title={isFuture ? date : `${date}: score ${score?.toFixed?.(2) ?? '—'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div key={l} className="cell" data-level={l} style={{ width: 12, height: 12, borderRadius: 2 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
