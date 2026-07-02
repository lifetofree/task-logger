import React from 'react';

/**
 * Streak card for TodayView.
 * Hero number layout: big "Day N" focal point, stat tiles below, subtle nudge.
 * Renders nothing until streak data is loaded.
 */
export default function StreakCard({ streak }) {
  if (!streak) return null;
  const { currentStreak, longestStreak, daysLoggedThisYear, loggedToday } = streak;

  const hint = loggedToday
    ? null
    : currentStreak > 0
      ? 'Log today to keep it alive'
      : 'Log today to start your streak';

  return (
    <div className="card streak-card">
      <div className="streak-hero">
        <span className="streak-flame" role="img" aria-label="streak">🔥</span>
        <span className="streak-day">{currentStreak}</span>
        <span className="streak-day-label">day{currentStreak === 1 ? '' : 's'}</span>
      </div>
      {hint && <p className="streak-hint">{hint}</p>}
      <div className="streak-tiles">
        <div className="streak-tile">
          <span className="streak-tile-value">{longestStreak}</span>
          <span className="streak-tile-label">Best</span>
        </div>
        <div className="streak-tile">
          <span className="streak-tile-value">{daysLoggedThisYear}</span>
          <span className="streak-tile-label">This year</span>
        </div>
      </div>
    </div>
  );
}
