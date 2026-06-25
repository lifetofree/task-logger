import React, { useState } from 'react';

const TIMEZONE_OFFSET = 7; // GMT+7

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

const HAPPINESS_LABELS = ['Awful', 'Bad', 'Meh', 'OK', 'Good', 'Great', 'Happy', 'Joyful', 'Amazing', 'Perfect'];
const PROGRESS_LABELS = ['1%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];

function happinessLabel(v) {
  if (v == null) return '';
  return HAPPINESS_LABELS[v - 1] || '';
}

function progressLabel(v) {
  if (v == null) return '';
  return PROGRESS_LABELS[v] || '';
}

export default function EntryForm({ onSubmit, initialDate, submitting }) {
  const [name, setName] = useState('');
  const [happiness, setHappiness] = useState(null);
  const [progress, setProgress] = useState(null);
  const [logDate, setLogDate] = useState(initialDate || todayISO());
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialDate) setLogDate(initialDate);
  }, [initialDate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter a task name');
      return;
    }
    if (happiness == null) {
      setError('Please rate your happiness');
      return;
    }
    if (progress == null) {
      setError('Please rate your progress');
      return;
    }
    try {
      await onSubmit({ name: name.trim(), happiness, progress, log_date: logDate });
      setName('');
      setHappiness(null);
      setProgress(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="log-date">Date</label>
        <input
          id="log-date"
          className="input"
          type="date"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          max={todayISO()}
        />
      </div>
      <div className="form-row">
        <label htmlFor="task-name">What did you work on?</label>
        <input
          id="task-name"
          className="input"
          type="text"
          placeholder="e.g. Fixed the login bug"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="form-row">
        <div className="slider-header">
          <label>How did you feel?</label>
          {happiness != null && (
            <span className="slider-value happy">{happiness}/10 <span className="slider-sub">{happinessLabel(happiness)}</span></span>
          )}
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={happiness ?? 5}
          onChange={(e) => setHappiness(Number(e.target.value))}
          className="slider slider-happy"
        />
      </div>
      <div className="form-row">
        <div className="slider-header">
          <label>How much progress?</label>
          {progress != null && (
            <span className="slider-value progress">{progress * 10}%</span>
          )}
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={progress ?? 5}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="slider slider-progress"
        />
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button className="submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Log Entry'}
      </button>
    </form>
  );
}
