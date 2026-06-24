const TOKEN_KEY = 'task-logger:jwt';
const USER_KEY = 'task-logger:user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export { ApiError };

export const api = {
  async signup(username, password) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      let message = 'Signup failed';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }
    return res.json();
  },
  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      let message = 'Login failed';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }
    return res.json();
  },
  me: () => request('GET', '/api/auth/me'),
  listEntries: (date) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request('GET', `/api/entries${qs}`);
  },
  createEntry: (entry) => request('POST', '/api/entries', entry),
  updateEntry: (id, patch) => request('PUT', `/api/entries/${id}`, patch),
  deleteEntry: (id) => request('DELETE', `/api/entries/${id}`),
  daily: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request('GET', `/api/insights/daily${qs ? `?${qs}` : ''}`);
  },
  rollup: (period) => request('GET', `/api/insights/rollup?period=${period}`),
  heatmap: (year) => {
    const qs = year ? `?year=${year}` : '';
    return request('GET', `/api/insights/heatmap${qs}`);
  },
};
