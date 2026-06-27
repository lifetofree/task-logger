# Glossary

> Reflects product v4.6.0. See CHANGELOG.md for evolution.

## Task Log Entry

A record of work done on a specific task, capturing subjective reflections rather than serving as a to-do item or a time tracker. Each entry represents "I worked on this task, here's how I felt and how far I got."

Core fields: task name, Happiness, Progress, Log Date. Owned by exactly one User (`user_id`).

## Happiness

A **1–10** subjective rating of how the user felt while working on a task. Represented in the UI as a gradient slider (red = awful at 1, green = perfect at 10) with descriptive labels (Awful, Bad, Meh, OK, Good, Great, Happy, Joyful, Amazing, Perfect). A per-entry input. *(Changed from 1–5 emoji in v2.0.0; see ADR 0005.)*

## Progress

A **1–10** subjective rating of how much progress was made on a task. Represented in the UI as a slider shown in 10% increments (1 = 1%, 10 = 100%). A per-entry input. *(Changed from 1–5 in v2.0.0; see ADR 0005.)*

## Success Rate

A **derived** metric, not a user input. Computed from Progress values across entries: the fraction of entries in a period that reached Progress level 10. Returned as a decimal (e.g. `0.67`), not a percentage.

## Log Date

The calendar date a Task Log Entry is associated with. Defaults to today when creating an entry, but the user can change it to backfill a previous day (capped at today; future dates are blocked in the UI). Distinct from the system timestamps (`created_at`, `updated_at`). All "today" math uses **GMT+7** (`TIMEZONE_OFFSET = 7`) on both server and client.

## Daily Summary

A computed view aggregating all Task Log Entries for a single Log Date: average Happiness, average Progress, total entry count, and Success Rate. Returned by `/api/insights/daily`.

## Heatmap Cell

A computed per-day aggregate `{ date, happiness, progress, count }` for a given year, returned by `/api/insights/heatmap`. Used by the Memento Mori visualization to color each day by average happiness.

## User

A registered account that owns Task Log Entries. Identified by `id` (32-char hex), uniquely identified by `username` (3–32 lowercase alphanumeric + underscore), authenticated by `password_hash` (bcrypt, cost 12). Carries a `birthday` (`YYYY-MM-DD`) used to render the Memento Mori grid. Created via signup, authenticated via login; both endpoints return a signed JWT. Registration is capped at 50 users (the owner is excluded from the count).

## AuthToken (JWT)

A signed JSON Web Token returned by `/api/auth/signup` and `/api/auth/login`. Sent by the client as `Authorization: Bearer <jwt>`. Contains `sub` (user id), `iat`, and `exp`. Lifetime: 7 days. Signed with HS256 via `JWT_SECRET`. Stored client-side in `localStorage` under `task-logger:jwt`.

## Session

The state of "this browser is authenticated as user X." On the client: JWT in `localStorage` plus the user object under `task-logger:user`. On the server: stateless — the JWT is verified on every request. A 401 from any endpoint clears the session and dispatches an `auth:logout` event.

## Memento Mori

A visualization (the "Memento" tab) rendering an 80-year, day-by-day grid starting from the user's birthday. Each day cell is colored by that day's average Happiness (red→amber→green gradient). Past days without entries render as "lived"; future days render with a soft light style; today is highlighted. The grid auto-scrolls so today's row is the 10th visible row. The top block shows days lived, days ahead, a rotating Stoic quote, and a 1–10 happiness legend. *(Introduced in v3.0.0; refined through v4.6.0; see ADR 0004.)*

## History

The "History" tab: shows the user's entries from the **last 7 days** by default, grouped by month/year (most recent first). A search box filters across *all* entries by task name, date, happiness, or progress value. Entries are rendered read-only. Backed by `GET /api/history`. *(Introduced in v4.0.0.)*
