import React, { useState } from 'react';
import { api } from '../api/client.js';

export default function ForgotPasswordScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Reset your password</h2>
        {sent ? (
          <>
            <p>If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox (and spam folder).</p>
            <button
              type="button"
              className="submit-btn"
              onClick={onBackToLogin}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <p>Enter your account email and we'll send you a reset link.</p>
            <div className="form-row">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
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
            {error && <div className="error-banner">{error}</div>}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'none',
                color: 'var(--text-dim)',
                fontSize: 13,
                padding: 8,
              }}
            >
              Back to sign in
            </button>
          </>
        )}
      </form>
    </div>
  );
}
