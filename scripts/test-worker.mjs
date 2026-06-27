// End-to-end smoke test of the Worker API using a mock D1.
import worker from '../worker/src/index.js';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

function makeMockDb() {
  const tables = {
    users: [],
    entries: [],
  };

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
          const results = runSelect(tables, stmt.sql, stmt.args || []);
          return { results };
        },
        async first() {
          const results = runSelect(tables, stmt.sql, stmt.args || []);
          return results[0] || null;
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
  // 1. SELECT COUNT(*) AS count FROM users
  if (/SELECT COUNT\(\*\) AS count FROM users/i.test(sql)) {
    return [{ count: tables.users.length }];
  }

  // 2. SELECT id FROM users WHERE username = ?
  // or SELECT id, username, password_hash, birthday FROM users WHERE username = ?
  if (/FROM users WHERE username = \?/i.test(sql)) {
    const username = args[0];
    const user = tables.users.find((u) => u.username === username);
    return user ? [user] : [];
  }

  // 3. SELECT id, username, birthday FROM users WHERE id = ?
  if (/FROM users WHERE id = \?/i.test(sql)) {
    const id = args[0];
    const user = tables.users.find((u) => u.id === id);
    return user ? [user] : [];
  }

  // 4. SELECT * FROM entries WHERE user_id = ? AND log_date = ? ORDER BY created_at DESC
  if (/SELECT \* FROM entries WHERE user_id = \? AND log_date = \? ORDER BY created_at DESC/i.test(sql)) {
    const [userId, logDate] = args;
    return tables.entries
      .filter((e) => e.user_id === userId && e.log_date === logDate)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // 5. SELECT * FROM entries WHERE user_id = ? ORDER BY log_date DESC, created_at DESC
  if (/SELECT \* FROM entries WHERE user_id = \? ORDER BY log_date DESC/i.test(sql)) {
    const [userId] = args;
    return tables.entries
      .filter((e) => e.user_id === userId)
      .sort((a, b) => {
        const cmpDate = b.log_date.localeCompare(a.log_date);
        if (cmpDate !== 0) return cmpDate;
        return b.created_at.localeCompare(a.created_at);
      });
  }

  // 6. SELECT * FROM entries WHERE id = ? AND user_id = ?
  // or SELECT id FROM entries WHERE id = ? AND user_id = ?
  if (/FROM entries WHERE id = \? AND user_id = \?/i.test(sql)) {
    const [id, userId] = args;
    const entry = tables.entries.find((e) => e.id === id && e.user_id === userId);
    return entry ? [entry] : [];
  }

  // 7. SELECT * FROM entries WHERE id = ?
  if (/SELECT \* FROM entries WHERE id = \?/i.test(sql)) {
    const [id] = args;
    const entry = tables.entries.find((e) => e.id === id);
    return entry ? [entry] : [];
  }

  // 8. Daily Insights & Heatmap
  if (/log_date BETWEEN \? AND \?[\s\S]*GROUP BY log_date/i.test(sql)) {
    const [userId, from, to] = args;
    const filtered = tables.entries.filter((e) => e.user_id === userId && e.log_date >= from && e.log_date <= to);
    
    // Group by log_date
    const groups = {};
    for (const e of filtered) {
      if (!groups[e.log_date]) {
        groups[e.log_date] = [];
      }
      groups[e.log_date].push(e);
    }
    
    if (/AVG\(happiness\) AS avg_happiness,[\s\S]*AVG\(progress\) AS avg_progress,[\s\S]*COUNT\(\*\) AS count/i.test(sql)) {
      // Heatmap
      return Object.keys(groups).sort().map((date) => {
        const list = groups[date];
        const sumH = list.reduce((sum, e) => sum + e.happiness, 0);
        const sumP = list.reduce((sum, e) => sum + e.progress, 0);
        return {
          date,
          avg_happiness: sumH / list.length,
          avg_progress: sumP / list.length,
          count: list.length,
        };
      });
    } else {
      // Daily Insights
      return Object.keys(groups).sort().map((date) => {
        const list = groups[date];
        const sumH = list.reduce((sum, e) => sum + e.happiness, 0);
        const sumP = list.reduce((sum, e) => sum + e.progress, 0);
        const successCount = list.filter((e) => e.progress === 10).length;
        return {
          date,
          count: list.length,
          avg_happiness: sumH / list.length,
          avg_progress: sumP / list.length,
          success_count: successCount,
        };
      });
    }
  }

  // 9. Rollup Insights
  if (/FROM entries\s+WHERE user_id = \? AND log_date >= \?/i.test(sql)) {
    const [userId, from] = args;
    const filtered = tables.entries.filter((e) => e.user_id === userId && e.log_date >= from);
    if (filtered.length === 0) {
      return [{ count: 0, avg_happiness: null, avg_progress: null, success_count: 0 }];
    }
    const sumH = filtered.reduce((sum, e) => sum + e.happiness, 0);
    const sumP = filtered.reduce((sum, e) => sum + e.progress, 0);
    const successCount = filtered.filter((e) => e.progress === 10).length;
    return [{
      count: filtered.length,
      avg_happiness: sumH / filtered.length,
      avg_progress: sumP / filtered.length,
      success_count: successCount,
    }];
  }

  console.error('Unhandled SQL Select query:', sql, 'with args:', args);
  return [];
}

function runMutation(tables, sql, args) {
  // 1. INSERT INTO users (id, username, password_hash, birthday) VALUES (?, ?, ?, ?)
  if (/INSERT INTO users/i.test(sql)) {
    const [id, username, password_hash, birthday] = args;
    tables.users.push({
      id,
      username,
      password_hash,
      birthday,
      created_at: new Date().toISOString(),
    });
    return;
  }

  // 2. INSERT INTO entries (id, user_id, name, happiness, progress, log_date) VALUES (?, ?, ?, ?, ?, ?)
  if (/INSERT INTO entries/i.test(sql)) {
    const [id, user_id, name, happiness, progress, log_date] = args;
    tables.entries.push({
      id,
      user_id,
      name,
      happiness,
      progress,
      log_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return;
  }

  // 3. UPDATE entries SET name = ?, happiness = ?, progress = ?, log_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
  if (/UPDATE entries SET/i.test(sql)) {
    const [name, happiness, progress, log_date, id, userId] = args;
    const entry = tables.entries.find((e) => e.id === id && e.user_id === userId);
    if (entry) {
      entry.name = name;
      entry.happiness = happiness;
      entry.progress = progress;
      entry.log_date = log_date;
      entry.updated_at = new Date().toISOString();
    }
    return;
  }

  // 4. DELETE FROM entries WHERE id = ? AND user_id = ?
  if (/DELETE FROM entries WHERE id = \? AND user_id = \?/i.test(sql)) {
    const [id, userId] = args;
    tables.entries = tables.entries.filter((e) => !(e.id === id && e.user_id === userId));
    return;
  }

  console.error('Unhandled SQL Mutation query:', sql, 'with args:', args);
}

const env = {
  JWT_SECRET: 'test-secret-1234567890-test-secret-1234567890',
  DB: makeMockDb(),
};

let signupCounter = 0;
async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (path === '/api/auth/signup') {
    headers['CF-Connecting-IP'] = `127.0.0.${++signupCounter}`;
  }
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

// 1. Signup a new user (Alice)
let r = await call('POST', '/api/auth/signup', {
  username: 'alice',
  password: 'password123',
  birthday: '1990-01-01',
});
assert(r.status === 201, 'signup alice');
const aliceData = await r.json();
assert(aliceData.success === true, 'signup returns success');
const aliceToken = aliceData.token;
assert(typeof aliceToken === 'string', 'signup returns JWT token');

// 2. Signup Alice again should fail (conflict)
r = await call('POST', '/api/auth/signup', {
  username: 'alice',
  password: 'password123',
  birthday: '1990-01-01',
});
assert(r.status === 409, 'cannot signup with duplicate username');

// 3. Signup with invalid inputs
r = await call('POST', '/api/auth/signup', {
  username: 'al',
  password: 'password123',
  birthday: '1990-01-01',
});
assert(r.status === 400, 'rejects short username');

r = await call('POST', '/api/auth/signup', {
  username: 'alice2',
  password: 'short',
  birthday: '1990-01-01',
});
assert(r.status === 400, 'rejects short password');

r = await call('POST', '/api/auth/signup', {
  username: 'alice2',
  password: 'password123',
  birthday: 'invalid-date',
});
assert(r.status === 400, 'rejects invalid birthday');

// 4. Login Alice with correct password
r = await call('POST', '/api/auth/login', {
  username: 'alice',
  password: 'password123',
});
assert(r.status === 200, 'login alice');
const loginData = await r.json();
assert(loginData.success === true, 'login returns success');
assert(typeof loginData.token === 'string', 'login returns JWT token');

// 5. Login Alice with wrong password
r = await call('POST', '/api/auth/login', {
  username: 'alice',
  password: 'wrongpassword',
});
assert(r.status === 401, 'login with wrong password fails');

// 6. Signup a second user (Bob)
r = await call('POST', '/api/auth/signup', {
  username: 'bob',
  password: 'password456',
  birthday: '1992-02-02',
});
assert(r.status === 201, 'signup bob');
const bobData = await r.json();
const bobToken = bobData.token;

// 7. Unauthenticated create should fail
r = await call('POST', '/api/entries', {
  name: 'x',
  happiness: 8,
  progress: 9,
  log_date: '2026-06-24',
});
assert(r.status === 401, 'unauthenticated create rejected');

// 8. Alice creates three entries
const today = '2026-06-24';
r = await call('POST', '/api/entries', {
  name: 'Built API',
  happiness: 8,
  progress: 10,
  log_date: today,
}, aliceToken);
assert(r.status === 201, 'alice create entry 1');
const e1 = await r.json();
assert(e1.name === 'Built API', 'entry 1 name matches');
assert(e1.happiness === 8, 'entry 1 happiness matches');

r = await call('POST', '/api/entries', {
  name: 'Fixed bug',
  happiness: 6,
  progress: 8,
  log_date: today,
}, aliceToken);
assert(r.status === 201, 'alice create entry 2');

r = await call('POST', '/api/entries', {
  name: 'Wrote docs',
  happiness: 10,
  progress: 10,
  log_date: today,
}, aliceToken);
assert(r.status === 201, 'alice create entry 3');

// 9. Bob creates an entry for the same date (row-level isolation testing)
r = await call('POST', '/api/entries', {
  name: 'Bob task',
  happiness: 7,
  progress: 9,
  log_date: today,
}, bobToken);
assert(r.status === 201, 'bob create entry');

// 10. Alice lists entries for today
r = await call('GET', `/api/entries?date=${today}`, null, aliceToken);
assert(r.status === 200, 'alice list entries');
const aliceList = await r.json();
assert(aliceList.length === 3, 'alice list returns 3 entries');
assert(aliceList.every((e) => e.user_id === aliceData.user.id), 'all returned entries belong to alice');

// 11. Bob lists entries for today
r = await call('GET', `/api/entries?date=${today}`, null, bobToken);
assert(r.status === 200, 'bob list entries');
const bobList = await r.json();
assert(bobList.length === 1, 'bob list returns 1 entry');
assert(bobList[0].user_id === bobData.user.id, 'returned entry belongs to bob');

// 12. Validation: bad rating (> 10)
r = await call('POST', '/api/entries', {
  name: 'x',
  happiness: 11,
  progress: 5,
  log_date: today,
}, aliceToken);
assert(r.status === 400, 'rejects happiness > 10');

// 13. Update entry (Alice updates her entry)
r = await call('PUT', `/api/entries/${e1.id}`, { happiness: 10 }, aliceToken);
assert(r.status === 200, 'alice update her entry');
const updated = await r.json();
assert(updated.happiness === 10, 'updated happiness applied');

// 14. Cross-user update should fail (Bob tries to update Alice's entry)
r = await call('PUT', `/api/entries/${e1.id}`, { happiness: 10 }, bobToken);
assert(r.status === 404, 'bob cannot update alice entry');

// 15. Daily insights
r = await call('GET', `/api/insights/daily?from=2026-06-20&to=2026-06-30`, null, aliceToken);
assert(r.status === 200, 'alice daily insights');
const daily = await r.json();
assert(daily.length === 1, 'one day in range');
assert(daily[0].count === 3, 'count is 3');
assert(daily[0].avgHappiness === 8.67, 'average happiness is correct'); // (10 + 6 + 10) / 3 = 8.67
assert(daily[0].avgProgress === 9.33, 'average progress is correct'); // (10 + 8 + 10) / 3 = 9.33
assert(daily[0].successRate === 0.67, 'success rate is correct'); // 2 out of 3 are 10/10 progress (0.67)

// 16. Rollup week
r = await call('GET', `/api/insights/rollup?period=week`, null, aliceToken);
assert(r.status === 200, 'alice rollup week');
const rollup = await r.json();
assert(rollup.count === 3, 'rollup count is 3');
assert(rollup.avgHappiness === 8.67, 'rollup avgHappiness is correct');

// 17. Heatmap
r = await call('GET', `/api/insights/heatmap?year=2026`, null, aliceToken);
assert(r.status === 200, 'alice heatmap');
const heat = await r.json();
assert(heat.length === 1, 'heatmap contains one day');

// 18. Cross-user delete should fail (Bob tries to delete Alice's entry)
r = await call('DELETE', `/api/entries/${e1.id}`, null, bobToken);
assert(r.status === 404, 'bob cannot delete alice entry');

// 19. Alice deletes her entry
r = await call('DELETE', `/api/entries/${e1.id}`, null, aliceToken);
assert(r.status === 200, 'alice delete entry');

// 20. Verify entry is deleted
r = await call('GET', `/api/entries?date=${today}`, null, aliceToken);
const remaining = await r.json();
assert(remaining.length === 2, 'list now has 2 entries');
assert(!remaining.some((e) => e.id === e1.id), 'deleted entry is not present');

// 21. 404 on missing route
r = await call('GET', `/api/entries/does-not-exist`, null, aliceToken);
assert(r.status === 404, 'missing entry returns 404');

console.log('All API tests passed.');
