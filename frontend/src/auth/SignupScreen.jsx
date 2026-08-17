import React, { useState } from 'react';
import { api, setSession } from '../api/client.js';
import { todayISO } from '../lib/date.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ onSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!birthday) {
      setError('Please enter your birthday.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.signup(email, password, birthday);
      setSession(data.token, data.user);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Create your account</h2>
        <p>Enter your email and a password to start logging.</p>
        <div className="form-row">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="signup-birthday">Birthday (for your Memento Mori)</label>
          <input
            id="signup-birthday"
            className="input"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            max={todayISO()}
            required
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <button
          type="button"
          className="switch-link"
          onClick={onSwitchToLogin}
          style={{
            marginTop: 12,
            width: '100%',
            background: 'none',
            color: 'var(--text-dim)',
            fontSize: 13,
            padding: 8,
          }}
        >
          Already have an account? Sign in
        </button>
      </form>
    </div>
  );
}
