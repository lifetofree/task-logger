# Task Logger

A multi-user Progressive Web App for daily task logging and reflection. Record what you worked on, how happy you felt (1–10), and how much progress you made (1–10) — then watch your life unfold as a **Memento Mori** day-grid colored by your happiness.

Built on **Cloudflare Workers + D1** (SQLite at the edge) with a **React + Vite** frontend served from the same Worker.

**Live**: [task-logger.adduckivity.com](https://task-logger.adduckivity.com)

---

## Features

- **Today** — log entries with 1–10 happiness/progress sliders (0.1 step); inline edit & delete.
- **Streaks** — current & longest streak, days logged this year. A daily nudge to keep the chain alive.
- **Weekly digest** — compares your last 7 days against the prior 7 (avg happiness delta, best day, success rate).
- **History** — browse the last 7 days, search across all entries by name/date/rating.
- **Memento** — an 80-year, day-by-day life grid (from your birthday), each day colored by average happiness. Auto-scrolls to today.
- **Multi-user** — username/password signup, JWT sessions, per-user data isolation.
- **PWA** — installable, auto-updating, app-shell cached for instant open.

## Tech stack

| Layer | Tech |
|-------|------|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Frontend | React 18 + Vite 5 |
| PWA | vite-plugin-pwa (autoUpdate) |
| Auth | JWT (HS256, `jose`) + bcrypt (`bcryptjs`) |

---

## Quick start (local dev)

**Prerequisites**: Node 18+, a Cloudflare account (for the D1 database ID in `wrangler.toml`).

1. **Install dependencies:**
   ```bash
   npm install
   npm --prefix frontend install
   ```

2. **Configure local secrets** — copy the template and fill in a JWT signing secret:
   ```bash
   cp .dev.vars.example .dev.vars
   # then edit .dev.vars and set JWT_SECRET to a long random string
   ```
   (`.dev.vars` is gitignored — never commit it.)

3. **Apply the database schema** to your local D1:
   ```bash
   npm run db:execute:local
   ```

4. **Build the frontend** (the Worker serves `frontend/dist`):
   ```bash
   npm run build:frontend
   ```

5. **Run the dev server:**
   ```bash
   npx wrangler dev
   # → http://localhost:8787
   # If 8787 is taken, use: npx wrangler dev --port 8788
   ```

For frontend hot-reload during UI work, you can also run `npm run dev:frontend` separately.

---

## Tests

API smoke tests run the Worker against a mock D1:

```bash
node scripts/test-worker.mjs
```

Covers signup, login, JWT auth, entry CRUD, row-level isolation, validation, insights math, and streaks (57 assertions).

---

## Production deploy

1. **Create the D1 database** (one-time) and put its ID in `wrangler.toml`:
   ```bash
   npx wrangler d1 create task-logger-db
   ```
2. **Set the production JWT secret:**
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
3. **Apply schema to remote D1** (one-time, or on schema changes):
   ```bash
   npm run db:execute:remote
   ```
4. **Build + deploy:**
   ```bash
   npm run deploy
   ```

---

## Project structure

```
├── worker/src/index.js      # API routes + static asset serving
├── schema.sql               # D1 schema (users + entries)
├── wrangler.toml            # Worker, D1, custom domain config
├── frontend/src/
│   ├── views/               # TodayView, HistoryView, InsightsView (Memento Mori)
│   ├── components/          # EntryForm, EntryItem, MementoMori, StreakCard, WeeklyDigest
│   ├── auth/                # SignupScreen, LoginScreen
│   └── api/client.js        # fetch wrapper + session storage
├── scripts/test-worker.mjs  # API smoke tests
└── docs/                    # Requirements, ADRs, reviews
```

## Documentation

- [Requirements & spec](docs/REQUIREMENTS.md)
- [Architecture decisions (ADRs)](docs/adr/)
- [Changelog](CHANGELOG.md)
- [Glossary](CONTEXT.md)

---

&copy; adduckivity · v4.10.1
