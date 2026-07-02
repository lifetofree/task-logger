# ADR 0007: Streaks & Weekly Digest (Tier 1 Retention Features)

## Status
Accepted (shipped in v4.8.0, 2026-07-02)

## Context
Task Logger's core loop — log an entry, see it on the Memento Mori grid — is
thin. Once novelty fades there is little pulling a user back daily or rewarding
consistency. The Product Owner identified this as the primary retention risk
(not a feature-gap vs. to-do apps) and defined a Tier 1 roadmap focused on
making the daily act more meaningful and the long-term view more revealing,
without diluting the product's reflection-and-mortality identity.

Two features were selected for Tier 1:

1. **Streaks** — current/longest streak and days-logged metrics, surfaced as a
   daily "don't break the chain" nudge on the Today view.
2. **Weekly digest** — a comparison of the last 7 days vs the prior 7, so the
   data speaks weekly rather than only through the passive grid.

Alternatives considered:
- **Tags/categories (Tier 2)** — high value but a schema change; deferred.
- **Data export (Tier 2)** — trust feature, deferred.
- **Notifications/push** — rejected until there is a digest worth notifying about.

## Decision

### Streaks — new backend endpoint
Add `GET /api/insights/streak` returning
`{ currentStreak, longestStreak, daysLoggedThisYear, totalDaysLogged, loggedToday }`.

- `currentStreak` counts consecutive days ending **today**, with a **grace
  period**: if today is not yet logged, it counts from yesterday so the streak
  is not "broken" mid-day (Duolingo convention — rewards coming back the same
  day rather than punishing timezones/schedule).
- Computation is done in JS from `SELECT DISTINCT log_date ... ORDER BY log_date DESC`.
  One query, no schema change, no new stored state.
- Date subtraction uses an explicit UTC parse (`...T00:00:00Z`) via a
  `dayBefore` helper to avoid local-timezone off-by-one drift.

### Weekly digest — no backend change
The digest reuses the existing, already-tested `GET /api/insights/daily`
endpoint with a 14-day window, splitting into this-week (last 7) and last-week
(prior 7) client-side. This keeps the backend surface unchanged and the digest
trivially correct because it relies on the same aggregation the Memento Mori
grid uses.

### Frontend
- `StreakCard` mounts at the top of the Today view; refetches after create/delete.
- `WeeklyDigest` mounts below the entries list; hidden when the current week
  has no entries (no empty-state noise).

## Consequences
- One new public API endpoint to maintain and test.
- The streak "grace period" means `currentStreak` can momentarily read one
  higher than the strict consecutive count before today's first entry — this is
  intentional and documented in US-9.
- The digest inherits the daily endpoint's behavior and timezone handling; no
  independent drift risk.
- No schema migration, no new dependencies, no PWA/offline implications.
