# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-24

### Added
- Version number displayed inline with footer copyright.
- "Check for updates" button at the bottom of the page (PWA service worker refresh).
- CHANGELOG.md for tracking all project changes.
- Custom domain support: https://task-logger.adduckivity.com

### Changed
- Production URL changed from `task-logger.chonlaphon.workers.dev` to `task-logger.adduckivity.com`.

## [1.1.1] - 2026-06-24

### Changed
- Date picker width normalized to match task name field.
- Added dark-theme calendar picker indicator.

### Added
- Footer copyright text.

## [1.1.0] - 2026-06-24

### Added
- Multi-user authentication with username + password signup and login.
- JWT-based sessions (7-day expiry, HS256 signed).
- Per-user data isolation (row-level ownership via `user_id`).
- In-memory IP rate limiting on signup (5/hour).
- SignupScreen as default landing, LoginScreen with link to switch.
- ADR 0003 documenting the multi-user decision.

### Changed
- Schema: new `users` table, `entries` gains `user_id` column.
- All API endpoints now require `Authorization: Bearer <jwt>`.
- `AUTH_TOKEN` secret replaced by `JWT_SECRET`.

### Removed
- Single-user `X-Auth-Token` authentication.

## [1.0.0] - 2026-06-24

### Added
- Initial release: Task Logger PWA on Cloudflare Workers + D1.
- Today tab: entry form with emoji happiness (1-5), progress slider (1-5), date picker, full CRUD, daily summary card.
- Insights tab: 7/30/90-day trend chart (Recharts), weekly/monthly rollups, GitHub-style activity heatmap.
- PWA: app-shell caching, manifest, generated 192/512 icons.
- Token-based auth (`X-Auth-Token`).
- ADRs 0001 (edge architecture) and 0002 (app-shell-only PWA).
- 22-test API smoke test with mock D1.
