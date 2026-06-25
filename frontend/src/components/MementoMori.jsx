import React, { useMemo, useRef, useEffect } from 'react';

const LIFE_YEARS = 80;
const DAYS_PER_ROW = 28; // 4 weeks per row

function isoDate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
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
  return `rgb(${lerp(s0.r, s1.r, localT)}, ${lerp(s0.g, s1.g, localT)}, ${lerp(s0.b, s1.b, localT)})`;
}

function buildDays(birthday) {
  if (!birthday) return [];
  const bd = new Date(birthday + 'T00:00:00');
  if (isNaN(bd.getTime())) return [];
  const todayStr = isoDate(new Date());

  const totalDays = LIFE_YEARS * 365;
  const days = [];
  for (let d = 0; d < totalDays; d++) {
    const dayDate = new Date(bd);
    dayDate.setDate(bd.getDate() + d);
    const dayStr = isoDate(dayDate);
    days.push({
      date: dayStr,
      dayIndex: d,
      isPast: dayStr < todayStr,
      isFuture: dayStr > todayStr,
      isToday: dayStr === todayStr,
    });
  }
  return days;
}

export default function MementoMori({ heatmapData, birthday }) {
  const happinessMap = useMemo(() => {
    const map = {};
    for (const d of heatmapData || []) {
      map[d.date] = d.happiness;
    }
    return map;
  }, [heatmapData]);

  const allDays = useMemo(() => buildDays(birthday), [birthday]);

  const bd = birthday ? new Date(birthday + 'T00:00:00') : null;
  const endYear = bd ? bd.getFullYear() + LIFE_YEARS - 1 : null;

  const totalDays = allDays.length;
  const livedDays = allDays.filter((d) => d.isPast || d.isToday).length;
  const remainingDays = totalDays - livedDays;
  const loggedDays = Object.keys(happinessMap).length;

  const happinessValues = Object.values(happinessMap).filter((v) => v != null);
  const avgHappiness = happinessValues.length > 0
    ? happinessValues.reduce((s, v) => s + v, 0) / happinessValues.length
    : null;

  // Find today's row index for auto-scroll
  const todayRowIndex = useMemo(() => {
    const idx = allDays.findIndex((d) => d.isToday);
    return idx >= 0 ? Math.floor(idx / DAYS_PER_ROW) : -1;
  }, [allDays]);

  // Split days into rows of 28
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < allDays.length; i += DAYS_PER_ROW) {
      result.push(allDays.slice(i, i + DAYS_PER_ROW));
    }
    return result;
  }, [allDays]);

  // Auto-scroll to today's row
  const gridRef = useRef(null);
  const todayRowRef = useRef(null);

  useEffect(() => {
    if (todayRowRef.current && gridRef.current) {
      const grid = gridRef.current;
      const row = todayRowRef.current;
      const scrollTop = row.offsetTop - grid.clientHeight / 2 + row.clientHeight / 2;
      grid.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [allDays.length]);

  if (!birthday || allDays.length === 0) {
    return (
      <div className="card memento-card">
        <h3 className="section-title">Memento Mori</h3>
        <div className="empty-state">No birthday set. Sign up with a birthday to see your life grid.</div>
      </div>
    );
  }

  const bdFormatted = bd.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* TOP BLOCK: Stats */}
      <div className="card memento-top">
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
            <span className="memento-stat-num">{avgHappiness != null ? avgHappiness.toFixed(1) : '—'}</span>
            <span className="memento-stat-label">avg happy</span>
          </div>
        </div>
        <p className="memento-intro">
          Each row is 4 weeks (28 days). {LIFE_YEARS} years from {bdFormatted} to {endYear}.
        </p>
        <div className="memento-happiness-legend">
          <span className="legend-text">1</span>
          <div className="legend-bar" />
          <span className="legend-text">10</span>
        </div>
      </div>

      {/* CENTER BLOCK: Grid */}
      <div className="card memento-center">
        <div className="memento-days-scroll" ref={gridRef}>
          {rows.map((row, ri) => {
            const hasToday = row.some((d) => d.isToday);
            return (
              <div
                key={ri}
                className="mm-row"
                ref={hasToday ? todayRowRef : undefined}
              >
                {row.map((day, di) => {
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
                            : `${day.date}`
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BLOCK: Quote */}
      <div className="card memento-bottom">
        <p className="memento-quote">
          "You could leave life right now. Let that determine what you do and say and think."
        </p>
      </div>
    </>
  );
}
