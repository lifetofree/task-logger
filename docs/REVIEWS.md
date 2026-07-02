# Code Review Log: Task Logger

Reviews are appended below, newest first. Each review references the product version under review.

---

## Review 5 — v4.8.1 / v4.8.2 (2026-07-02)

**Reviewer context**: Periodic quality review requested by the user on the current
HEAD. Scope covers the production state after the v4.8.1 dependency upgrades and
the v4.8.2 UX redesign. No new functionality was authored in this pass; the
reviewer's role is verification, drift detection, and follow-up triage.

### Executive Summary

Backend is green and secure: **78/78 assertions pass** (`node scripts/test-worker.mjs`),
`npm audit` reports **0 vulnerabilities** in both dependency trees, and the
frontend build is clean and fast (87 ms via Vite 8 / Rolldown). Coverage is
adequate for backend business rules including row-level isolation, decimal
ratings, success-threshold boundary (9.5), 50-user cap (owner-excluded), and
streak math.

**Status: Approved** for ship, with **three doc/version drifts to clean up** and
**two minor timezone cleanups** recommended before the next release. None are
production-blocking; the backend enforces correctness independently of these.

### Verification

- `node scripts/test-worker.mjs` → 78/78 ok, `All API tests passed.`
- `npm audit` (root) → 0 vulnerabilities.
- `npm audit --prefix frontend` → 0 vulnerabilities.
- `npm --prefix frontend run build` → clean, PWA manifest + service worker generated.

### Defects / Drifts Found in This Pass

| # | Severity | Area | Finding |
|---|----------|------|---------|
| D1 | **Med** | Docs | `docs/REQUIREMENTS.md` lines 214–222 still describe the **old integer** schema (`happiness INTEGER ... BETWEEN 1 AND 10`) but `schema.sql` has been `REAL` (1.0–10.0) since v4.7.0 (ADR 0006). Anyone reading REQUIREMENTS.md as source of truth sees the wrong constraints. |
| D2 | **Med** | Docs / Version | v4.8.2 commit (`6fa8b3b`) — a real UX redesign of StreakCard/WeeklyDigest with 206 insertions — is **absent from CHANGELOG.md, README.md, and STATUS.md**, and `frontend/src/version.js` still reads `4.8.1`. Production UI is therefore showing the wrong version stamp and CHANGELOG skips a shipped release. |
| D3 | Low | Docs | `docs/REQUIREMENTS.md` "Project Structure" block references only ADRs through 0005; ADRs 0006 (decimal step) and 0007 (streaks) exist but are missing from the listing. |
| D4 | Low | Docs | `docs/REQUIREMENTS.md` "Note" claims `DailySummaryCard`, `Heatmap`, `RollupCard`, and `TrendChart` "remain in the tree but are no longer rendered". These files were removed entirely — the note is stale. |
| D5 | Low | Frontend | `frontend/src/auth/SignupScreen.jsx` uses `max={new Date().toISOString().slice(0, 10)}` (UTC) to clamp the birthday picker. Every other "today" computation uses GMT+7 via `lib/date.js`. In a non-UTC browser with `local time` > GMT+7 (e.g. GMT+8/9) a user could pick "tomorrow in GMT+7" as a birthday. |
| D6 | Low | Frontend | `frontend/src/components/MementoMori.jsx` still uses `birthday + 'T00:00:00'` (local parse) and `new Date()` (local) for the today cursor / birthday anchor instead of the shared `lib/date.js` utilities. Works in practice for the current user base but is conceptually inconsistent with the GMT+7 contract. |

### Code-Quality Observations (no action required)

- The `route()` function correctly returns `null` so the fetch handler can chain
  ASSETS → index.html fallback; clean separation of API and SPA concerns.
- Worker error path returns `{ error: err.message }` with status 500, but the
  handler also `console.error`s first — useful for production debugging.
- The `update-banner` is rendered outside `<main>` (in `App.jsx`) so it sits
  above tabs on all views; consistent and non-blocking.
- `WeeklyDigest` deliberately swallows errors (`if (error) return null;`) — the
  product call for "non-critical" silence is correct, and the parent doesn't
  depend on this card.

### Carryover Follow-ups (still open from Review 3)

| # | Item | Severity | Status | Note |
|---|------|----------|--------|------|
| C1 | Test mock is regex-based, not real SQLite | Medium | Open | Replace with `better-sqlite3`. The mock now intercepts 10 distinct query shapes; any new query must be added manually. |
| C2 | In-memory rate limiter not shared across isolates | Medium | Open | Acceptable for the current 50-user cap. Move to KV/DO before any growth. |
| C3 | `TIMEZONE_OFFSET = 7` hardcoded + duplicated | Low | Open | Same value in `worker/src/index.js` and `frontend/src/lib/date.js`. Centralize as a constant in a single shared package, or read from an env var. |
| C4 | History & Memento Mori UI have no automated tests | Coverage | Open | Only API surfaces are covered today. The 80-year grid rendering, scroll-to-today, and history month-grouping logic are manual-only. |
| **C5** *(new)* | v4.8.2 release not recorded | Med | **New** | See D2 above — version bump, CHANGELOG entry, README version stamp. |
| **C6** *(new)* | REQUIREMENTS schema block is post-decimal drift | Med | **New** | See D1 above — recompute the inline SQL block from `schema.sql`. |
| **C7** *(new)* | SignupScreen birthday max uses UTC, not GMT+7 | Low | **New** | See D5 above — switch to `todayISO()` from `lib/date.js`. |

### Acceptance Criteria Verification (US-1..US-10)

| User Story | Status | Evidence |
|------------|--------|----------|
| US-1 Sign up | ✅ Pass | Signup success / 409 / 400 / 403 (cap) / 429 (rate limit) all tested in script 1–6 + user-cap section. |
| US-2 Log in | ✅ Pass | Login success + wrong password → 401 tested (script 4, 5). |
| US-3 Add entry | ✅ Pass | POST + validation, including rating bounds and decimal round-trip (script 8, 12, 21b, 21c). |
| US-4 View entries (Today) | ✅ Pass | `listEntries` scoped by `user_id` + date; tested (script 10, 11). |
| US-5 Edit entry | ✅ Pass | PUT owner-only; cross-user → 404 (script 13, 14). |
| US-6 Delete entry | ✅ Pass | DELETE owner-only; cross-user → 404 (script 18, 19). |
| US-7 History | ⚠️ API-only | `GET /api/history` returns all user entries newest-first (covered by data present in script 21b/c/d). Client grouping/search are manual-only. |
| US-8 Memento Mori | ⚠️ API-only | `heatmap` endpoint tested (script 17). 80-year client render + auto-scroll are manual-only. |
| US-9 Streaks | ✅ Pass | Streak endpoint covers fresh user, logged-today, graceful-degrade, longer run, gap, cross-user isolation (script 21d, 8 assertions). |
| US-10 Weekly Digest | ⚠️ API-only | Digest reuses `/api/insights/daily` which is tested; client-side average/delta computation is manual-only. |

### Architecture / Stack Sanity

- `wrangler.toml` ✅ — `compatibility_date = 2024-04-01` (current), D1 binding present, custom-domain route set, asset binding configured.
- `schema.sql` ✅ — `DROP TABLE IF EXISTS` head, `users` and `entries` properly indexed on `user_id`+`log_date` and `user_id`+`created_at`.
- `package.json` (root) ✅ — minimal: `bcryptjs`, `jose`, `wrangler` devDep only.
- `frontend/package.json` ✅ — PWA via `vite-plugin-pwa` 1.3.0, `autoUpdate` matches app intent.
- CI workflow ✅ — runs API tests + frontend build on push/PR; cancels on ref; Node 22; caches both lockfiles.

---

## Review 4 — v4.8.0 (2026-07-02)

**Reviewer context**: Tier 1 feature release — streaks, weekly digest, and a documentation sync that also corrects the v4.7.0 doc drift. Implementation of a PO-defined retention roadmap.

### Executive Summary

Two new frontend-facing features (StreakCard, WeeklyDigest) backed by one new backend endpoint (`GET /api/insights/streak`). The weekly digest deliberately reuses the existing `/api/insights/daily` endpoint — no backend change for the digest, keeping the surface area minimal. Test suite expanded to 57 assertions (from 39) and verified green. Two pre-existing latent defects were found and fixed during this work: a date-sensitive rollup test (false failure after the test date aged out of the 7-day window) and a UTC-vs-local streak day-subtraction bug.

**Status: Approved**, with the existing non-blocking follow-ups still carried.

### Scope Reviewed

- `worker/src/index.js` — new `handleStreak` + `computeStreaks` + `dayBefore` (UTC date math).
- `frontend/src/components/StreakCard.jsx`, `WeeklyDigest.jsx` — new.
- `frontend/src/views/TodayView.jsx` — streak fetch + refetch on create/delete; mounts both cards.
- `frontend/src/api/client.js` — `streak()` method.
- `scripts/test-worker.mjs` — streak mock branch, 13 new assertions, today-relative dates throughout.
- Docs — README, REQUIREMENTS (US-9/US-10), STATUS, CHANGELOG, ADR 0007.

### Verification

- `node scripts/test-worker.mjs` → 57/57 ok, `All API tests passed.`
- `npm run build` (frontend) → clean, PWA manifest generated.

### Defects Found & Fixed in This Pass

1. **Test date-sensitivity** (pre-existing, latent) — fixed-date test entries fell outside the rollup's real-time 7-day window once the calendar advanced past them. Tests now use `tzToday()`/`tzDaysAgo()`.
2. **Streak UTC day-math** (introduced then fixed) — `new Date(d + 'T00:00:00')` drifts in non-UTC environments; fixed with an explicit `...T00:00:00Z` parse in `dayBefore`.
3. **User-cap test accounting** — the streak test added a third user (carol); cap-fill loop adjusted from 49 to 48 to match.

### Carryover Follow-ups (unchanged from Review 3)

| # | Item | Severity | Note |
|---|------|----------|------|
| 1 | Test mock is regex-based, not real SQLite | Medium | Replace with `better-sqlite3` |
| 2 | In-memory rate limiter not shared across isolates | Medium | Move to KV/Durable Objects if scaling |
| 3 | `TIMEZONE_OFFSET = 7` hardcoded + duplicated | Low | Centralize |
| 4 | History & Memento Mori UI have no automated tests | Coverage | Only APIs are tested |

---

## Review 3 — v4.6.0 (2026-06-27)

**Reviewer context**: Documentation-sync review. The deployed product had drifted far from `REQUIREMENTS.md` / `CONTEXT.md` (which still described a v1.0–v1.2 single-user, 1–5-scale app). This review covers both the production code at v4.6.0 and the documentation update performed in this pass.

### Executive Summary

The backend (`worker/src/index.js`, 481 LOC) is clean, secure, and **verified green**: `node scripts/test-worker.mjs` passes 39/39 assertions covering signup, login, JWT auth, CRUD, row-level isolation, validation, and insights math. The schema and worker are consistent. The documentation drift — the most significant defect — has been corrected in this pass (REQUIREMENTS, CONTEXT, this file, and ADRs 0004/0005).

**Status: Approved** for the backend, with follow-ups tracked below.

### Verified

- **Auth & isolation**: HS256 JWT (7-day), bcrypt cost 12, every query filtered by `user_id`, ownership re-check before update/delete (cross-user → 404, no leak). ✅
- **Validation**: happiness/progress integer 1–10, username regex, password ≥ 8, birthday valid date, name non-empty. ✅
- **Business rules**: duplicate username → 409, signup rate limit (5/hr/IP), 50-user cap (owner excluded). ✅
- **Insights math**: daily/rollup AVG rounding, `successRate` (progress=10 fraction) match expected values (8.67 / 9.33 / 0.67). ✅
- **Static asset fallback**: `/api/*` 404 → `env.ASSETS` → SPA `index.html` fallback chain correct. ✅

### Follow-ups (non-blocking, tracked separately)

| # | Item | Severity | Note |
|---|------|----------|------|
| 1 | Rate limiter uses in-memory `Map` (not shared across isolates/regions) | Medium | Acceptable for MVP; move to KV/DO before any growth. |
| 2 | No test coverage for the 50-user cap branch (`effectiveCount = count - 1`) | Medium | Off-by-one risk; mock already supports it. |
| 3 | Test mock hand-rolls SQL via regex (fragile, no real SQLite semantics) | Medium | Replace with `better-sqlite3`. Flagged in prior reviews too. |
| 4 | No upper length bound on `name` / `password` / `birthday` body | Low | Cap `name` (≤200, enforced in UI only), bcrypt-safe password length. |
| 5 | `TIMEZONE_OFFSET = 7` hardcoded in worker + duplicated in 3 frontend files | Low | Centralize; v4.6.0 was a fix for this very class of bug. |
| 6 | Legacy unused components: `DailySummaryCard`, `Heatmap`, `RollupCard`, `TrendChart` | Low | Candidates for removal. |
| 7 | No CI, no README, no `wrangler dev` local-dev docs | Low | DevOps (Stage 7) gaps. |

### AC Verification (US-1..US-8)

| User Story | Status | Evidence |
|------------|--------|----------|
| US-1 Sign up | ✅ Pass | Tests cover success, dup (409), invalid input (400), cap. |
| US-2 Log in | ✅ Pass | Tests cover success + wrong password (401). |
| US-3 Add entry | ✅ Pass | Tests cover create + validation (happiness > 10 → 400). |
| US-4 View entries | ✅ Pass | `listEntries` scoped by `user_id` + date; tested. |
| US-5 Edit entry | ✅ Pass | PUT owner-only; cross-user update → 404 tested. |
| US-6 Delete entry | ✅ Pass | DELETE owner-only; cross-user delete → 404 tested. |
| US-7 History | ⚠️ API-only | Endpoint tested indirectly; UI grouping/search not covered by automated tests. |
| US-8 Memento Mori | ⚠️ API-only | `heatmap` endpoint tested; 80-year client rendering/scroll is manual-only. |

---

## Review 2 — v1.2.0 (2026-06-24) *[archived — supersedes the v1.0 review]*

The project logic was cleanly implemented, secure, and aligned with the multi-user architecture. **However, the automated test suite (`scripts/test-worker.mjs`) was completely broken** — it still used the old single-user `X-Auth-Token` header and `{ token }` payloads after the migration to JWT auth.

**Status: Rejected (rollback to Coder)** to align the test suite with the production API.

Key findings at the time:
1. **Broken test suite** — failed on the first assertion; used removed auth flow.
2. **Fragile SQL mocking** — hardcoded regex interception; breaks on whitespace/format changes. Recommended `better-sqlite3`.
3. **In-memory rate limit volatility** — `Map()` not shared across Workers isolates/regions.

*Resolution*: The Coder rewrote the test suite for JWT auth (Review 3 confirms it now passes 39/39). Items 2 and 3 carried forward as follow-ups.

---

## Review 1 — v1.0.0 (2026-06-24) *[archived]*

Initial-release review. Accepted the single-user `X-Auth-Token` build with the 22-test smoke suite. Superseded by v1.1.0 (multi-user) and the v2.0.0 breaking scale change.
