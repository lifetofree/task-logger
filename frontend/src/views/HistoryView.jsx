import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

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

  // Group by month
  function groupByMonth(items) {
    const map = new Map();
    for (const entry of items) {
      const monthKey = entry.log_date.slice(0, 7);
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey).push(entry);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }

  function renderEntry(entry) {
    return (
      <div key={entry.id} className="entry-item">
        <div className="entry-main">
          <p className="entry-name">{entry.name}</p>
          <div className="entry-meta">
            <span className="chip happy-chip">😊 {entry.happiness}/10</span>
            <span className="chip progress-chip">📊 {entry.progress * 10}%</span>
            <span>{entry.log_date}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderMonthGroups(items) {
    return groupByMonth(items).map(([monthKey, monthEntries]) => {
      const [year, month] = monthKey.split('-');
      const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
      return (
        <div key={monthKey} className="history-month">
          <h4 className="history-month-header">{monthName} {year}</h4>
          <div className="entry-list">
            {monthEntries.map(renderEntry)}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="view">
      <h3 className="section-title">History</h3>

      <div className="form-row" style={{ position: 'sticky', top: 52, zIndex: 5, background: 'var(--bg)', paddingBottom: 8, paddingTop: 8 }}>
        <input
          className="input"
          type="text"
          placeholder="Search older entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
