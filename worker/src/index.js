import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;
const JWT_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

function unauthorized(message = 'Unauthorized') {
  return jsonResponse({ error: message }, { status: 401 });
}

function notFound(message = 'Not found') {
  return jsonResponse({ error: message }, { status: 404 });
}

function badRequest(message) {
  return jsonResponse({ error: message }, { status: 400 });
}

function conflict(message) {
  return jsonResponse({ error: message }, { status: 409 });
}

function cryptoRandomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidRating(n) {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

function entryRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    happiness: row.happiness,
    progress: row.progress,
    log_date: row.log_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const encoder = new TextEncoder();
function getJwtKey(secret) {
  return encoder.encode(secret);
}

async function issueJwt(userId, secret) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${JWT_LIFETIME_SECONDS}s`)
    .sign(getJwtKey(secret));
}

async function verifyJwt(token, secret) {
  try {
    const { payload } = await jwtVerify(token, getJwtKey(secret));
    return { ok: true, userId: payload.sub };
  } catch {
    return { ok: false };
  }
}

async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false };
  const result = await verifyJwt(match[1], env.JWT_SECRET);
  if (!result.ok) return { ok: false };
  const user = await env.DB
    .prepare('SELECT id, username FROM users WHERE id = ?')
    .bind(result.userId)
    .first();
  if (!user) return { ok: false };
  return { ok: true, user };
}

const signupAttempts = new Map();
function rateLimitIp(ip) {
  const now = Date.now();
  const list = signupAttempts.get(ip) || [];
  const fresh = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    signupAttempts.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  signupAttempts.set(ip, fresh);
  return true;
}

async function handleSignup(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!rateLimitIp(ip)) return jsonResponse({ error: 'Too many signup attempts, try again later.' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const { username, password } = body;
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return badRequest('Username must be 3-32 chars, lowercase letters/digits/underscore.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    return badRequest('Password must be at least 8 characters.');
  }

  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (existing) return conflict('Username is taken');

  const id = cryptoRandomId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    await env.DB
      .prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
      .bind(id, username, passwordHash)
      .run();
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) return conflict('Username is taken');
    throw err;
  }
  const token = await issueJwt(id, env.JWT_SECRET);
  return jsonResponse({ success: true, token, user: { id, username } }, { status: 201 });
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return badRequest('Username and password required');
  }
  const row = await env.DB
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (!row) return unauthorized('Invalid username or password');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return unauthorized('Invalid username or password');
  const token = await issueJwt(row.id, env.JWT_SECRET);
  return jsonResponse({ success: true, token, user: { id: row.id, username: row.username } });
}

async function handleMe(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  return jsonResponse({ user: auth.user });
}

async function handleListEntries(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || todayDateString();
  if (!isValidDateString(date)) return badRequest('Invalid date');
  const { results } = await env.DB
    .prepare('SELECT * FROM entries WHERE user_id = ? AND log_date = ? ORDER BY created_at DESC')
    .bind(auth.user.id, date)
    .all();
  return jsonResponse(results.map(entryRow));
}

async function handleCreateEntry(request, env, auth) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const { name, happiness, progress, log_date } = body;
  if (typeof name !== 'string' || name.trim().length === 0) return badRequest('Name required');
  if (!isValidRating(happiness)) return badRequest('Happiness must be 1-10');
  if (!isValidRating(progress)) return badRequest('Progress must be 1-10');
  const date = log_date || todayDateString();
  if (!isValidDateString(date)) return badRequest('Invalid log_date');

  const id = cryptoRandomId();
  await env.DB
    .prepare(
      'INSERT INTO entries (id, user_id, name, happiness, progress, log_date) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, auth.user.id, name.trim(), happiness, progress, date)
    .run();
  const row = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  return jsonResponse(entryRow(row), { status: 201 });
}

async function handleUpdateEntry(request, env, auth, id) {
  if (request.method !== 'PUT') return badRequest('PUT required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const existing = await env.DB
    .prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .first();
  if (!existing) return notFound('Entry not found');

  const next = { ...existing };
  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return badRequest('Name required');
    next.name = body.name.trim();
  }
  if ('happiness' in body) {
    if (!isValidRating(body.happiness)) return badRequest('Happiness must be 1-10');
    next.happiness = body.happiness;
  }
  if ('progress' in body) {
    if (!isValidRating(body.progress)) return badRequest('Progress must be 1-10');
    next.progress = body.progress;
  }
  if ('log_date' in body) {
    if (!isValidDateString(body.log_date)) return badRequest('Invalid log_date');
    next.log_date = body.log_date;
  }

  await env.DB
    .prepare(
      'UPDATE entries SET name = ?, happiness = ?, progress = ?, log_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    )
    .bind(next.name, next.happiness, next.progress, next.log_date, id, auth.user.id)
    .run();
  const row = await env.DB
    .prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .first();
  return jsonResponse(entryRow(row));
}

async function handleDeleteEntry(request, env, auth, id) {
  if (request.method !== 'DELETE') return badRequest('DELETE required');
  const existing = await env.DB
    .prepare('SELECT id FROM entries WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .first();
  if (!existing) return notFound('Entry not found');
  await env.DB
    .prepare('DELETE FROM entries WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();
  return jsonResponse({ success: true });
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function handleDaily(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || todayDateString();
  const from = url.searchParams.get('from') || dateNDaysAgo(29);
  if (!isValidDateString(from) || !isValidDateString(to)) return badRequest('Invalid date');

  const { results } = await env.DB
    .prepare(
      `SELECT log_date AS date,
              COUNT(*) AS count,
              AVG(happiness) AS avg_happiness,
              AVG(progress) AS avg_progress,
              SUM(CASE WHEN progress = 10 THEN 1 ELSE 0 END) AS success_count
         FROM entries
        WHERE user_id = ? AND log_date BETWEEN ? AND ?
        GROUP BY log_date
        ORDER BY log_date ASC`
    )
    .bind(auth.user.id, from, to)
    .all();
  const mapped = results.map((r) => ({
    date: r.date,
    count: r.count,
    avgHappiness: r.avg_happiness == null ? null : Math.round(r.avg_happiness * 100) / 100,
    avgProgress: r.avg_progress == null ? null : Math.round(r.avg_progress * 100) / 100,
    successRate: r.count > 0 ? Math.round((r.success_count / r.count) * 100) / 100 : 0,
  }));
  return jsonResponse(mapped);
}

async function handleRollup(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'week';
  let from;
  if (period === 'week') from = dateNDaysAgo(6);
  else if (period === 'month') from = dateNDaysAgo(29);
  else if (period === '30d') from = dateNDaysAgo(29);
  else return badRequest('Invalid period');

  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS count,
              AVG(happiness) AS avg_happiness,
              AVG(progress) AS avg_progress,
              SUM(CASE WHEN progress = 10 THEN 1 ELSE 0 END) AS success_count
         FROM entries
        WHERE user_id = ? AND log_date >= ?`
    )
    .bind(auth.user.id, from)
    .first();
  const count = row?.count || 0;
  const avgHappiness = count > 0 ? Math.round(row.avg_happiness * 100) / 100 : null;
  const avgProgress = count > 0 ? Math.round(row.avg_progress * 100) / 100 : null;
  const successRate = count > 0 ? Math.round((row.success_count / count) * 100) / 100 : 0;
  return jsonResponse({
    period,
    from,
    to: todayDateString(),
    count,
    avgHappiness,
    avgProgress,
    successRate,
  });
}

async function handleHeatmap(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const url = new URL(request.url);
  const yearParam = url.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();
  if (!Number.isInteger(year)) return badRequest('Invalid year');
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { results } = await env.DB
    .prepare(
      `SELECT log_date AS date,
              AVG(happiness) AS avg_happiness,
              AVG(progress) AS avg_progress,
              COUNT(*) AS count
         FROM entries
        WHERE user_id = ? AND log_date BETWEEN ? AND ?
        GROUP BY log_date`
    )
    .bind(auth.user.id, from, to)
    .all();
  return jsonResponse(
    results.map((r) => ({
      date: r.date,
      happiness: r.avg_happiness == null ? null : Math.round(r.avg_happiness * 100) / 100,
      progress: r.avg_progress == null ? null : Math.round(r.avg_progress * 100) / 100,
      count: r.count,
    }))
  );
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth/signup') return handleSignup(request, env);
  if (path === '/api/auth/login') return handleLogin(request, env);

  const auth = await authenticate(request, env);
  if (!auth.ok) return unauthorized();

  if (path === '/api/auth/me') return handleMe(request, env, auth);

  if (path === '/api/entries') {
    if (request.method === 'GET') return handleListEntries(request, env, auth);
    if (request.method === 'POST') return handleCreateEntry(request, env, auth);
    return badRequest('Method not allowed');
  }

  const entryMatch = path.match(/^\/api\/entries\/([A-Za-z0-9]+)$/);
  if (entryMatch) {
    const id = entryMatch[1];
    if (request.method === 'PUT') return handleUpdateEntry(request, env, auth, id);
    if (request.method === 'DELETE') return handleDeleteEntry(request, env, auth, id);
    return badRequest('Method not allowed');
  }

  if (path === '/api/insights/daily') return handleDaily(request, env, auth);
  if (path === '/api/insights/rollup') return handleRollup(request, env, auth);
  if (path === '/api/insights/heatmap') return handleHeatmap(request, env, auth);

  return null;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await route(request, env);
      if (response) return response;
    } catch (err) {
      console.error('API error:', err);
      return jsonResponse({ error: err.message || 'Internal error' }, { status: 500 });
    }

    if (env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse && assetResponse.status !== 404) return assetResponse;
      } catch {
        // fall through to index
      }
    }

    if (env.ASSETS) {
      const indexUrl = new URL('/index.html', request.url);
      try {
        const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (indexResponse) return indexResponse;
      } catch {
        // fall through
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
