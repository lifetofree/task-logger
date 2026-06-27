# Code Review Log: Task Logger

Reviews are appended below, newest first. Each review references the product version under review.

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
