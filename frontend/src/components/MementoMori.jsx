import React, { useMemo } from 'react';

const YEARS = 40;

function isoDate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function getStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInYear(y) {
  return isLeapYear(y) ? 366 : 365;
}

function happinessToColor(h) {
  if (h == null) return null;
  // 1-10 scale mapped to warm earth tone gradient
  // low = pale/empty, high = deep amber
  if (h >= 9) return '#6e3810';
  if (h >= 8) return '#8a4818';
  if (h >= 7) return '#a05820';
  if (h >= 6) return '#b86020';
  if (h >= 5) return '#c87830';
  if (h >= 4) return '#d49048';
  if (h >= 3) return '#dca868';
  if (h >= 2) return '#e4c090';
  return '#e8d4b0';
}

function buildDays() {
  const startDate = getStartDate();
  const todayStr = isoDate(new Date());
  const years = [];

  for (let y = 0; y < YEARS; y++) {
    const year = startDate.getFullYear() + y;
    const yearStart = (y === 0)
      ? new Date(startDate)
      : new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const total = daysInYear(year);
    const days = [];

    for (let d = 0; d < total; d++) {
      const dayDate = new Date(yearStart);
      // For year 0, start from the actual month start
      if (y === 0) {
        // dayDate is already set to month start, offset by d
        dayDate.setDate(startDate.getDate() + d);
        if (dayDate.getFullYear() !== year) break;
      } else {
        dayDate.setDate(1 + d);
      }

      const dayStr = isoDate(dayDate);
      const isPast = dayStr < todayStr;
      const isFuture = dayStr > todayStr;
      const isToday = dayStr === todayStr;

      days.push({
        date: dayStr,
        year,
        isPast,
        isFuture,
        isToday,
      });
    }

    years.push({ year, days });
  }

  return years;
}

export default function MementoMori({ heatmapData }) {
  const happinessMap = useMemo(() => {
    const map = {};
    for (const d of heatmapData || []) {
      map[d.date] = d.happiness;
    }
    return map;
  }, [heatmapData]);

  const yearsData = useMemo(() => buildDays(), []);
  const todayStr = isoDate(new Date());
  const startDate = getStartDate();
  const endYear = startDate.getFullYear() + YEARS - 1;

  const totalDays = yearsData.reduce((s, y) => s + y.days.length, 0);
  const livedDays = yearsData.reduce((s, y) => {
    return s + y.days.filter((d) => d.isPast || d.isToday).length;
  }, 0);
  const remainingDays = totalDays - livedDays;
  const loggedDays = Object.keys(happinessMap).length;

  return (
    <div className="card memento-card">
      <h3 className="section-title">Memento Mori</h3>
      <p className="memento-intro">
        Each square is one day. {YEARS} years from {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {endYear}.
        Colored by your daily happiness.
      </p>

      <div className="memento-stats">
        <div className="memento-stat">
          <span className="memento-stat-num">{livedDays.toLocaleString()}</span>
          <span className="memento-stat-label">days lived</span>
        </div>
        <div className="memento-stat">
          <span className="memento-stat-num">{remainingDays.toLocaleString()}</span>
          <span className="memento-stat-label">days ahead</span>
        </div>
        <div className="memento-stat">
          <span className="memento-stat-num">{loggedDays}</span>
          <span className="memento-stat-label">days logged</span>
        </div>
      </div>

      <div className="memento-happiness-legend">
        <span className="legend-text">Happiness:</span>
        <div className="legend-bar" />
        <span className="legend-text">1</span>
        <span className="legend-text">10</span>
      </div>

      <div className="memento-days-scroll">
        {yearsData.map((yr, yi) => (
          <div key={yi} className="memento-year-row">
            <span className="memento-year-label">{yr.year}</span>
            <div className="memento-days-row">
              {yr.days.map((day, di) => {
                const happiness = happinessMap[day.date];
                const hasData = happiness != null;
                const bg = hasData ? happinessToColor(happiness) : undefined;

                const classes = ['mm-day'];
                if (day.isToday) classes.push('today');
                else if (day.isFuture) classes.push('future');
                else if (!hasData) classes.push('lived');

                return (
                  <div
                    key={di}
                    className={classes.join(' ')}
                    style={bg ? { background: bg } : undefined}
                    title={
                      hasData
                        ? `${day.date}: happiness ${happiness.toFixed(1)}/10`
                        : day.isFuture
                          ? `${day.date} (future)`
                          : `${day.date} (no entry)`
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="memento-quote">
        "You could leave life right now. Let that determine what you do and say and think."
      </p>
    </div>
  );
}
