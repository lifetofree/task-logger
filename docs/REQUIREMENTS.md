# Task Logger: Requirements & Specification

## Overview

A personal, single-user web application and Progressive Web App (PWA) for daily task logging. The user records tasks they worked on, how happy they felt doing them, and how much progress they made. Over time, the app surfaces trends, daily summaries, and a calendar heatmap to support personal reflection and habit-building.

**Runtime**: Cloudflare Workers + Cloudflare D1 (SQLite at the edge).
**Frontend**: React + Vite + vite-plugin-pwa, served as static assets from the same Worker.
**Auth**: Single-user, token-based (`X-Auth-Token` header), stored in localStorage after entry.

---

## Domain Model

A single entity: **Task Log Entry**.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Short random identifier (8 chars base36). |
| `name` | TEXT | NOT NULL | Name of the task worked on. |
| `happiness` | INTEGER | NOT NULL, CHECK 1..5 | Subjective feeling (1=sad, 5=great). |
| `progress` | INTEGER | NOT NULL, CHECK 1..5 | Progress made (1=just started, 5=complete). |
| `log_date` | TEXT | NOT NULL | Calendar date in `YYYY-MM-DD` (user-selectable). |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Row insert timestamp. |
| `updated_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last modification timestamp. |

### Derived Concepts (not stored)

- **Success Rate** — derived from `progress` values. E.g., the fraction of entries on a date with `progress = 5`.
- **Day Score** — daily aggregate used to color the heatmap (composite of `happiness` and `progress`).
- **Daily Summary** — `{ avgHappiness, avgProgress, count }` for a single `log_date`.

---

## User Stories & Acceptance Criteria

### US-1: First-time access (Login)

**As a** first-time visitor,
**I want to** enter an access token to unlock the app,
**So that** only I can write to my personal log.

**Acceptance Criteria**:
- App shows a single-input login screen on first visit.
- Token is validated against the Worker's `AUTH_TOKEN` environment variable.
- On success, token is stored in `localStorage` under `task-logger:token`.
- On success, the app transitions to the main view.
- On failure (401), an inline error is shown.
- A "Sign out" option in the app clears the token and returns to the login screen.

### US-2: Add a task log entry

**As a** daily user,
**I want to** quickly record a task I worked on, how I felt, and my progress,
**So that** I capture reflections during or right after the work.

**Acceptance Criteria**:
- The "Today" tab shows an entry form at the top.
- Form fields: Task Name (text), Happiness (5 emoji icons, tappable), Progress (1-5 slider or icon row).
- `log_date` defaults to today; a date picker is available to backfill a previous day.
- Submitting creates an entry via `POST /api/entries`.
- Form clears on success.
- Validation: `name` non-empty, `happiness` 1-5, `progress` 1-5.

### US-3: View today's entries

**As a** daily user,
**I want to** see all entries I logged today,
**So that** I can review what I accomplished and how I felt.

**Acceptance Criteria**:
- "Today" tab lists entries for the currently selected `log_date` (default today).
- Each entry displays: name, happiness emoji, progress value, last-updated time.
- A daily summary card at the top shows: entry count, average happiness, average progress.
- List updates immediately after add/edit/delete.

### US-4: Edit an entry

**As a** daily user,
**I want to** correct mistakes (typos, mis-tapped ratings),
**So that** my data stays accurate.

**Acceptance Criteria**:
- Tapping an entry opens an edit mode (inline or modal).
- Form pre-fills with the entry's current values.
- Saving issues `PUT /api/entries/:id` and updates `updated_at`.
- Cancel reverts without changes.

### US-5: Delete an entry

**As a** daily user,
**I want to** remove an entry entirely,
**So that** my log reflects only real, intended entries.

**Acceptance Criteria**:
- Each entry has a delete action with confirmation.
- Confirming issues `DELETE /api/entries/:id`.
- Entry is removed from the list immediately.

### US-6: Trend charts (Insights)

**As a** daily user,
**I want to** see my happiness and progress trends over time,
**So that** I notice patterns and improvements.

**Acceptance Criteria**:
- "Insights" tab shows line charts for Happiness and Progress over the past 7, 30, or 90 days (selector).
- Each data point represents the daily average for that date.
- Chart uses Recharts; responsive on mobile.
- Empty state message when no data exists for the range.

### US-7: Daily summaries and rollups

**As a** daily user,
**I want to** see weekly and monthly rollups,
**So that** I can review longer periods at a glance.

**Acceptance Criteria**:
- Rollups show: total entries, average happiness, average progress, success rate (entries with `progress = 5` / total entries).
- Period selector: This Week, This Month, Last 30 Days.

### US-8: Calendar heatmap

**As a** daily user,
**I want to** see a GitHub-style calendar heatmap of my day scores,
**So that** I can visualize consistency and emotional/progress patterns.

**Acceptance Criteria**:
- Heatmap displays the past 365 days as a grid (weeks as columns, days as rows).
- Each cell's color intensity reflects the Day Score (composite of avg happiness + avg progress for that date).
- Hover/tap on a cell shows the date and daily summary tooltip.
- Empty cells for days with no entries are clearly distinguished.

---

## API Endpoints

All write/read endpoints require `X-Auth-Token` header matching `env.AUTH_TOKEN`. The login endpoint validates the token.

| Method | Path | Body / Query | Response | Description |
|--------|------|--------------|----------|-------------|
| POST | `/api/auth/login` | `{ token: string }` | `{ success: true }` or 401 | Validates token, no session (client stores token). |
| GET | `/api/entries?date=YYYY-MM-DD` | optional `date` param | `Entry[]` | Lists entries for a date (defaults to today). |
| POST | `/api/entries` | `{ name, happiness, progress, log_date }` | `Entry` (201) | Creates a new entry. |
| PUT | `/api/entries/:id` | `{ name?, happiness?, progress?, log_date? }` | `Entry` | Updates an entry. |
| DELETE | `/api/entries/:id` | — | `{ success: true }` (204) | Deletes an entry. |
| GET | `/api/insights/daily?from=YYYY-MM-DD&to=YYYY-MM-DD` | date range | `DailySummary[]` | Daily aggregates for charts. |
| GET | `/api/insights/rollup?period=week\|month\|30d` | — | `RollupSummary` | Weekly/monthly rollups. |
| GET | `/api/insights/heatmap?year=YYYY` | optional year | `HeatmapCell[]` | 365 cells for the calendar heatmap. |

### Authentication

Every `/api/*` route (except `/api/auth/login`) requires a valid `X-Auth-Token` header. Missing or invalid tokens return `401 Unauthorized`.

---

## Data Model (`schema.sql`)

```sql
DROP TABLE IF EXISTS entries;
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  happiness INTEGER NOT NULL CHECK (happiness BETWEEN 1 AND 5),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 1 AND 5),
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entries_log_date ON entries (log_date);
CREATE INDEX idx_entries_created_at ON entries (created_at);
```

---

## Project Structure

```
/
├── CONTEXT.md                            # Glossary (created)
├── docs/
│   ├── REQUIREMENTS.md                   # This document
│   └── adr/
│       ├── 0001-cloudflare-workers-d1-edge-architecture.md
│       └── 0002-pwa-app-shell-only-no-offline-data.md
├── schema.sql                            # D1 schema
├── wrangler.toml                         # Worker + D1 + env config
├── worker/
│   └── src/
│       └── index.js                      # API routes + static asset serving
├── frontend/
│   ├── package.json
│   ├── vite.config.js                    # vite-plugin-pwa config
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/client.js                 # fetch wrapper with X-Auth-Token
│       ├── auth/LoginScreen.jsx
│       ├── components/
│       │   ├── TabBar.jsx
│       │   ├── EntryForm.jsx
│       │   ├── EntryList.jsx
│       │   ├── EntryItem.jsx
│       │   ├── DailySummaryCard.jsx
│       │   ├── TrendChart.jsx           # Recharts
│       │   ├── RollupCard.jsx
│       │   └── Heatmap.jsx              # custom SVG/CSS
│       └── views/
│           ├── TodayView.jsx
│           └── InsightsView.jsx
└── package.json                          # root: scripts to build + deploy
```

---

## Configuration (`wrangler.toml`)

```toml
name = "task-logger"
main = "worker/src/index.js"
compatibility_date = "2024-04-01"

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "task-logger-db"
database_id = "YOUR_D1_DATABASE_ID"

[vars]
AUTH_TOKEN = "your-secret-token"
```

---

## Implementation Steps

1. **Initialize project**: `npm init -y`, install Wrangler, create `wrangler.toml`.
2. **Database**: `npx wrangler d1 create task-logger-db`, copy ID into `wrangler.toml`, run schema via `npx wrangler d1 execute task-logger-db --file=./schema.sql`.
3. **Worker API**: Implement endpoints in `worker/src/index.js`. Auth middleware checks `X-Auth-Token` for all routes except `/api/auth/login` and static asset paths.
4. **Frontend scaffold**: `npm create vite@latest frontend -- --template react`, install `vite-plugin-pwa`, `recharts`, `date-fns`.
5. **API client**: `api/client.js` wraps `fetch` with token header from localStorage and JSON handling.
6. **Auth flow**: `LoginScreen.jsx` posts to `/api/auth/login`, stores token on success.
7. **Today view**: `EntryForm.jsx` (validation, optimistic UI), `EntryList.jsx` (date-scoped fetch), edit/delete handlers.
8. **Insights view**: `TrendChart.jsx` (Recharts LineChart), `Heatmap.jsx` (CSS grid + color scale), `RollupCard.jsx`.
9. **PWA config**: configure `vite-plugin-pwa` (manifest, icons, workbox caching of app shell).
10. **Build + deploy**: root `package.json` script chains `npm --prefix frontend run build && npx wrangler deploy`. Worker serves the static assets via `[assets]`.
11. **Verify**: deploy, hit endpoints, test login flow, log a few entries, view charts.

---

## Out of Scope (v1)

- Multi-user accounts and row-level isolation.
- Offline write queue or local-first sync.
- Categories, tags, or filtering.
- Time tracking / duration.
- Export or import of data.
- Push notifications.
- Cloud sync across devices (data lives on the D1 instance; user accesses from any browser that knows the token).
