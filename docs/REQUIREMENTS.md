# Task Logger: Requirements & Specification

> **Version:** 4.6.0 (2026-06-26). This document reflects the *currently deployed* product.
> The original v1.0 single-user spec is superseded; see ADRs 0001–0005 for the decision history.

## Overview

A multi-user web application and Progressive Web App (PWA) for daily task logging. Each user records tasks they worked on, how happy they felt doing them (1–10), and how much progress they made (1–10). Over time, the app surfaces a History of past entries and a Memento Mori life-grid visualization tied to the user's birthday, supporting personal reflection and habit-building.

**Runtime**: Cloudflare Workers + Cloudflare D1 (SQLite at the edge).
**Frontend**: React + Vite + vite-plugin-pwa, served as static assets from the same Worker.
**Auth**: Multi-user signup/login with username + password; JWT (HS256, 7-day) sessions via `Authorization: Bearer <jwt>`.

---

## Domain Model

Two stored entities: **User** and **Task Log Entry**.

### User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | 32-char hex random identifier. |
| `username` | TEXT | NOT NULL, UNIQUE | 3–32 chars, lowercase alphanumeric + underscore. |
| `password_hash` | TEXT | NOT NULL | bcrypt hash (cost 12) via `bcryptjs`. |
| `birthday` | TEXT | NOT NULL DEFAULT '1983-09-11' | `YYYY-MM-DD`. Drives the Memento Mori grid. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Row insert timestamp. |

### Task Log Entry

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | 32-char hex random identifier. |
| `user_id` | TEXT | NOT NULL, FK -> users.id | Owning user (row-level isolation). |
| `name` | TEXT | NOT NULL | Name of the task worked on (≤ 200 chars in UI). |
| `happiness` | INTEGER | NOT NULL, CHECK 1..10 | Subjective feeling (1=awful, 10=perfect). |
| `progress` | INTEGER | NOT NULL, CHECK 1..10 | Progress made (1=1%, 10=100%). |
| `log_date` | TEXT | NOT NULL | Calendar date `YYYY-MM-DD` (user-selectable). |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Row insert timestamp. |
| `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last modification timestamp. |

### Derived Concepts (not stored)

- **Daily Summary** — `{ avgHappiness, avgProgress, count, successRate }` for a single `log_date`. `successRate` = fraction of entries with `progress = 10`.
- **Rollup Summary** — aggregate of the above over a period (week / month / 30d).
- **Heatmap Cell** — `{ date, happiness, progress, count }` daily aggregates for a given year (used by the Memento Mori visualization).
- **Days Lived / Days Ahead** — derived from `users.birthday` and today (80-year horizon) for the Memento Mori stats.

---

## User Stories & Acceptance Criteria

### US-1: Sign up (new user)

**As a** new visitor,
**I want to** create an account with username, password, and birthday,
**So that** I can start logging and see my Memento Mori grid.

**Acceptance Criteria**:
- SignupScreen is the default landing for unauthenticated visitors.
- Fields: username, password (≥ 8 chars), confirm password, birthday.
- Username is lowercased on input; must match `^[a-z0-9_]{3,32}$`.
- On success: `POST /api/auth/signup` returns `{ success, token, user }`; token + user stored; app transitions to Today.
- Duplicate username → 409. Invalid input → 400 with inline error.
- Registration is capped at **50 users** (the owner/first user is excluded from the count). 51st signup → 403.
- Signup is IP-rate-limited (5/hour, best-effort in-memory).

### US-2: Log in (returning user)

**As a** returning user,
**I want to** sign in with username + password,
**So that** I access my log.

**Acceptance Criteria**:
- LoginScreen reachable via "Already have an account? Sign in".
- `POST /api/auth/login` validates credentials (bcrypt compare). Wrong creds → 401 with generic message.
- On success: token + user stored; app transitions to Today.
- "Sign out" clears the session and returns to the login screen.

### US-3: Add a task log entry

**As a** daily user,
**I want to** record a task, how I felt, and my progress,
**So that** I capture reflections during or right after the work.

**Acceptance Criteria**:
- The Today tab shows an entry form.
- Fields: Date (defaults to today, picker allows backfill, max = today), Task Name (text, ≤ 200 chars), Happiness (1–10 gradient slider, red→green), Progress (1–10 slider shown as 10% increments).
- Submitting creates an entry via `POST /api/entries`.
- Form clears on success; entry appears at top of the list for that date.
- Validation: name non-empty, happiness 1–10, progress 1–10, `log_date` valid `YYYY-MM-DD`.

### US-4: View entries for a date (Today)

**As a** daily user,
**I want to** see all entries I logged on a selected date,
**So that** I can review what I accomplished and how I felt.

**Acceptance Criteria**:
- Today tab lists entries for the selected `log_date` (default today).
- Each entry displays name, happiness chip (e.g. "😊 7/10"), progress chip (e.g. "📊 60%"), date, and supports inline edit + delete.
- Date is selectable; the list reloads for the chosen date.

### US-5: Edit an entry

**As a** daily user,
**I want to** correct mistakes,
**So that** my data stays accurate.

**Acceptance Criteria**:
- Tapping an entry opens inline edit mode pre-filled with current values.
- Saving issues `PUT /api/entries/:id` and updates `updated_at`.
- Cancel reverts without changes.

### US-6: Delete an entry

**As a** daily user,
**I want to** remove an entry,
**So that** my log reflects only intended entries.

**Acceptance Criteria**:
- Each entry has a delete action with confirmation.
- Confirming issues `DELETE /api/entries/:id`; entry removed immediately.

### US-7: History

**As a** returning user,
**I want to** browse my past entries,
**So that** I can look back over time.

**Acceptance Criteria**:
- History tab shows the **last 7 days** of entries by default, grouped by month/year, most recent first.
- A search box filters across *all* entries (not just recent) by task name, date, happiness, or progress value.
- Each entry rendered read-only (name + happiness/progress chips + date).
- `GET /api/history` returns all the user's entries.

### US-8: Memento Mori visualization

**As a** user who entered a birthday,
**I want to** see a day-by-day life grid colored by my happiness,
**So that** I reflect on time and consistency.

**Acceptance Criteria**:
- "Memento" tab renders an 80-year, day-by-day grid starting from the user's birthday (28 days per row).
- Top block shows: days lived, days ahead, a rotating Stoic quote, and a happiness 1–10 legend.
- Each day cell is colored by the day's average happiness (red→amber→green gradient). Days without entries but in the past render as "lived"; future days render with a soft light style.
- Grid auto-scrolls on load so today's row is the 10th visible row.
- Data fetched via `GET /api/insights/heatmap?year=YYYY` for each year from birthday to birthday+80, batched 10 years at a time.
- If no birthday is set, an empty state explains signup requires a birthday.

---

## API Endpoints

All `/api/*` routes except `signup`/`login` require `Authorization: Bearer <jwt>`.

| Method | Path | Body / Query | Response | Description |
|--------|------|--------------|----------|-------------|
| POST | `/api/auth/signup` | `{ username, password, birthday }` | `{ success, token, user }` (201) | Creates account; rate-limited; capped at 50 users. |
| POST | `/api/auth/login` | `{ username, password }` | `{ success, token, user }` (200) | Validates credentials, returns JWT. |
| GET | `/api/auth/me` | — | `{ user }` | Returns the authenticated user. |
| GET | `/api/entries?date=YYYY-MM-DD` | optional `date` | `Entry[]` | Entries for a date (defaults to today). |
| POST | `/api/entries` | `{ name, happiness, progress, log_date }` | `Entry` (201) | Creates an entry. |
| PUT | `/api/entries/:id` | `{ name?, happiness?, progress?, log_date? }` | `Entry` | Updates an entry (owner-only). |
| DELETE | `/api/entries/:id` | — | `{ success: true }` | Deletes an entry (owner-only). |
| GET | `/api/history` | — | `Entry[]` | All entries for the user, newest first. |
| GET | `/api/insights/daily?from=&to=` | date range | `DailySummary[]` | Daily aggregates for charts/rollups. |
| GET | `/api/insights/rollup?period=week\|month\|30d` | — | `RollupSummary` | Period rollup. |
| GET | `/api/insights/heatmap?year=YYYY` | optional year | `HeatmapCell[]` | Daily aggregates for one year. |

**Cross-user isolation**: every entry and insights query filters by `user_id` from the JWT. A request for another user's entry returns 404 (no leak).

---

## Data Model (`schema.sql`)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  birthday TEXT NOT NULL DEFAULT '1983-09-11',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  happiness INTEGER NOT NULL CHECK (happiness BETWEEN 1 AND 10),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 1 AND 10),
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_entries_user_date ON entries (user_id, log_date);
CREATE INDEX idx_entries_user_created ON entries (user_id, created_at);
```

---

## Project Structure

```
/
├── CONTEXT.md                            # Glossary
├── STATUS.md                             # SDLC handoff tracker
├── CHANGELOG.md                          # Release history (source of truth for changes)
├── schema.sql                            # D1 schema
├── wrangler.toml                         # Worker + D1 + custom domain config
├── docs/
│   ├── REQUIREMENTS.md                   # This document
│   ├── REVIEWS.md                        # Code review log
│   └── adr/
│       ├── 0001-cloudflare-workers-d1-edge-architecture.md
│       ├── 0002-pwa-app-shell-only-no-offline-data.md
│       ├── 0003-multi-user-jwt-auth-replaces-token.md
│       ├── 0004-memento-mori-pivot.md
│       └── 0005-rating-scale-1-to-10.md
├── worker/
│   └── src/
│       └── index.js                      # API routes + static asset serving
├── frontend/
│   ├── package.json
│   ├── vite.config.js                    # vite-plugin-pwa (autoUpdate)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                       # 3 tabs: Today / History / Memento
│       ├── version.js
│       ├── styles.css
│       ├── api/client.js                 # fetch wrapper + session storage
│       ├── auth/
│       │   ├── LoginScreen.jsx
│       │   └── SignupScreen.jsx
│       ├── components/
│       │   ├── EntryForm.jsx             # 1-10 sliders
│       │   ├── EntryItem.jsx             # inline edit/delete
│       │   ├── DailySummaryCard.jsx      # (legacy, unused in current UI)
│       │   ├── MementoMori.jsx           # 80-year day grid
│       │   ├── Heatmap.jsx               # (legacy, unused in current UI)
│       │   ├── RollupCard.jsx            # (legacy, unused in current UI)
│       │   └── TrendChart.jsx            # (legacy, unused in current UI)
│       └── views/
│           ├── TodayView.jsx
│           ├── HistoryView.jsx
│           └── InsightsView.jsx          # hosts MementoMori
├── scripts/
│   ├── test-worker.mjs                   # API smoke tests (mock D1)
│   └── gen-icons.cjs                     # PWA icon generator
└── package.json                          # root: build/deploy/db scripts
```

> **Note:** `DailySummaryCard`, `Heatmap`, `RollupCard`, and `TrendChart` remain in the tree but are no longer rendered by any view. They are candidates for removal.

---

## Configuration (`wrangler.toml`)

```toml
name = "task-logger"
main = "worker/src/index.js"
compatibility_date = "2024-04-01"

routes = [
  { pattern = "task-logger.adduckivity.com", custom_domain = true }
]

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "task-logger-db"
database_id = "<your-d1-database-id>"
```

Secrets (set via `wrangler secret put`): `JWT_SECRET`. There is no `AUTH_TOKEN` since v1.1.0.

---

## Operational Constants (worker)

| Constant | Value | Notes |
|----------|-------|-------|
| `BCRYPT_COST` | 12 | ~250ms per signup/login. |
| `JWT_LIFETIME_SECONDS` | 7 days | Stateless, HS256. |
| `RATE_LIMIT_MAX` / `_WINDOW_MS` | 5 / hour per IP | In-memory `Map` (best-effort on Workers). |
| `MAX_USERS` | 50 | Owner (first user) excluded from the count. |
| `TIMEZONE_OFFSET` | 7 (GMT+7) | Used for `log_date` "today" math on server and client. |

---

## Out of Scope (current)

- Offline write queue or local-first sync (ADR 0002).
- Password reset / email verification / profile editing (ADR 0003).
- Categories, tags, time tracking, or duration.
- Data export/import.
- Push notifications.
- API versioning (endpoints are unversioned `/api/...`).
