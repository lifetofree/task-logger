import React, { useMemo } from 'react';

const LIFE_YEARS = 80;

function isoDate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInYear(y) {
  return isLeapYear(y) ? 366 : 365;
}

// Happiness slider gradient stops (must match .slider-happy CSS)
const HAPP_STOPS = [
  { t: 1, r: 0xe0, g: 0x68, b: 0x58 },
  { t: 5.5, r: 0xe8, g: 0xa8, b: 0x38 },
  { t: 10, r: 0x6a, g: 0xb8, b: 0x48 },
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function happinessToColor(h) {
  if (h == null) return null;
  const clamped = Math.max(1, Math.min(10, h));
  let i = 0;
  while (i < HAPP_STOPS.length - 1 && clamped > HAPP_STOPS[i + 1].t) i++;
  const s0 = HAPP_STOPS[i];
  const s1 = HAPP_STOPS[i + 1] || s0;
  const range = s1.t - s0.t || 1;
  const localT = (clamped - s0.t) / range;
  const r = lerp(s0.r, s1.r, localT);
  const g = lerp(s0.g, s1.g, localT);
  const b = lerp(s0.b, s1.b, localT);
  return `rgb(${r}, ${g}, ${b})`;
}

function buildDays(birthday) {
  if (!birthday) return [];
  const bd = new Date(birthday + 'T00:00:00');
  if (isNaN(bd.getTime())) return [];
  const todayStr = isoDate(new Date());
  const years = [];

  for (let y = 0; y < LIFE_YEARS; y++) {
    const year = bd.getFullYear() + y;
    const yearStart = new Date(year, bd.getMonth(), bd.getDate());
    const total = daysInYear(yearStart.getFullYear());
    // For year 0, start from birthday; otherwise from birthday month/day
    const days = [];

    for (let d = 0; d < 365; d++) {
      const dayDate = new Date(yearStart);
      dayDate.setDate(yearStart.getDate() + d);
      if (dayDate.getFullYear() !== yearStart.getFullYear() && d > 0) {
        // crossed into next calendar year, but that's fine - we track by birthday anniversary
      }

      const dayStr = isoDate(dayDate);
      const isPast = dayStr < todayStr;
      const isFuture = dayStr > todayStr;
      const isToday = dayStr === todayStr;

      days.push({
        date: dayStr,
        isPast,
        isFuture,
        isToday,
        ageYear: y,
      });
    }

    years.push({ yearLabel: `${year}`, yearIndex: y, days });
  }

  return years;
}

export default function MementoMori({ heatmapData, birthday }) {
  const happinessMap = useMemo(() => {
    const map = {};
    for (const d of heatmapData || []) {
      map[d.date] = d.happiness;
    }
    return map;
  }, [heatmapData]);

  const yearsData = useMemo(() => buildDays(birthday), [birthday]);
  const todayStr = isoDate(new Date());

  const bd = birthday ? new Date(birthday + 'T00:00:00') : null;
  const endYear = bd ? bd.getFullYear() + LIFE_YEARS - 1 : null;

  const totalDays = yearsData.reduce((s, y) => s + y.days.length, 0);
  const livedDays = yearsData.reduce((s, y) => {
    return s + y.days.filter((d) => d.isPast || d.isToday).length;
  }, 0);
  const remainingDays = totalDays - livedDays;
  const loggedDays = Object.keys(happinessMap).length;

  if (!birthday || yearsData.length === 0) {
    return (
      <div className="card memento-card">
        <h3 className="section-title">Memento Mori</h3>
        <div className="empty-state">No birthday set. Sign up with a birthday to see your life grid.</div>
      </div>
    );
  }

  const bdFormatted = bd.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="card memento-card">
      <h3 className="section-title">Memento Mori</h3>
      <p className="memento-intro">
        Each square is one day. {LIFE_YEARS} years from your birthday ({bdFormatted}) to {endYear}.
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
            <span className="memento-year-label">{yr.yearLabel}</span>
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
