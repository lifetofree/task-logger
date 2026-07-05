import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client.js';
import { daysAgoISO } from '../lib/date.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

export default function HistoryView() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.history();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sevenDayCutoff = daysAgoISO(7);

  // Recent entries: last 7 days
  const recentEntries = useMemo(() => {
    return entries.filter((e) => e.log_date >= sevenDayCutoff);
  }, [entries, sevenDayCutoff]);

  // Search results: all entries matching query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.log_date.includes(q) ||
      e.happiness.toString().includes(q) ||
      e.progress.toString().includes(q)
    );
  }, [entries, searchQuery]);

  // Group by month → date (nested)
  function groupByMonthAndDate(items) {
    const monthMap = new Map();
    for (const entry of items) {
      const monthKey = entry.log_date.slice(0, 7);
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
      const dateMap = monthMap.get(monthKey);
      const dateKey = entry.log_date;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey).push(entry);
    }
    return [...monthMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, dateMap]) => {
        const dateGroups = [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        return [monthKey, dateGroups];
      });
  }

  function renderEntry(entry) {
    return (
      <div key={entry.id} className="entry-item">
        <div className="entry-main">
          <p className="entry-name">{entry.name}</p>
          <div className="entry-meta">
            <span className="chip happy-chip">😊 {entry.happiness}/10</span>
            <span className="chip progress-chip">📊 {Math.round(entry.progress * 10)}%</span>
          </div>
        </div>
      </div>
    );
  }

  function formatDateHeader(dateStr) {
    // dateStr = 'YYYY-MM-DD'. Show e.g. "Mon 15" with weekday + day.
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const weekday = WEEKDAY_NAMES[date.getUTCDay()];
    return `${weekday} ${d}`;
  }

  function renderMonthGroups(items) {
    return groupByMonthAndDate(items).map(([monthKey, dateGroups]) => {
      const [year, month] = monthKey.split('-');
      const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
      return (
        <div key={monthKey} className="history-month">
          <h4 className="history-month-header">{monthName} {year}</h4>
          {dateGroups.map(([dateKey, dayEntries]) => (
            <div key={dateKey} className="history-date">
              <h5 className="history-date-header">{formatDateHeader(dateKey)}</h5>
              <div className="entry-list">
                {dayEntries.map(renderEntry)}
              </div>
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <div className="view">
      <div className="history-toolbar">
        <h3 className="section-title">History</h3>
        <div className="form-row">
          <input
            className="input"
            type="text"
            placeholder="Search older entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : searchQuery.trim() ? (
        // Search mode
        searchResults.length === 0 ? (
          <div className="empty-state">No matching entries found.</div>
        ) : (
          renderMonthGroups(searchResults)
        )
      ) : (
        // Default mode: last 7 days
        recentEntries.length === 0 ? (
          <div className="empty-state">No entries in the last 7 days.</div>
        ) : (
          renderMonthGroups(recentEntries)
        )
      )}
    </div>
  );
}
