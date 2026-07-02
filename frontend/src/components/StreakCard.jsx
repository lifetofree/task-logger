import React from 'react';

/**
 * Compact streak banner shown on TodayView as a daily nudge.
 * Renders nothing until streak data is loaded.
 */
export default function StreakCard({ streak }) {
  if (!streak) return null;
  const { currentStreak, longestStreak, daysLoggedThisYear, loggedToday } = streak;

  return (
    <div className="card streak-card">
      <div className="streak-current">
        <span className="streak-flame" role="img" aria-label="streak">🔥</span>
        <span className="streak-day">Day {currentStreak}</span>
        {!loggedToday && currentStreak > 0 && (
          <span className="streak-hint">— log today to keep it alive</span>
        )}
        {!loggedToday && currentStreak === 0 && (
          <span className="streak-hint">— log today to start</span>
        )}
      </div>
      <div className="streak-stats">
        <span title="Longest streak">Best: <strong>{longestStreak}</strong></span>
        <span title="Days logged this year">This year: <strong>{daysLoggedThisYear}</strong></span>
      </div>
    </div>
  );
}
