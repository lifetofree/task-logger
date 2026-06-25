import React, { useMemo } from 'react';

const WEEKS_PER_YEAR = 52;
const YEARS = 40;

function weekStartDate(year, weekIndex) {
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = weekIndex * 7;
  const d = new Date(year, 0, 1 + dayOfYear);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function scoreToLevel(score) {
  if (score == null) return null;
  if (score >= 9) return 5;
  if (score >= 7.5) return 4;
  if (score >= 6) return 3;
  if (score >= 4.5) return 2;
  if (score >= 3) return 1;
  return 1;
}

function getStartMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildWeeks() {
  const startMonth = getStartMonth();
  const startYear = startMonth.getFullYear();
  const todayStr = isoDate(new Date());

  const weeks = [];
  for (let y = 0; y < YEARS; y++) {
    const year = startYear + y;
    const yearWeeks = [];
    for (let w = 0; w < WEEKS_PER_YEAR; w++) {
      const weekStart = weekStartDate(year, w);
      const weekStartStr = isoDate(weekStart);
      const isPast = weekStartStr < todayStr;
      const isFuture = weekStartStr > todayStr;
      const isThisWeek = !isPast && !isFuture;

      // Only include weeks from the start of this month in year 0
      if (y === 0 && weekStart < startMonth) {
        yearWeeks.push(null);
        continue;
      }

      yearWeeks.push({
        date: weekStartStr,
        year,
        weekIndex: w,
        isPast,
        isFuture,
        isThisWeek,
      });
    }
    weeks.push({ year, weeks: yearWeeks });
  }
  return weeks;
}

export default function MementoMori({ heatmapData }) {
  const scoreMap = useMemo(() => {
    const map = {};
    for (const d of heatmapData || []) {
      map[d.date] = d.score;
    }
    return map;
  }, [heatmapData]);

  const years = useMemo(() => buildWeeks(), []);
  const todayStr = isoDate(new Date());
  const startMonth = getStartMonth();
  const endDate = new Date(startMonth.getFullYear() + YEARS - 1, 11, 31);

  const totalWeeks = YEARS * WEEKS_PER_YEAR;
  const livedWeeks = years.reduce((sum, yr) => {
    return sum + yr.weeks.filter((w) => w && (w.isPast || w.isThisWeek)).length;
  }, 0);
  const remainingWeeks = totalWeeks - livedWeeks;

  return (
    <div className="card memento-card">
      <h3 className="section-title">Memento Mori</h3>
      <p className="memento-intro">
        Each square is one week. This grid shows the next {YEARS} years,
        from {startMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {endDate.getFullYear()}.
      </p>

      <div className="memento-stats">
        <div className="memento-stat">
          <span className="memento-stat-num">{livedWeeks}</span>
          <span className="memento-stat-label">weeks passed</span>
        </div>
        <div className="memento-stat">
          <span className="memento-stat-num">{remainingWeeks}</span>
          <span className="memento-stat-label">weeks ahead</span>
        </div>
      </div>

      <div className="memento-grid" role="img" aria-label="Life in weeks grid">
        {years.map((yr, yi) => (
          <div key={yi} className="memento-row">
            <span className="memento-year-label">{yr.year}</span>
            <div className="memento-weeks">
              {yr.weeks.map((wk, wi) => {
                if (!wk) {
                  return <div key={wi} className="memento-cell empty-slot" style={{ visibility: 'hidden' }} />;
                }
                const score = scoreMap[wk.date];
                const level = scoreToLevel(score);
                const hasData = score != null;
                const classes = ['memento-cell'];
                if (wk.isFuture) classes.push('future');
                else if (hasData) classes.push('logged');
                else if (wk.isPast || wk.isThisWeek) classes.push('lived');
                if (wk.isThisWeek) classes.push('this-week');
                if (level != null) classes.push(`level-${level}`);

                return (
                  <div
                    key={wi}
                    className={classes.join(' ')}
                    title={
                      hasData
                        ? `${wk.date}: score ${score.toFixed(1)}`
                        : wk.isFuture
                          ? `${wk.date} (future)`
                          : wk.date
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="memento-legend">
        <div className="legend-item">
          <div className="legend-swatch lived" />
          <span>Lived</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch level-3" />
          <span>Logged</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch future" />
          <span>Future</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch this-week" />
          <span>Now</span>
        </div>
      </div>

      <p className="memento-quote">
        "You could leave life right now. Let that determine what you do and say and think."
      </p>
    </div>
  );
}
