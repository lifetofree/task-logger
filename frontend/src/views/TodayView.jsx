import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import EntryForm from '../components/EntryForm.jsx';
import EntryItem from '../components/EntryItem.jsx';
import StreakCard from '../components/StreakCard.jsx';
import WeeklyDigest from '../components/WeeklyDigest.jsx';
import { todayISO } from '../lib/date.js';

export default function TodayView() {
  const [logDate, setLogDate] = useState(todayISO());
  const [entries, setEntries] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listEntries(logDate);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logDate]);

  const loadStreak = useCallback(async () => {
    try {
      const data = await api.streak();
      setStreak(data);
    } catch {
      // streak is non-critical; leave whatever we had
    }
  }, []);

  useEffect(() => {
    loadEntries();
    loadStreak();
  }, [loadEntries, loadStreak]);

  async function handleCreate(payload) {
    setSubmitting(true);
    try {
      const created = await api.createEntry(payload);
      if (payload.log_date === logDate) {
        setEntries((prev) => [created, ...prev]);
      }
      if (payload.log_date !== logDate) {
        setLogDate(payload.log_date);
      }
      // Streak may have changed (logged today, extended run).
      loadStreak();
    } finally {
      setSubmitting(false);
    }
  }

  function handleChanged(updated) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleDeleted(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    // Deleting today's entry could break the streak.
    loadStreak();
  }

  return (
    <div className="view">
      <StreakCard streak={streak} />
      <div className="today-spacer" />
      <EntryForm onSubmit={handleCreate} initialDate={logDate} submitting={submitting} />
      {error && <div className="error-banner">{error}</div>}
      <h3 className="section-title">Entries for {logDate}</h3>
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No entries yet. Log your first task above.</div>
      ) : (
        <div className="entry-list">
          {entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
      <div className="today-spacer" />
      <WeeklyDigest />
    </div>
  );
}
