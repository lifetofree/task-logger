# Code Review: Task Logger (Version 1.2.0)

## Executive Summary

The project logic for the **Task Logger** application is cleanly implemented, secure, and aligns with the multi-user architecture defined in `CHANGELOG.md` and `CONTEXT.md` (version 1.1.0/1.2.0 updates). However, the automated test suite ([scripts/test-worker.mjs](file:///Users/lifetofree/Documents/Projects/task-logger/scripts/test-worker.mjs)) is completely broken. It has not been updated since the migration from single-user `X-Auth-Token` to JWT-based multi-user session authentication.

Consequently, **this review rejects the current build** and recommends a rollback to the **Coder (Stage 5)** to align the test suite with the production API changes.

---

## Detailed Findings

### 1. Broken Test Suite
- **Location**: [scripts/test-worker.mjs](file:///Users/lifetofree/Documents/Projects/task-logger/scripts/test-worker.mjs)
- **Problem**: The smoke tests attempt to authenticate using `X-Auth-Token` header and log in using `{ token }` payloads, which are no longer supported. This results in immediate 400/401 errors during the test run.
- **Impact**: The test suite fails on the very first assertion (`login rejects bad token`).

### 2. SQLite Database Mocking Fragility (Tech Lead / Architect Feedback)
- **Location**: [scripts/test-worker.mjs](file:///Users/lifetofree/Documents/Projects/task-logger/scripts/test-worker.mjs)
- **Problem**: The custom mock database intercepts SQL requests via hardcoded regular expressions. This is fragile and breaks easily if the Coder alters whitespace, formatting, or column names in queries.
- **Recommendation**: Consider using an in-memory SQLite database (`better-sqlite3` or wrangler local dev tooling) rather than a custom parser mock.

### 3. In-Memory Rate Limiting Volatility
- **Location**: [worker/src/index.js#L105-L117](file:///Users/lifetofree/Documents/Projects/task-logger/worker/src/index.js#L105-L117)
- **Problem**: The IP rate limiter uses a simple in-memory `Map()`. In a serverless Cloudflare Workers environment, isolates are frequently recycled and maps are not shared across regions or worker cold starts.
- **Recommendation**: Acceptable for MVP rate limiting, but for robust production security, it should be migrated to Cloudflare KV or D1.

---

## Acceptance Criteria (AC) Verification

| User Story | Status | Notes |
|------------|--------|-------|
| **US-1: First-time access (Login)** | ⚠️ Unverified | Code implemented correctly, but login smoke tests fail. |
| **US-2: Add a task log entry** | ⚠️ Unverified | Code implemented correctly, but entries creation tests fail. |
| **US-3: View today's entries** | ⚠️ Unverified | View and API exist, but smoke tests are blocked. |
| **US-4: Edit an entry** | ⚠️ Unverified | Edit endpoints exist, but smoke tests are blocked. |
| **US-5: Delete an entry** | ⚠️ Unverified | Delete endpoints exist, but smoke tests are blocked. |
| **US-6: Trend charts (Insights)** | ⚠️ Unverified | Recharts components implemented, but API tests are blocked. |
| **US-7: Daily summaries** | ⚠️ Unverified | API and card components exist, but tests fail. |
| **US-8: Calendar heatmap** | ⚠️ Unverified | Heatmap view implemented, but tests fail. |

---

## Handoff & Recommendation
**Status: Rejected (Rollback to Coder)**

- **Target Agent**: Coder
- **Required Action**: Rewrite the test runner in [scripts/test-worker.mjs](file:///Users/lifetofree/Documents/Projects/task-logger/scripts/test-worker.mjs) to:
  1. Use the correct sign-up and login endpoints (`/api/auth/signup` and `/api/auth/login`) with `username`/`password` payloads.
  2. Capture the returned JWT and send it via the standard `Authorization: Bearer <token>` header for subsequent requests.
  3. Correct all assertions to expect the new response shapes and status codes.
