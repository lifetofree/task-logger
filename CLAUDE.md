# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

---

## Commands

### Development

```bash
# Run the Vite dev server (frontend only, proxies /api to localhost:8787)
npm run dev:frontend

# Run the Worker locally with D1 (in a separate terminal)
npx wrangler dev
```

The frontend dev server proxies `/api/*` to the local Wrangler dev server at port 8787. Both must be running for a full local dev loop.

### Build & Deploy

```bash
npm run build:frontend      # Build frontend into frontend/dist/
npm run deploy              # Build frontend + deploy Worker to Cloudflare
```

### Database

```bash
npm run db:execute:local    # Apply schema.sql to the local D1 instance
npm run db:execute:remote   # Apply schema.sql to the production D1 database
```

Schema is in `schema.sql` at the repo root. Re-running it drops and recreates all tables (`DROP TABLE IF EXISTS` at the top) — it is destructive on remote.

### Tests

```bash
node scripts/test-worker.mjs   # End-to-end smoke test against the Worker with a mock D1
```

The test script imports and invokes the Worker directly (no HTTP server). It uses an in-process mock D1 implementation. **Note**: as of v1.2.0, the mock DB needs updating for multi-user auth (see `STATUS.md`).

### Version

Bump `frontend/src/version.js` manually before each deploy. It is the single source of truth displayed in the footer.

---

## Architecture

This is a monorepo with two runtimes sharing one deploy:

```
worker/src/index.js     ← Cloudflare Worker: API routes + static asset fallback
frontend/src/           ← React SPA built by Vite, served as static assets
schema.sql              ← D1 (SQLite) schema, applied via Wrangler CLI
wrangler.toml           ← Worker config: D1 binding, asset binding, custom domain
```

### Request Routing

The Worker handles all traffic. The `route()` function matches `/api/*` paths first. Unmatched requests fall through to `env.ASSETS.fetch()` (Cloudflare's static asset serving), then fall back to `/index.html` for SPA client-side routing.

### Authentication

Multi-user with stateless JWT sessions:

- `POST /api/auth/signup` and `POST /api/auth/login` are the only unauthenticated API endpoints.
- All other `/api/*` routes call `authenticate(request, env)`, which extracts a Bearer token from the `Authorization` header, verifies it with `jose` (`HS256`, signed with `env.JWT_SECRET`), then loads the user row from D1. A missing user or invalid JWT returns 401.
- JWTs expire after 7 days. `JWT_SECRET` must be set in the Worker environment (not in `wrangler.toml` — set via `wrangler secret put JWT_SECRET`).
- The frontend stores the JWT in `localStorage` under `task-logger:jwt`. The `api/client.js` module attaches it as `Authorization: Bearer <token>` on every request. A 401 response auto-clears the session and fires an `auth:logout` DOM event that `App.jsx` listens for.
- In-memory rate limiting (5 signup attempts per IP per hour) resets on Worker restart — not suitable for DDoS protection, just basic abuse prevention.

### Data Model

Two D1 tables: `users` and `entries`. Every entry has a `user_id` FK. All queries in the Worker filter by `user_id = auth.user.id`, enforcing row-level isolation. Entry IDs are 32-char hex strings from `crypto.getRandomValues`.

### Frontend State

No global state library. Each view (`TodayView`, `InsightsView`) manages its own data fetching with `useState`/`useEffect`. `App.jsx` owns auth state (`authed`, `user`, `mode`) and the active tab. The `api` object in `api/client.js` is the single abstraction over all backend calls.

### PWA

`vite-plugin-pwa` generates the service worker and manifest. The app shell (HTML/JS/CSS) is cached for offline loading. `App.jsx` uses `useRegisterSW` to detect updates and show an "Update available" banner.

### Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `JWT_SECRET` | `wrangler secret` | Signs/verifies JWTs — never commit |
| `DB` | `wrangler.toml` D1 binding | D1 database handle |
| `ASSETS` | `wrangler.toml` asset binding | Static file serving |
