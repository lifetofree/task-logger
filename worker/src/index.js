import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;
const JWT_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MAX_USERS = 50;
const MAX_NAME_LENGTH = 200;
const MAX_PASSWORD_LENGTH = 1024;
const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes

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

function cryptoRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const TIMEZONE_OFFSET = 7; // GMT+7

function todayDateString() {
  const now = new Date();
  const local = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidRating(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 10;
}

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

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
    .prepare('SELECT id, email, birthday FROM users WHERE id = ?')
    .bind(result.userId)
    .first();
  if (!user) return { ok: false };
  return { ok: true, user };
}

const signupAttempts = new Map();
const forgotAttempts = new Map();

function rateLimitIp(ip, store) {
  const now = Date.now();
  const list = store.get(ip) || [];
  const fresh = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    store.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  store.set(ip, fresh);
  return true;
}

async function handleSignup(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!rateLimitIp(ip, signupAttempts)) {
    return jsonResponse({ error: 'Too many signup attempts, try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const { email, password, birthday } = body;
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!isValidEmail(normalizedEmail)) {
    return badRequest('Please enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    return badRequest('Password must be at least 8 characters.');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return badRequest(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }
  if (!isValidDateString(birthday)) {
    return badRequest('Birthday must be a valid date (YYYY-MM-DD).');
  }

  const userCountRow = await env.DB
    .prepare('SELECT COUNT(*) AS count FROM users')
    .first();
  const effectiveCount = (userCountRow?.count || 0) - 1;
  if (effectiveCount >= MAX_USERS) {
    return jsonResponse({ error: 'Registration is closed. Maximum number of users reached.' }, { status: 403 });
  }

  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first();
  if (existing) return conflict('An account with this email already exists.');

  const id = cryptoRandomId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    await env.DB
      .prepare('INSERT INTO users (id, email, password_hash, birthday) VALUES (?, ?, ?, ?)')
      .bind(id, normalizedEmail, passwordHash, birthday)
      .run();
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) return conflict('An account with this email already exists.');
    throw err;
  }
  const token = await issueJwt(id, env.JWT_SECRET);
  return jsonResponse({ success: true, token, user: { id, email: normalizedEmail, birthday } }, { status: 201 });
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const { email, password } = body;
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!normalizedEmail || typeof password !== 'string') {
    return badRequest('Email and password required.');
  }
  const row = await env.DB
    .prepare('SELECT id, email, password_hash, birthday FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first();
  if (!row) return unauthorized('Invalid email or password.');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return unauthorized('Invalid email or password.');
  const token = await issueJwt(row.id, env.JWT_SECRET);
  return jsonResponse({ success: true, token, user: { id: row.id, email: row.email, birthday: row.birthday } });
}

async function handleForgotPassword(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!rateLimitIp(ip, forgotAttempts)) {
    // Still return 200 to avoid timing-based enumeration
    return jsonResponse({ success: true });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const { email } = body;
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

  // Always return 200 — never reveal whether email exists
  if (!isValidEmail(normalizedEmail)) {
    return jsonResponse({ success: true });
  }

  const user = await env.DB
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first();

  if (!user) return jsonResponse({ success: true });

  // Delete any existing tokens for this user
  await env.DB
    .prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
    .bind(user.id)
    .run();

  const rawToken = cryptoRandomToken();
  const tokenHash = await sha256Hex(rawToken);
  const tokenId = cryptoRandomId();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS).toISOString();

  await env.DB
    .prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenId, user.id, tokenHash, expiresAt)
    .run();

  // Send email via Resend if API key is configured
  if (env.RESEND_API_KEY && env.APP_BASE_URL) {
    const resetUrl = `${env.APP_BASE_URL}/#/reset?token=${rawToken}`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Task Logger <noreply@adduckivity.com>',
        to: [user.email],
        subject: 'Reset your Task Logger password',
        html: `
          <p>Hi,</p>
          <p>You requested a password reset for your Task Logger account.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
        `,
      }),
    }).catch(() => {
      // Non-fatal — token is stored, user can request again
    });
  }

  return jsonResponse({ success: true });
}

async function handleResetPassword(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const { token, newPassword } = body;
  if (typeof token !== 'string' || !token) return badRequest('Token required.');
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return badRequest('Password must be at least 8 characters.');
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return badRequest(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }

  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await env.DB
    .prepare('SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first();

  if (!row || row.expires_at < now) {
    return badRequest('Reset link is invalid or has expired. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await env.DB
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, row.user_id)
    .run();

  // Delete ALL tokens for this user after successful reset
  await env.DB
    .prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
    .bind(row.user_id)
    .run();

  return jsonResponse({ success: true });
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

async function handleHistory(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const { results } = await env.DB
    .prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY log_date DESC, created_at DESC')
    .bind(auth.user.id)
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
  if (name.length > MAX_NAME_LENGTH) return badRequest(`Name must be at most ${MAX_NAME_LENGTH} characters.`);
  if (!isValidRating(happiness)) return badRequest('Happiness must be between 1 and 10');
  if (!isValidRating(progress)) return badRequest('Progress must be between 1 and 10');
  const date = log_date || todayDateString();
  if (!isValidDateString(date)) return badRequest('Invalid log_date');

  const id = cryptoRandomId();
  await env.DB
    .prepare('INSERT INTO entries (id, user_id, name, happiness, progress, log_date) VALUES (?, ?, ?, ?, ?, ?)')
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
    if (body.name.length > MAX_NAME_LENGTH) return badRequest(`Name must be at most ${MAX_NAME_LENGTH} characters.`);
    next.name = body.name.trim();
  }
  if ('happiness' in body) {
    if (!isValidRating(body.happiness)) return badRequest('Happiness must be between 1 and 10');
    next.happiness = body.happiness;
  }
  if ('progress' in body) {
    if (!isValidRating(body.progress)) return badRequest('Progress must be between 1 and 10');
    next.progress = body.progress;
  }
  if ('log_date' in body) {
    if (!isValidDateString(body.log_date)) return badRequest('Invalid log_date');
    next.log_date = body.log_date;
  }

  await env.DB
    .prepare('UPDATE entries SET name = ?, happiness = ?, progress = ?, log_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
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
  const now = new Date();
  const local = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  local.setUTCDate(local.getUTCDate() - n);
  return local.toISOString().slice(0, 10);
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
              SUM(CASE WHEN progress >= 9.5 THEN 1 ELSE 0 END) AS success_count
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
              SUM(CASE WHEN progress >= 9.5 THEN 1 ELSE 0 END) AS success_count
         FROM entries
        WHERE user_id = ? AND log_date >= ?`
    )
    .bind(auth.user.id, from)
    .first();
  const count = row?.count || 0;
  const avgHappiness = count > 0 ? Math.round(row.avg_happiness * 100) / 100 : null;
  const avgProgress = count > 0 ? Math.round(row.avg_progress * 100) / 100 : null;
  const successRate = count > 0 ? Math.round((row.success_count / count) * 100) / 100 : 0;
  return jsonResponse({ period, from, to: todayDateString(), count, avgHappiness, avgProgress, successRate });
}

function dayBefore(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function computeStreaks(dates, today, yesterday) {
  const set = new Set(dates);
  const totalDaysLogged = dates.length;

  let currentStreak = 0;
  const startCursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (startCursor) {
    let d = startCursor;
    while (set.has(d)) {
      currentStreak++;
      d = dayBefore(d);
    }
  }

  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of dates) {
    if (prev === null) {
      run = 1;
    } else {
      run = dayBefore(prev) === d ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  const currentYear = today.slice(0, 4);
  const daysLoggedThisYear = dates.filter((d) => d.slice(0, 4) === currentYear).length;

  return { currentStreak, longestStreak, daysLoggedThisYear, totalDaysLogged, loggedToday: set.has(today) };
}

async function handleStreak(request, env, auth) {
  if (request.method !== 'GET') return badRequest('GET required');
  const { results } = await env.DB
    .prepare('SELECT DISTINCT log_date FROM entries WHERE user_id = ? ORDER BY log_date DESC')
    .bind(auth.user.id)
    .all();
  const dates = results.map((r) => r.log_date).sort((a, b) => b.localeCompare(a));
  return jsonResponse(computeStreaks(dates, todayDateString(), dateNDaysAgo(1)));
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
  if (path === '/api/auth/forgot-password') return handleForgotPassword(request, env);
  if (path === '/api/auth/reset-password') return handleResetPassword(request, env);

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
  if (path === '/api/insights/streak') return handleStreak(request, env, auth);
  if (path === '/api/insights/heatmap') return handleHeatmap(request, env, auth);
  if (path === '/api/history') return handleHistory(request, env, auth);

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
