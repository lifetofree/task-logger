function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

function unauthorized() {
  return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
}

function notFound(message = 'Not found') {
  return jsonResponse({ error: message }, { status: 404 });
}

function badRequest(message) {
  return jsonResponse({ error: message }, { status: 400 });
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidRating(n) {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

function entryRow(row) {
  return {
    id: row.id,
    name: row.name,
    happiness: row.happiness,
    progress: row.progress,
    log_date: row.log_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  if (typeof body.token !== 'string' || body.token !== env.AUTH_TOKEN) {
    return unauthorized();
  }
  return jsonResponse({ success: true });
}

async function handleListEntries(request, env) {
  if (request.method !== 'GET') return badRequest('GET required');
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || todayDateString();
  if (!isValidDateString(date)) return badRequest('Invalid date');
  const { results } = await env.DB
    .prepare('SELECT * FROM entries WHERE log_date = ? ORDER BY created_at DESC')
    .bind(date)
    .all();
  return jsonResponse(results.map(entryRow));
}

async function handleCreateEntry(request, env) {
  if (request.method !== 'POST') return badRequest('POST required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const { name, happiness, progress, log_date } = body;
  if (typeof name !== 'string' || name.trim().length === 0) return badRequest('Name required');
  if (!isValidRating(happiness)) return badRequest('Happiness must be 1-5');
  if (!isValidRating(progress)) return badRequest('Progress must be 1-5');
  const date = log_date || todayDateString();
  if (!isValidDateString(date)) return badRequest('Invalid log_date');

  const id = randomId();
  await env.DB
    .prepare('INSERT INTO entries (id, name, happiness, progress, log_date) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name.trim(), happiness, progress, date)
    .run();
  const row = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  return jsonResponse(entryRow(row), { status: 201 });
}

async function handleUpdateEntry(request, env, id) {
  if (request.method !== 'PUT') return badRequest('PUT required');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const existing = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  if (!existing) return notFound('Entry not found');

  const next = { ...existing };
  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return badRequest('Name required');
    next.name = body.name.trim();
  }
  if ('happiness' in body) {
    if (!isValidRating(body.happiness)) return badRequest('Happiness must be 1-5');
    next.happiness = body.happiness;
  }
  if ('progress' in body) {
    if (!isValidRating(body.progress)) return badRequest('Progress must be 1-5');
    next.progress = body.progress;
  }
  if ('log_date' in body) {
    if (!isValidDateString(body.log_date)) return badRequest('Invalid log_date');
    next.log_date = body.log_date;
  }

  await env.DB
    .prepare(
      'UPDATE entries SET name = ?, happiness = ?, progress = ?, log_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    .bind(next.name, next.happiness, next.progress, next.log_date, id)
    .run();
  const row = await env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  return jsonResponse(entryRow(row));
}

async function handleDeleteEntry(request, env, id) {
  if (request.method !== 'DELETE') return badRequest('DELETE required');
  const existing = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(id).first();
  if (!existing) return notFound('Entry not found');
  await env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function handleDaily(request, env) {
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
              SUM(CASE WHEN progress = 5 THEN 1 ELSE 0 END) AS success_count
         FROM entries
        WHERE log_date BETWEEN ? AND ?
        GROUP BY log_date
        ORDER BY log_date ASC`
    )
    .bind(from, to)
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

async function handleRollup(request, env) {
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
              SUM(CASE WHEN progress = 5 THEN 1 ELSE 0 END) AS success_count
         FROM entries
        WHERE log_date >= ?`
    )
    .bind(from)
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

async function handleHeatmap(request, env) {
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
              AVG((happiness + progress) / 2.0) AS day_score,
              COUNT(*) AS count
         FROM entries
        WHERE log_date BETWEEN ? AND ?
        GROUP BY log_date`
    )
    .bind(from, to)
    .all();
  return jsonResponse(
    results.map((r) => ({
      date: r.date,
      score: r.day_score == null ? null : Math.round(r.day_score * 100) / 100,
      count: r.count,
    }))
  );
}

function checkAuth(request, env) {
  const header = request.headers.get('X-Auth-Token');
  return header === env.AUTH_TOKEN;
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth/login') return handleLogin(request, env);

  if (path === '/api/entries') {
    if (!checkAuth(request, env)) return unauthorized();
    if (request.method === 'GET') return handleListEntries(request, env);
    if (request.method === 'POST') return handleCreateEntry(request, env);
    return badRequest('Method not allowed');
  }

  const entryMatch = path.match(/^\/api\/entries\/([A-Za-z0-9]+)$/);
  if (entryMatch) {
    if (!checkAuth(request, env)) return unauthorized();
    const id = entryMatch[1];
    if (request.method === 'PUT') return handleUpdateEntry(request, env, id);
    if (request.method === 'DELETE') return handleDeleteEntry(request, env, id);
    return badRequest('Method not allowed');
  }

  if (path === '/api/insights/daily') {
    if (!checkAuth(request, env)) return unauthorized();
    return handleDaily(request, env);
  }
  if (path === '/api/insights/rollup') {
    if (!checkAuth(request, env)) return unauthorized();
    return handleRollup(request, env);
  }
  if (path === '/api/insights/heatmap') {
    if (!checkAuth(request, env)) return unauthorized();
    return handleHeatmap(request, env);
  }

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
