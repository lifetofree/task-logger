import React, { useState } from 'react';
import { api } from '../api/client.js';
import { setToken } from '../api/client.js';

export default function LoginScreen({ onSuccess }) {
  const [token, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(token);
      setToken(token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Task Logger</h2>
        <p>Enter your access token to continue.</p>
        <div className="form-row">
          <input
            className="input"
            type="password"
            placeholder="Access token"
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
