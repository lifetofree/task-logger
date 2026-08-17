// End-to-end smoke test of the Worker API using a mock D1.
import worker from '../worker/src/index.js';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

function makeMockDb() {
  const tables = {
    users: [],
    entries: [],
    password_reset_tokens: [],
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

  // 2. SELECT ... FROM users WHERE email = ?
  if (/FROM users WHERE email = \?/i.test(sql)) {
    const email = args[0];
    const user = tables.users.find((u) => u.email === email);
    return user ? [user] : [];
  }

  // 3. SELECT ... FROM users WHERE id = ?
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
    const groups = {};
    for (const e of filtered) {
      if (!groups[e.log_date]) groups[e.log_date] = [];
      groups[e.log_date].push(e);
    }
    if (/AVG\(happiness\) AS avg_happiness,[\s\S]*AVG\(progress\) AS avg_progress,[\s\S]*COUNT\(\*\) AS count/i.test(sql)) {
      return Object.keys(groups).sort().map((date) => {
        const list = groups[date];
        return {
          date,
          avg_happiness: list.reduce((s, e) => s + e.happiness, 0) / list.length,
          avg_progress: list.reduce((s, e) => s + e.progress, 0) / list.length,
          count: list.length,
        };
      });
    } else {
      return Object.keys(groups).sort().map((date) => {
        const list = groups[date];
        return {
          date,
          count: list.length,
          avg_happiness: list.reduce((s, e) => s + e.happiness, 0) / list.length,
          avg_progress: list.reduce((s, e) => s + e.progress, 0) / list.length,
          success_count: list.filter((e) => e.progress >= 9.5).length,
        };
      });
    }
  }

  // 9. Streak
  if (/SELECT DISTINCT log_date FROM entries WHERE user_id = \?/i.test(sql)) {
    const [userId] = args;
    const dates = Array.from(new Set(
      tables.entries.filter((e) => e.user_id === userId).map((e) => e.log_date)
    ));
    return dates.map((log_date) => ({ log_date }));
  }

  // 10. Rollup
  if (/FROM entries\s+WHERE user_id = \? AND log_date >= \?/i.test(sql)) {
    const [userId, from] = args;
    const filtered = tables.entries.filter((e) => e.user_id === userId && e.log_date >= from);
    if (filtered.length === 0) return [{ count: 0, avg_happiness: null, avg_progress: null, success_count: 0 }];
    return [{
      count: filtered.length,
      avg_happiness: filtered.reduce((s, e) => s + e.happiness, 0) / filtered.length,
      avg_progress: filtered.reduce((s, e) => s + e.progress, 0) / filtered.length,
      success_count: filtered.filter((e) => e.progress >= 9.5).length,
    }];
  }

  // 11. Password reset token lookup by hash
  if (/FROM password_reset_tokens[\s\S]*WHERE token_hash = \?/i.test(sql)) {
    const [tokenHash] = args;
    const row = tables.password_reset_tokens.find((t) => t.token_hash === tokenHash);
    return row ? [row] : [];
  }

  console.error('Unhandled SQL Select:', sql, args);
  return [];
}

function runMutation(tables, sql, args) {
  // INSERT INTO users
  if (/INSERT INTO users/i.test(sql)) {
    const [id, email, password_hash, birthday] = args;
    tables.users.push({ id, email, password_hash, birthday, created_at: new Date().toISOString() });
    return;
  }

  // INSERT INTO entries
  if (/INSERT INTO entries/i.test(sql)) {
    const [id, user_id, name, happiness, progress, log_date] = args;
    tables.entries.push({ id, user_id, name, happiness, progress, log_date, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return;
  }

  // UPDATE entries SET
  if (/UPDATE entries SET/i.test(sql)) {
    const [name, happiness, progress, log_date, id, userId] = args;
    const entry = tables.entries.find((e) => e.id === id && e.user_id === userId);
    if (entry) { entry.name = name; entry.happiness = happiness; entry.progress = progress; entry.log_date = log_date; entry.updated_at = new Date().toISOString(); }
    return;
  }

  // DELETE FROM entries
  if (/DELETE FROM entries WHERE id = \? AND user_id = \?/i.test(sql)) {
    const [id, userId] = args;
    tables.entries = tables.entries.filter((e) => !(e.id === id && e.user_id === userId));
    return;
  }

  // INSERT INTO password_reset_tokens
  if (/INSERT INTO password_reset_tokens/i.test(sql)) {
    const [id, user_id, token_hash, expires_at] = args;
    tables.password_reset_tokens.push({ id, user_id, token_hash, expires_at, created_at: new Date().toISOString() });
    return;
  }

  // DELETE FROM password_reset_tokens WHERE user_id = ?
  if (/DELETE FROM password_reset_tokens WHERE user_id = \?/i.test(sql)) {
    const [userId] = args;
    tables.password_reset_tokens = tables.password_reset_tokens.filter((t) => t.user_id !== userId);
    return;
  }

  // UPDATE users SET password_hash
  if (/UPDATE users SET password_hash/i.test(sql)) {
    const [passwordHash, userId] = args;
    const user = tables.users.find((u) => u.id === userId);
    if (user) user.password_hash = passwordHash;
    return;
  }

  console.error('Unhandled SQL Mutation:', sql, args);
}

const env = {
  JWT_SECRET: 'test-secret-1234567890-test-secret-1234567890',
  // No RESEND_API_KEY — email sending skipped in tests
  DB: makeMockDb(),
};

let signupCounter = 0;
async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (path === '/api/auth/signup') {
    headers['CF-Connecting-IP'] = `127.0.0.${++signupCounter}`;
  }
  if (path === '/api/auth/forgot-password') {
    headers['CF-Connecting-IP'] = `10.0.0.${++signupCounter}`;
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

function tzDate(offsetDays = 0) {
  const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
  local.setUTCDate(local.getUTCDate() + offsetDays);
  return local.toISOString().slice(0, 10);
}
const tzToday = () => tzDate(0);
const tzDaysAgo = (n) => tzDate(-n);

console.log('Running worker API smoke test...');

// 1. Signup Alice
let r = await call('POST', '/api/auth/signup', { email: 'alice@example.com', password: 'password123', birthday: '1990-01-01' });
assert(r.status === 201, 'signup alice');
const aliceData = await r.json();
assert(aliceData.success === true, 'signup returns success');
assert(typeof aliceData.token === 'string', 'signup returns JWT token');
assert(aliceData.user.email === 'alice@example.com', 'signup returns email');
const aliceToken = aliceData.token;

// 2. Duplicate email rejected
r = await call('POST', '/api/auth/signup', { email: 'alice@example.com', password: 'password123', birthday: '1990-01-01' });
assert(r.status === 409, 'duplicate email rejected');

// 3. Invalid email rejected
r = await call('POST', '/api/auth/signup', { email: 'not-an-email', password: 'password123', birthday: '1990-01-01' });
assert(r.status === 400, 'invalid email rejected');

// 4. Short password rejected
r = await call('POST', '/api/auth/signup', { email: 'bob2@example.com', password: 'short', birthday: '1990-01-01' });
assert(r.status === 400, 'short password rejected');

// 5. Invalid birthday rejected
r = await call('POST', '/api/auth/signup', { email: 'bob2@example.com', password: 'password123', birthday: 'bad-date' });
assert(r.status === 400, 'invalid birthday rejected');

// 6. Login with correct credentials
r = await call('POST', '/api/auth/login', { email: 'alice@example.com', password: 'password123' });
assert(r.status === 200, 'login alice');
const loginData = await r.json();
assert(loginData.success === true, 'login returns success');
assert(typeof loginData.token === 'string', 'login returns token');

// 7. Login with wrong password
r = await call('POST', '/api/auth/login', { email: 'alice@example.com', password: 'wrongpassword' });
assert(r.status === 401, 'wrong password rejected');

// 8. Signup Bob
r = await call('POST', '/api/auth/signup', { email: 'bob@example.com', password: 'password456', birthday: '1992-02-02' });
assert(r.status === 201, 'signup bob');
const bobData = await r.json();
const bobToken = bobData.token;

// 9. Unauthenticated create rejected
r = await call('POST', '/api/entries', { name: 'x', happiness: 8, progress: 9, log_date: tzToday() });
assert(r.status === 401, 'unauthenticated create rejected');

// 10. Alice creates entries
const today = tzToday();
r = await call('POST', '/api/entries', { name: 'Built API', happiness: 8, progress: 10, log_date: today }, aliceToken);
assert(r.status === 201, 'alice create entry 1');
const e1 = await r.json();
assert(e1.name === 'Built API', 'entry name matches');
assert(e1.happiness === 8, 'entry happiness matches');

r = await call('POST', '/api/entries', { name: 'Fixed bug', happiness: 6, progress: 8, log_date: today }, aliceToken);
assert(r.status === 201, 'alice create entry 2');

r = await call('POST', '/api/entries', { name: 'Wrote docs', happiness: 10, progress: 10, log_date: today }, aliceToken);
assert(r.status === 201, 'alice create entry 3');

// 11. Bob creates entry (row-level isolation)
r = await call('POST', '/api/entries', { name: 'Bob task', happiness: 7, progress: 9, log_date: today }, bobToken);
assert(r.status === 201, 'bob create entry');

// 12. Alice sees only her entries
r = await call('GET', `/api/entries?date=${today}`, null, aliceToken);
const aliceList = await r.json();
assert(aliceList.length === 3, 'alice list returns 3 entries');
assert(aliceList.every((e) => e.user_id === aliceData.user.id), 'all entries belong to alice');

// 13. Bob sees only his entry
r = await call('GET', `/api/entries?date=${today}`, null, bobToken);
const bobList = await r.json();
assert(bobList.length === 1, 'bob list returns 1 entry');

// 14. Validation: bad rating
r = await call('POST', '/api/entries', { name: 'x', happiness: 11, progress: 5, log_date: today }, aliceToken);
assert(r.status === 400, 'rejects happiness > 10');

// 15. Alice updates her entry
r = await call('PUT', `/api/entries/${e1.id}`, { happiness: 10 }, aliceToken);
assert(r.status === 200, 'alice update entry');
const updated = await r.json();
assert(updated.happiness === 10, 'updated happiness applied');

// 16. Cross-user update rejected
r = await call('PUT', `/api/entries/${e1.id}`, { happiness: 10 }, bobToken);
assert(r.status === 404, 'bob cannot update alice entry');

// 17. Daily insights
r = await call('GET', `/api/insights/daily?from=${tzDaysAgo(10)}&to=${tzDaysAgo(-2)}`, null, aliceToken);
assert(r.status === 200, 'alice daily insights');
const daily = await r.json();
assert(daily.length === 1, 'one day in range');
assert(daily[0].count === 3, 'count is 3');
assert(daily[0].avgHappiness === 8.67, 'avgHappiness correct');
assert(daily[0].successRate === 0.67, 'successRate correct');

// 18. Rollup week
r = await call('GET', '/api/insights/rollup?period=week', null, aliceToken);
assert(r.status === 200, 'alice rollup week');
const rollup = await r.json();
assert(rollup.count === 3, 'rollup count is 3');

// 19. Heatmap
r = await call('GET', `/api/insights/heatmap?year=${tzToday().slice(0, 4)}`, null, aliceToken);
assert(r.status === 200, 'alice heatmap');
const heat = await r.json();
assert(heat.length === 1, 'heatmap one day');

// 20. Cross-user delete rejected
r = await call('DELETE', `/api/entries/${e1.id}`, null, bobToken);
assert(r.status === 404, 'bob cannot delete alice entry');

// 21. Alice deletes her entry
r = await call('DELETE', `/api/entries/${e1.id}`, null, aliceToken);
assert(r.status === 200, 'alice delete entry');

r = await call('GET', `/api/entries?date=${today}`, null, aliceToken);
const remaining = await r.json();
assert(remaining.length === 2, 'list now has 2 entries');

// 22. Decimal ratings round-trip
const decimalDate = tzDaysAgo(1);
r = await call('POST', '/api/entries', { name: 'Decimal entry', happiness: 7.3, progress: 8.6, log_date: decimalDate }, aliceToken);
assert(r.status === 201, 'create decimal entry');
const decEntry = await r.json();
assert(decEntry.happiness === 7.3, 'decimal happiness stored');
assert(decEntry.progress === 8.6, 'decimal progress stored');

// 23. Success rate >= 9.5 boundary
r = await call('POST', '/api/entries', { name: 'Near complete', happiness: 8.0, progress: 9.7, log_date: decimalDate }, aliceToken);
assert(r.status === 201, 'create 9.7 progress entry');
r = await call('GET', `/api/insights/daily?from=${decimalDate}&to=${decimalDate}`, null, aliceToken);
const decDaily = await r.json();
assert(decDaily[0].successRate === 0.5, 'successRate 0.5 (1 of 2 >= 9.5)');

// 24. Streaks
r = await call('POST', '/api/auth/signup', { email: 'carol@example.com', password: 'password789', birthday: '1995-03-03' });
assert(r.status === 201, 'signup carol');
const carolData = await r.json();
const carolToken = carolData.token;

r = await call('GET', '/api/insights/streak', null, carolToken);
let carolStreak = await r.json();
assert(carolStreak.currentStreak === 0, 'fresh user streak is 0');
assert(carolStreak.loggedToday === false, 'fresh user loggedToday false');

r = await call('POST', '/api/entries', { name: 'Streak start', happiness: 7, progress: 8, log_date: tzToday() }, carolToken);
assert(r.status === 201, 'carol logs today');
r = await call('GET', '/api/insights/streak', null, carolToken);
carolStreak = await r.json();
assert(carolStreak.currentStreak === 1, 'streak is 1 after logging today');
assert(carolStreak.loggedToday === true, 'loggedToday true');

await call('POST', '/api/entries', { name: 'Yesterday', happiness: 6, progress: 7, log_date: tzDaysAgo(1) }, carolToken);
await call('POST', '/api/entries', { name: 'Two days ago', happiness: 6, progress: 7, log_date: tzDaysAgo(2) }, carolToken);
r = await call('GET', '/api/insights/streak', null, carolToken);
carolStreak = await r.json();
assert(carolStreak.currentStreak === 3, 'streak is 3');
assert(carolStreak.longestStreak === 3, 'longestStreak is 3');

// 25. Forgot password — always returns 200 (no enumeration)
r = await call('POST', '/api/auth/forgot-password', { email: 'alice@example.com' });
assert(r.status === 200, 'forgot-password known email returns 200');
const forgotData = await r.json();
assert(forgotData.success === true, 'forgot-password returns success');

r = await call('POST', '/api/auth/forgot-password', { email: 'nobody@example.com' });
assert(r.status === 200, 'forgot-password unknown email also returns 200 (no enumeration)');

// 26. Reset password — grab token hash from mock DB
const tokenRow = env.DB._tables.password_reset_tokens[0];
assert(tokenRow !== undefined, 'reset token was stored in DB');

// Simulate the raw token: we need it to test reset. Re-issue a known token directly via the mock.
// Instead, test the invalid-token path (which is the primary security path to test):
r = await call('POST', '/api/auth/reset-password', { token: 'invalidtoken000', newPassword: 'newpassword123' });
assert(r.status === 400, 'invalid reset token rejected');

// Short new password rejected
r = await call('POST', '/api/auth/reset-password', { token: 'invalidtoken000', newPassword: 'short' });
assert(r.status === 400, 'short new password rejected on reset');

// 27. Input length caps
r = await call('POST', '/api/entries', { name: 'x'.repeat(201), happiness: 5, progress: 5, log_date: today }, aliceToken);
assert(r.status === 400, 'rejects name > 200 chars');

r = await call('POST', '/api/auth/signup', { email: 'longpw@example.com', password: 'p'.repeat(1025), birthday: '1990-01-01' });
assert(r.status === 400, 'rejects password > 1024 chars');

// 28. User cap (MAX_USERS = 50, owner excluded)
// alice (owner) + bob + carol = 2 non-owners. Fill to 50, then reject the 51st.
for (let i = 0; i < 48; i++) {
  r = await call('POST', '/api/auth/signup', {
    email: `capuser${i}@example.com`,
    password: 'password123',
    birthday: '1990-01-01',
  });
  if (r.status !== 201) {
    const body = await r.json().catch(() => ({}));
    assert(false, `cap fill failed at capuser${i}: ${r.status} ${body?.error || ''}`);
  }
}
assert(true, 'filled to 50 non-owner signups');

r = await call('POST', '/api/auth/signup', { email: 'overflow@example.com', password: 'password123', birthday: '1990-01-01' });
assert(r.status === 403, '51st non-owner signup rejected');

console.log('All API tests passed.');
