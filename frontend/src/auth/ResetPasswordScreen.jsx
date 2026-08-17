import React, { useState } from 'react';
import { api } from '../api/client.js';

export default function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-screen">
        <form className="login-card">
          <h2>Reset your password</h2>
          <p>Reset link is invalid or missing. Please request a new one.</p>
          <button type="button" className="submit-btn" onClick={onDone}>
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Choose a new password</h2>
        {success ? (
          <>
            <p>Password updated. You can now sign in with your new password.</p>
            <button type="button" className="submit-btn" onClick={onDone}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="form-row">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="reset-confirm">Confirm password</label>
              <input
                id="reset-confirm"
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
