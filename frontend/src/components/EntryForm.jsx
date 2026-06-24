import React, { useState } from 'react';

const HAPPINESS_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const PROGRESS_LABELS = ['Just started', 'Some', 'Halfway', 'Almost', 'Complete'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
          className="date-input"
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
        <label>How did you feel?</label>
        <div className="rating-row">
          {HAPPINESS_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              className={`rating-btn emoji ${happiness === i + 1 ? 'selected' : ''}`}
              onClick={() => setHappiness(i + 1)}
              aria-label={`Happiness ${i + 1}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <label>How much progress?</label>
        <div className="rating-row">
          {PROGRESS_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              className={`rating-btn level ${progress === i + 1 ? 'selected' : ''}`}
              onClick={() => setProgress(i + 1)}
              aria-label={`Progress ${label}`}
              title={label}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button className="submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Log Entry'}
      </button>
    </form>
  );
}

export { HAPPINESS_EMOJIS, PROGRESS_LABELS };
