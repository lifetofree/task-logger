import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import EntryForm from '../components/EntryForm.jsx';
import EntryItem from '../components/EntryItem.jsx';
import DailySummaryCard from '../components/DailySummaryCard.jsx';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayView() {
  const [logDate, setLogDate] = useState(todayISO());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
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

  useEffect(() => {
    load();
  }, [load]);

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
    } finally {
      setSubmitting(false);
    }
  }

  function handleChanged(updated) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleDeleted(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="view">
      <EntryForm onSubmit={handleCreate} initialDate={logDate} submitting={submitting} />
      <DailySummaryCard entries={entries} />
      {error && <div className="error-banner">{error}</div>}
      <div style={{ marginTop: 16 }}>
        <h3 className="section-title">Entries for {logDate}</h3>
      </div>
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
    </div>
  );
}
