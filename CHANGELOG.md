# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-06-25

### Changed
- Memento Mori day colors now use the same gradient as the happiness slider
  (red -> amber -> green) with smooth interpolation across the 1-10 range.
- New favicon: 5x5 grid of colored cells reflecting the Memento Mori theme.
- PWA icons regenerated with the same grid design.
- Happiness legend bar gradient matches slider.

## [3.1.0] - 2026-06-25

### Changed
- Memento Mori now shows day-by-day (not weeks): 14,600+ cells across 40 years.
- Each day colored by average happiness (warm gradient: pale to deep amber).
- Heatmap API returns avg happiness and progress separately (was combined score).
- InsightsView fetches 40 years of data from the API.
- Day cells are 4px wide strips, one row per year, horizontally scrollable.
- Stats show days lived, days ahead, and days logged.
- Happiness legend bar (1-10 gradient) above the grid.

## [3.0.0] - 2026-06-25

### Changed
- Insights tab completely redesigned as a Memento Mori visualization.
- Shows a 40-year grid (2,080 weeks) starting from this month, each cell = 1 week.
- Lived weeks (past): filled neutral tone. Logged weeks: colored by score.
- Future weeks: outlined/empty. Current week: highlighted with accent border.
- Stats show weeks passed vs weeks ahead.
- Includes Stoic quote: "You could leave life right now..."

### Removed
- Success rate removed from Daily Summary card.
- Trend chart, rollup cards, and activity heatmap removed from Insights.
- RollupCard component no longer used.

## [2.2.0] - 2026-06-24

### Changed
- Color theme shifted to light earth tones (warm cream/linen backgrounds, deep espresso text, burnt amber accent, sage green, terracotta danger).
- Slider thumbs now use accent-colored border on light background.
- Heatmap progression updated to warm honey-to-dark-umber scale.
- Trend chart colors, grid, axes, and tooltip updated to match light palette.
- PWA manifest theme/background colors updated to warm cream.
- Fixed residual cyan tint on selected rating buttons (now warm amber tint).
- Active pills, period selectors, and primary buttons now use white text on accent background.

## [2.1.0] - 2026-06-24

### Changed
- Color theme changed from slate/cyan to earth tones (warm browns, golds, sage greens).
- Heatmap levels, sliders, chart colors, icons, and favicon all updated.
- PWA manifest theme/background colors updated.

## [2.0.1] - 2026-06-24

### Changed
- Font changed to IBM Plex Sans Thai (loaded from Google Fonts).

## [2.0.0] - 2026-06-24

### Changed
- **Breaking**: Happiness and Progress scales changed from 1-5 to 1-10.
- Happiness input is now a gradient slider (red to green) with descriptive labels.
- Progress input is now a slider showing percentage (10% increments).
- Entry list chips show numeric value (e.g. "😊 7/10", "📊 60%").
- Trend chart Y-axis scaled to 0-10.
- Heatmap score thresholds recalibrated for 1-10 scale.
- Success rate now counts entries with progress = 10 (was 5).
- Schema CHECK constraints updated to 1-10. Existing data is wiped on migration.

### Added
- Custom slider CSS with gradient tracks and styled thumbs for dark theme.

## [1.3.0] - 2026-06-24

### Changed
- Update button replaced with a floating update banner that only appears when a new version is detected.
- Removed duplicate manual service worker registration (handled by vite-plugin-pwa).

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
