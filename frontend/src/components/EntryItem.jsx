import React, { useState } from 'react';
import { HAPPINESS_EMOJIS, PROGRESS_LABELS } from './EntryForm.jsx';
import { api } from '../api/client.js';

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function EntryItem({ entry, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.name);
  const [happiness, setHappiness] = useState(entry.happiness);
  const [progress, setProgress] = useState(entry.progress);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const updated = await api.updateEntry(entry.id, { name, happiness, progress });
      onChanged(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError('');
    try {
      await api.deleteEntry(entry.id);
      onDeleted(entry.id);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <div className="entry-item editing">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <div className="form-row">
          <label style={{ fontSize: 12 }}>Happiness</label>
          <div className="rating-row">
            {HAPPINESS_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                type="button"
                className={`rating-btn emoji ${happiness === i + 1 ? 'selected' : ''}`}
                onClick={() => setHappiness(i + 1)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label style={{ fontSize: 12 }}>Progress</label>
          <div className="rating-row">
            {PROGRESS_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                className={`rating-btn level ${progress === i + 1 ? 'selected' : ''}`}
                onClick={() => setProgress(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="edit-actions">
          <button className="btn-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-item">
      <div className="entry-main">
        <p className="entry-name">{entry.name}</p>
        <div className="entry-meta">
          <span className="chip">{HAPPINESS_EMOJIS[entry.happiness - 1]}</span>
          <span className="chip">P{entry.progress}</span>
          <span>{formatTime(entry.created_at)}</span>
        </div>
        {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
      </div>
      <div className="entry-actions">
        {confirming ? (
          <>
            <button className="icon-btn" onClick={() => setConfirming(false)} aria-label="Cancel delete">
              ×
            </button>
            <button
              className="icon-btn danger"
              onClick={handleDelete}
              aria-label="Confirm delete"
              title="Confirm delete"
            >
              ✓
            </button>
          </>
        ) : (
          <>
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit">
              ✎
            </button>
            <button className="icon-btn danger" onClick={() => setConfirming(true)} aria-label="Delete">
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
