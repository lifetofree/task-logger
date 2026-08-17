import React, { useState } from 'react';
import { api, setSession } from '../api/client.js';

export default function LoginScreen({ onSuccess, onSwitchToSignup, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
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
        <h2>Sign in</h2>
        <p>Welcome back. Log in to continue.</p>
        <div className="form-row">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={onForgotPassword}
          className="switch-link"
          style={{
            marginTop: 12,
            width: '100%',
            background: 'none',
            color: 'var(--text-dim)',
            fontSize: 13,
            padding: 8,
          }}
        >
          Forgot password?
        </button>
        <button
          type="button"
          onClick={onSwitchToSignup}
          style={{
            marginTop: 4,
            width: '100%',
            background: 'none',
            color: 'var(--text-dim)',
            fontSize: 13,
            padding: 8,
          }}
        >
          New here? Create an account
        </button>
      </form>
    </div>
  );
}
