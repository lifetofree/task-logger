import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { todayISO, daysAgoISO } from '../lib/date.js';

/**
 * Weekly reflection digest shown on TodayView.
 * Reuses the existing /api/insights/daily endpoint (no backend change).
 * Compares the last 7 days against the prior 7 days.
 * Focuses on happiness (matches Memento Mori color scale); progress/success
 * metrics are intentionally not surfaced here.
 */
export default function WeeklyDigest() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const to = todayISO();
        const from = daysAgoISO(13); // 14-day window
        const data = await api.daily(from, to);
        if (cancelled) return;

        const today = todayISO();
        const thisWeekStart = daysAgoISO(6);
        const lastWeekStart = daysAgoISO(13);
        const lastWeekEnd = daysAgoISO(7);

        const inRange = (d, lo, hi) => d >= lo && d <= hi;
        const thisWeek = data.filter((d) => inRange(d.date, thisWeekStart, today));
        const lastWeek = data.filter((d) => inRange(d.date, lastWeekStart, lastWeekEnd));

        const avg = (arr) =>
          arr.length === 0
            ? null
            : Math.round(
                (arr.reduce((s, d) => s + (d.avgHappiness || 0), 0) / arr.length) * 100,
              ) / 100;

        const thisAvg = avg(thisWeek);
        const lastAvg = avg(lastWeek);
        const delta = thisAvg != null && lastAvg != null
          ? Math.round((thisAvg - lastAvg) * 100) / 100
          : null;

        const best = thisWeek.length
          ? thisWeek.reduce((m, d) => (d.avgHappiness > m.avgHappiness ? d : m))
          : null;

        if (!cancelled) {
          setSummary({
            daysThisWeek: thisWeek.length,
            thisAvg,
            delta,
            best,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null; // silent — digest is non-critical
  if (!summary) return null;

  const { daysThisWeek, thisAvg, delta, best } = summary;

  // Nothing logged this week yet — don't show an empty digest.
  if (daysThisWeek === 0) return null;

  const deltaUp = delta != null && delta > 0;
  const deltaDown = delta != null && delta < 0;
  const deltaFlat = delta != null && delta === 0;

  return (
    <div className="card digest-card">
      <h4 className="digest-title">This Week</h4>
      <div className="digest-grid">
        <div className="digest-stat">
          <span className="digest-stat-value">{daysThisWeek}</span>
          <span className="digest-stat-label">day{daysThisWeek === 1 ? '' : 's'} logged</span>
        </div>
        <div className="digest-stat">
          <span className="digest-stat-value">
            {thisAvg != null ? thisAvg.toFixed(1) : '—'}
          </span>
          <span className="digest-stat-label">avg happiness</span>
          {delta != null && (
            <span className={`digest-delta ${deltaUp ? 'up' : deltaDown ? 'down' : 'flat'}`}>
              {deltaUp ? '↑' : deltaDown ? '↓' : '→'} {Math.abs(delta).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {best && (
        <p className="digest-footer">
          Best day: {formatDate(best.date)} ({best.avgHappiness.toFixed(1)})
        </p>
      )}
    </div>
  );
}

function formatDate(iso) {
  const [, month, day] = iso.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}
