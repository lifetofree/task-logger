import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { todayISO, daysAgoISO } from '../lib/date.js';

/**
 * Weekly reflection digest shown on TodayView.
 * Reuses the existing /api/insights/daily endpoint (no backend change).
 * Compares the last 7 days against the prior 7 days.
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

        const successRate = thisWeek.length
          ? Math.round(
              (thisWeek.reduce((s, d) => s + (d.successRate || 0), 0) / thisWeek.length) * 100,
            ) / 100
          : null;

        if (!cancelled) {
          setSummary({
            daysThisWeek: thisWeek.length,
            thisAvg,
            delta,
            best,
            successRate,
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

  const { daysThisWeek, thisAvg, delta, best, successRate } = summary;

  // Nothing logged this week yet — don't show an empty digest.
  if (daysThisWeek === 0) return null;

  const arrow = delta == null ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const deltaText = delta == null
    ? ''
    : ` ${arrow} ${Math.abs(delta).toFixed(1)} vs last week`;
  const bestText = best ? ` · best: ${best.date.slice(5)} (${best.avgHappiness})` : '';

  return (
    <div className="card digest-card">
      <div className="digest-line">
        <strong>This week:</strong> {daysThisWeek} day{daysThisWeek === 1 ? '' : 's'} logged
        {thisAvg != null && `, avg happiness ${thisAvg.toFixed(1)}${deltaText}`}
        {bestText}
      </div>
      {successRate != null && (
        <div className="digest-sub">
          Success rate: {Math.round(successRate * 100)}%
        </div>
      )}
    </div>
  );
}
