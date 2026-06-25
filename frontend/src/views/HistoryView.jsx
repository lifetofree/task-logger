import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function HistoryView() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Group by month: "2026-06" -> [entries]
  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const monthKey = entry.log_date.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey).push(entry);
    }
    // Sort by month desc
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <div className="view">
      <h3 className="section-title">History</h3>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No entries yet.</div>
      ) : (
        grouped.map(([monthKey, monthEntries]) => {
          const [year, month] = monthKey.split('-');
          const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
          return (
            <div key={monthKey} className="history-month">
              <h4 className="history-month-header">{monthName} {year}</h4>
              <div className="entry-list">
                {monthEntries.map((entry) => (
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
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
