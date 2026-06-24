// End-to-end smoke test of the Worker API using a mock D1.
import worker from '../worker/src/index.js';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

function makeMockDb() {
  const tables = { entries: [] };
  return {
    _tables: tables,
    prepare(sql) {
      const stmt = {
        sql,
        bind(...args) {
          stmt.args = args;
          return stmt;
        },
        async all() {
          const rows = runSelect(tables, stmt.sql, stmt.args || []);
          return { results: rows };
        },
        async first() {
          const rows = runSelect(tables, stmt.sql, stmt.args || []);
          return rows[0] || null;
        },
        async run() {
          runMutation(tables, stmt.sql, stmt.args || []);
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

function runSelect(tables, sql, args) {
  if (/SELECT .* FROM entries WHERE id = \?/.test(sql)) {
    return tables.entries.filter((r) => r.id === args[0]);
  }
  if (/FROM entries WHERE log_date = \? ORDER BY created_at DESC/.test(sql)) {
    return tables.entries
      .filter((r) => r.log_date === args[0])
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const m = sql.match(/log_date BETWEEN \? AND \?[\s\S]*GROUP BY log_date/);
  if (m) {
    const [from, to] = args;
    const map = new Map();
    for (const r of tables.entries) {
      if (r.log_date < from || r.log_date > to) continue;
      const bucket = map.get(r.log_date) || { log_date: r.log_date, count: 0, sumH: 0, sumP: 0, success: 0 };
      bucket.count++;
      bucket.sumH += r.happiness;
      bucket.sumP += r.progress;
      if (r.progress === 5) bucket.success++;
      map.set(r.log_date, bucket);
    }
    return [...map.values()]
      .sort((a, b) => (a.log_date < b.log_date ? -1 : 1))
      .map((b) => ({
        log_date: b.log_date,
        count: b.count,
        avg_happiness: b.sumH / b.count,
        avg_progress: b.sumP / b.count,
        success_count: b.success,
      }));
  }
  const rm = sql.match(/FROM entries\s+WHERE log_date >= \?/);
  if (rm) {
    const from = args[0];
    const filtered = tables.entries.filter((r) => r.log_date >= from);
    if (filtered.length === 0) {
      return [{ count: 0, avg_happiness: null, avg_progress: null, success_count: 0 }];
    }
    const sumH = filtered.reduce((s, r) => s + r.happiness, 0);
    const sumP = filtered.reduce((s, r) => s + r.progress, 0);
    const success = filtered.filter((r) => r.progress === 5).length;
    return [{
      count: filtered.length,
      avg_happiness: sumH / filtered.length,
      avg_progress: sumP / filtered.length,
      success_count: success,
    }];
  }
  const hm = sql.match(/log_date BETWEEN \? AND \?[\s\S]*GROUP BY log_date\s*$/) ||
    sql.match(/log_date BETWEEN \? AND \?/);
  if (hm) {
    const [from, to] = args;
    const map = new Map();
    for (const r of tables.entries) {
      if (r.log_date < from || r.log_date > to) continue;
      const bucket = map.get(r.log_date) || { log_date: r.log_date, sum: 0, count: 0 };
      bucket.sum += (r.happiness + r.progress) / 2;
      bucket.count++;
      map.set(r.log_date, bucket);
    }
    return [...map.values()].map((b) => ({
      log_date: b.log_date,
      day_score: b.sum / b.count,
      count: b.count,
    }));
  }
  return [];
}

function runMutation(tables, sql, args) {
  if (/INSERT INTO entries/.test(sql)) {
    const [id, name, happiness, progress, log_date] = args;
    tables.entries.push({
      id, name, happiness, progress, log_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return;
  }
  if (/UPDATE entries/.test(sql)) {
    const [name, happiness, progress, log_date, id] = args;
    const r = tables.entries.find((e) => e.id === id);
    if (r) {
      r.name = name;
      r.happiness = happiness;
      r.progress = progress;
      r.log_date = log_date;
      r.updated_at = new Date().toISOString();
    }
    return;
  }
  if (/DELETE FROM entries/.test(sql)) {
    const [id] = args;
    tables.entries = tables.entries.filter((e) => e.id !== id);
    return;
  }
}

const env = {
  AUTH_TOKEN: 'secret123',
  DB: makeMockDb(),
};

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return worker.fetch(req, env, {});
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('  ok:', msg);
}

console.log('Running worker API smoke test...');

// 1. Login with wrong token
let r = await call('POST', '/api/auth/login', { token: 'wrong' });
assert(r.status === 401, 'login rejects bad token');

// 2. Login with correct token
r = await call('POST', '/api/auth/login', { token: 'secret123' });
assert(r.status === 200, 'login accepts good token');

// 3. Unauthenticated create should fail
r = await call('POST', '/api/entries', { name: 'x', happiness: 3, progress: 4, log_date: '2026-06-24' });
assert(r.status === 401, 'unauthenticated create rejected');

// 4. Create three entries
const today = '2026-06-24';
r = await call('POST', '/api/entries', { name: 'Built API', happiness: 4, progress: 5, log_date: today }, 'secret123');
assert(r.status === 201, 'create entry 1');
const e1 = await r.json();

r = await call('POST', '/api/entries', { name: 'Fixed bug', happiness: 3, progress: 4, log_date: today }, 'secret123');
assert(r.status === 201, 'create entry 2');
const e2 = await r.json();

r = await call('POST', '/api/entries', { name: 'Wrote docs', happiness: 5, progress: 5, log_date: today }, 'secret123');
assert(r.status === 201, 'create entry 3');

// 5. List for today
r = await call('GET', `/api/entries?date=${today}`, null, 'secret123');
assert(r.status === 200, 'list entries');
const listed = await r.json();
assert(listed.length === 3, 'list returns 3');

// 6. Validation: bad rating
r = await call('POST', '/api/entries', { name: 'x', happiness: 9, progress: 4, log_date: today }, 'secret123');
assert(r.status === 400, 'rejects happiness > 5');

// 7. Update entry
r = await call('PUT', `/api/entries/${e1.id}`, { happiness: 5 }, 'secret123');
assert(r.status === 200, 'update entry');
const updated = await r.json();
assert(updated.happiness === 5, 'updated happiness applied');

// 8. Daily insights
r = await call('GET', `/api/insights/daily?from=2026-06-20&to=2026-06-30`, null, 'secret123');
assert(r.status === 200, 'daily insights');
const daily = await r.json();
assert(daily.length === 1, 'one day in range');
assert(daily[0].count === 3, 'count=3');

// 9. Rollup
r = await call('GET', `/api/insights/rollup?period=week`, null, 'secret123');
assert(r.status === 200, 'rollup week');
const rollup = await r.json();
assert(rollup.count === 3, 'rollup count=3');

// 10. Heatmap
r = await call('GET', `/api/insights/heatmap?year=2026`, null, 'secret123');
assert(r.status === 200, 'heatmap year');
const heat = await r.json();
assert(heat.length === 1, 'heatmap one day');

// 11. Delete
r = await call('DELETE', `/api/entries/${e1.id}`, null, 'secret123');
assert(r.status === 200, 'delete entry');
r = await call('GET', `/api/entries?date=${today}`, null, 'secret123');
const remaining = await r.json();
assert(remaining.length === 2, 'list now 2');

// 12. 404 on missing
r = await call('GET', `/api/entries/does-not-exist`, null, 'secret123');
assert(r.status === 404, 'missing entry returns 404');

console.log('All API tests passed.');
