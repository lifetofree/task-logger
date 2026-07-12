import React, { useMemo, useRef, useEffect, useState } from 'react';

const LIFE_YEARS = 80;
const DAYS_PER_ROW = 28; // 4 weeks per row

const QUOTES = [
  // Marcus Aurelius — Meditations
  'You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius',
  'Do not act as if you had ten thousand years to live. — Marcus Aurelius',
  'Think of yourself as dead. You have lived your life. Now take what is left and live it properly. — Marcus Aurelius',
  'Waste no more time arguing about what a good man should be. Be one. — Marcus Aurelius',
  'It is not death that a man should fear, but he should fear never beginning to live. — Marcus Aurelius',
  'Very little is needed to make a happy life; it is all within yourself, in your way of thinking. — Marcus Aurelius',
  'The happiness of your life depends upon the quality of your thoughts. — Marcus Aurelius',
  'Live a good life. If there are gods and they are just, they will welcome you for the virtues you have lived. — Marcus Aurelius',
  'Confine yourself to the present. — Marcus Aurelius',
  'The best revenge is to be unlike him who performed the injury. — Marcus Aurelius',
  'Accept the things to which fate binds you, and love the people with whom fate brings you together. — Marcus Aurelius',
  'Dwell on the beauty of life. Watch the stars, and see yourself running with them. — Marcus Aurelius',
  'When you arise in the morning, think of what a precious privilege it is to be alive. — Marcus Aurelius',
  'The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane. — Marcus Aurelius',
  'Death smiles at us all; let us smile back. — Marcus Aurelius',

  // Seneca — Letters from a Stoic / On the Shortness of Life
  'It is not that we have a short time to live, but that we waste much of it. — Seneca',
  'The whole future lies in uncertainty: live immediately. — Seneca',
  'Let us prepare our minds as if we had come to the very end of life. — Seneca',
  'He who fears death will never do anything worthy of a living man. — Seneca',
  'While we wait for life, life passes. — Seneca',
  'We suffer more often in imagination than in reality. — Seneca',
  'Every new beginning comes from some other beginning\'s end. — Seneca',
  'Luck is what happens when preparation meets opportunity. — Seneca',
  'As is a tale, so is life: not how long it is, but how good it is, is what matters. — Seneca',
  'If a man knows not to which port he sails, no wind is favorable. — Seneca',
  'Wherever there is a human being, there is an opportunity for a kindness. — Seneca',
  'We are more often frightened than hurt; and we suffer more from imagination than from reality. — Seneca',
  'Begin at once to live, and count each separate day as a separate life. — Seneca',
  'Life is like a play: it matters not how long the script is, but how well it is acted. — Seneca',

  // Epictetus — Enchiridion / Discourses
  'It\'s not what happens to you, but how you react to it that matters. — Epictetus',
  'Wealth consists not in having great possessions, but in having few wants. — Epictetus',
  'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has. — Epictetus',
  'Make the best use of what is in your power, and take the rest as it happens. — Epictetus',
  'No man is free who is not master of himself. — Epictetus',
  'Don\'t explain your philosophy. Embody it. — Epictetus',
  'First say to yourself what you would be; and then do what you have to do. — Epictetus',
  'Circumstances don\'t make the man, they only reveal him to himself. — Epictetus',
  'If you want to improve, be content to be thought foolish and stupid. — Epictetus',
  'Any person capable of angering you becomes your master. — Epictetus',
  'Other people\'s views and troubles can be contagious. Don\'t sabotage yourself by unwittingly adopting negative attitudes. — Epictetus',

  // Zeno / Cleanthes / Musonius Rufus — founders and Roman Stoics
  'We have two ears and one mouth, so we should listen more than we say. — Zeno of Citium',
  'Man conquers the world by conquering himself. — Zeno of Citium',
  'Well-being is attained by small steps, but is truly no small thing. — Zeno of Citium',
  'The chief task in life is simply this: to identify and separate matters. — Epictetus',
];

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

  const livedDays = allDays.filter((d) => d.isPast || d.isToday).length;

  // Pick a random quote (stable per session)
  const quote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

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

  // Auto-scroll to show 9 rows before today + today row
  const gridRef = useRef(null);
  const todayRowRef = useRef(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    // Mark ready after data loads to trigger scroll
    if (allDays.length > 0 && heatmapData !== undefined) {
      const t = setTimeout(() => setDataReady(true), 150);
      return () => clearTimeout(t);
    }
  }, [allDays.length, heatmapData]);

  useEffect(() => {
    if (!dataReady) return;
    if (todayRowIndex < 0) return;

    // Compute scroll position from row index directly
    // Each row has fixed height = cell height + 2px gap
    // We want today's row to be the 10th visible row (9 rows above it)
    const cellEl = gridRef.current?.querySelector('.mm-row');
    if (!cellEl || !gridRef.current) return;

    const rowHeight = cellEl.offsetHeight + 2; // 2px margin-bottom
    const targetTop = todayRowIndex * rowHeight - rowHeight * 9;
    gridRef.current.scrollTop = Math.max(0, targetTop);
  }, [dataReady, todayRowIndex]);

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
        </div>
        <p className="memento-quote">{quote}</p>
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
    </>
  );
}
