const TOKEN_KEY = 'task-logger:token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'Unauthorized');
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

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const api = {
  async login(token) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.status === 401) throw new ApiError(401, 'Invalid token');
    if (!res.ok) throw new ApiError(res.status, 'Login failed');
    return true;
  },
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
