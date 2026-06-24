import React, { useState } from 'react';
import { api } from '../api/client.js';

const HAPPINESS_LABELS = ['Awful', 'Bad', 'Meh', 'OK', 'Good', 'Great', 'Happy', 'Joyful', 'Amazing', 'Perfect'];

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
        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="slider-header">
            <label style={{ fontSize: 12 }}>Happiness</label>
            <span className="slider-value happy">{happiness}/10 <span className="slider-sub">{HAPPINESS_LABELS[happiness - 1]}</span></span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={happiness}
            onChange={(e) => setHappiness(Number(e.target.value))}
            className="slider slider-happy"
          />
        </div>
        <div className="form-row">
          <div className="slider-header">
            <label style={{ fontSize: 12 }}>Progress</label>
            <span className="slider-value progress">{progress * 10}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="slider slider-progress"
          />
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
          <span className="chip happy-chip">😊 {entry.happiness}/10</span>
          <span className="chip progress-chip">📊 {entry.progress * 10}%</span>
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
