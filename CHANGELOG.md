# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.0] - 2026-09-08

### Added
- **PhilosophyPanel** (`frontend/src/components/PhilosophyPanel.jsx`) — a
  collapsible "Memento Mori คืออะไร" explainer card at the top of the Memento tab,
  written in Thai. Four sections (คืออะไร / รากทางปรัชญา / ประวัติ /
  ทำไมถึงช่วยให้ชีวิตดีขึ้น) covering the Stoic meaning of memento mori, the Roman
  triumph tradition, and modern death-awareness psychology (including the
  honest caveat that the practice only helps when paired with meaning,
  relationships, and self-worth — which the app's daily happiness logging
  reinforces). Plus a "อ่านต่อ" primary-sources list (Meditations, On the
  Shortness of Life, Letters to Lucilius, Enchiridion).
- **Verified quote pool** (`frontend/src/quotes.js`) — quotes restructured from
  flat strings to `{ text, author, source }` with per-quote primary sources.
  New verified quotes: Marcus Aurelius "You have your life. Your life has you."
  (Meditations 12.3) and Seneca "Life is long if you know how to use it."
  (On the Shortness of Life 1.1).
- **Quote attribution + shuffle** — the Memento top block now shows
  author + source under each quote, and a "New quote" button shuffles to a
  different quote on demand (previously the quote was random once per mount).

### Removed
- **Two misattributed quotes** (verified 2026-09-08): "Every new beginning
  comes from some other beginning's end." and "Luck is what happens when
  preparation meets opportunity." — both were attributed to Seneca but do not
  appear in his surviving works (the second traces to a 1928 City Loan
  advertisement).

### Changed
- Quote rendering: `.memento-quote` split into text / attribution / source
  styles; philosophy panel CSS added.

### Notes
- Research: see `memento-mori-research.md` in the parent `~/hermes-agent`
  repo (not in this repo). Frontend-only release — no DB or API changes.

## [5.0.0] - 2026-08-17

### Changed (Breaking)
- **Auth: username replaced by email.** `users.username` column renamed to `email`. Sign-up and log-in now require a valid email address instead of a username handle. Existing user data (entries, streaks, Memento Mori) is fully preserved — only the login identifier changes.
- **Signup/Login screens** updated: username field replaced by email input (`type="email"`).
- **Header** now shows the local part of the email (before `@`) as the display name.
- **API**: `POST /api/auth/signup` and `POST /api/auth/login` bodies now use `email` instead of `username`.

### Added
- **Forgot password flow** (`POST /api/auth/forgot-password`): generates a 30-minute reset token (SHA-256 hashed in DB), sends a reset link via Resend email API. Always returns 200 to prevent email enumeration.
- **Reset password flow** (`POST /api/auth/reset-password`): validates token, updates password, invalidates all reset tokens for that user.
- **ForgotPasswordScreen** — reachable via "Forgot password?" link on the login screen.
- **ResetPasswordScreen** — shown automatically when the URL hash contains `#/reset?token=...`.
- `password_reset_tokens` table: stores hashed tokens with expiry and cascading delete on user removal.
- `RESEND_API_KEY` and `APP_BASE_URL` Worker secrets (optional — email silently skipped if absent).

### Migration note
- Production: non-destructive `ALTER TABLE` rename + `UPDATE users SET email = 'chonlaphon@gmail.com' WHERE email = 'lifetofree'`. All entries and user IDs unchanged.

## [4.11.0] - 2026-08-03

### Added
- **Memento Mori:** restored the "days remaining" stat in the top block.
  Shows the number of days left on the 80-year horizon from the user's
  birthday (livedDays + remainingDays = 29,200). Reverses the v4.10.1
  removal.

## [4.10.1] - 2026-07-12

### Changed
- **Memento Mori:** removed the "days ahead" stat from the top block. Only
  "days lived" is shown now.
- **Memento Mori:** expanded the rotating Stoic quote pool from 15 to 44,
  organized by source — Marcus Aurelius (15), Seneca (14), Epictetus (11),
  Zeno of Citium (4). Replaced mis-attributed and non-Stoic entries (e.g. the
  Braveheat-derived "Every man dies…") with sourced quotations and added
  `— Author` attribution throughout.

## [4.10.0] - 2026-07-05

### Changed
- Upgraded React and React DOM from 18.3.1 to 19.2.7 (`frontend/package.json`).
  JS bundle grows from ~169 KB to ~219 KB (expected for the React 19 runtime).
  Smoke-tested: title, root div, and JS bundle all serve correctly via
  `vite preview`.

### Fixed
- Resolved a `frontend/package-lock.json` conflict between Dependabot PR #3
  (react-dom 18→19) and PR #5 (react 18→19) by regenerating the lockfile with
  both at `^19.2.7`.

### Merged Dependabot PRs
- #1 `actions/setup-node` 4 → 6
- #2 `actions/checkout` 4 → 7
- #4 `wrangler` 4.105 → 4.107

## [4.9.1] - 2026-07-05

### Fixed
- Added top spacing to the Today entries header so it no longer collides with
  the section above it.

## [4.9.0] - 2026-07-05

### Changed
- History view now nests entries by month → date. Each month header (e.g.
  "July 2026") is the primary group; inside it, entries are sub-grouped by
  date with a weekday + day header (e.g. "MON 15"). The redundant per-entry
  date chip was removed (the date now lives on the group header). Makes it
  easier to scan a month and find entries for a specific day.

## [4.8.9] - 2026-07-05

### Fixed
- History search box no longer overlaps month-group headers when scrolling.
  The search input used `position: sticky; top: 52` tuned for the old
  body-scroll layout; after the v4.8.8 scroll-container restructure the offset
  was wrong. The section title + search input are now wrapped in a
  `.history-toolbar` pinned to `top: 0` relative to `.view` (the scroll pane).

## [4.8.8] - 2026-07-05

### Fixed
- iOS PWA footer desync (pixel-verified): after submit → scroll up → scroll
  down on iOS PWA standalone, content shifted ~250 px (keyboard height)
  relative to the `position: fixed` tab-bar. Fixed by restructuring to the
  iOS-safe scroll-container pattern:
  - `.app-shell`: fixed height (`100svh`), `overflow: hidden`, flex column —
    it *is* the viewport; the body does not scroll.
  - `.view`: `flex: 1`, `overflow-y: auto` — content scrolls inside `.view`.
  - `.tab-bar`: in-flow flex child (`flex-shrink: 0`), **no longer
    `position: fixed`** — because it lives in the same scroll context as the
    content, it never shifts.
  - Removed the `.view` bottom padding and `.tab-bar-fill` workaround that
    existed to support the fixed bar.

  Prior attempts (v4.8.4–v4.8.7) all kept `position: fixed` and patched around
  it; the desync is fundamental to fixed positioning in iOS WebView after
  keyboard interactions, so only removing `fixed` resolves it.

## [4.8.7] - 2026-07-05

### Reverted
- Removed the speculative `focusout` + `visualViewport.resize → scrollTo`
  handler added in v4.8.6. It caused a worse regression: after submit → scroll
  up → scroll down, the tab-bar was pushed below the visible screen edge
  ("bar cut off at bottom"). The `100svh` CSS change from v4.8.6 is kept
  (defensive, harmless). See v4.8.8 for the real fix.

## [4.8.6] - 2026-07-05

### Fixed
- iOS PWA footer desync after keyboard open/close + scroll. Root cause: iOS
  SafariWebView desyncs `position: fixed` elements from the layout viewport
  after dynamic viewport changes; `100dvh` compounded it because `dvh`
  animates during keyboard transitions.
  - CSS: switched `.app-shell` from `100dvh` to `100svh` (smallest stable
    viewport; does not animate during keyboard events).
  - JS: added `focusout` + `visualViewport.resize` listeners (mounted only
    when authed) that re-scroll on keyboard dismiss. *(This JS handler was
    reverted in v4.8.7.)*

## [4.8.5] - 2026-07-05

### Fixed
- Mobile footer home-indicator gap (pixel-verified via a `v4.8.5-debug`
  diagnostic build): on iOS PWA standalone, the home-indicator strip below the
  fixed `.tab-bar` painted the `.app-shell` background instead of the bar's
  color. Two prior attempts failed — `padding-bottom: env(safe-area-inset-bottom)`
  (iOS does not paint a fixed element's background into the padded safe-area)
  and `.tab-bar::after` (trapped inside the bar's stacking context). Fix: a
  standalone fixed sibling element (`.tab-bar-fill`) outside `.tab-bar`, with
  its own stacking context, same `--bg-elev` background, pinned to
  `bottom: 0` with `height: env(safe-area-inset-bottom)`. *(Later removed in
  v4.8.8 when the tab-bar became in-flow.)*

## [4.8.4] - 2026-07-05

### Fixed
- Version bump for the mobile footer safe-area fix (content shipped in v4.8.5).

## [4.8.3] - 2026-07-02

### Changed
- **WeeklyDigest** card now focuses on happiness — the third "success rate"
  tile has been removed. The card now shows only: days logged this week,
  average happiness (with directional delta vs last week), and best day.
- Rationale: the Memento Mori visualization colors each day by its average
  happiness, so the weekly digest should reinforce the same single dimension.
  Progress / success-rate metrics were drifting focus away from the daily
  reflection. (`US-10` acceptance criteria updated accordingly.)

### Removed
- `successRate` aggregation in `WeeklyDigest.jsx` (the backend
  `/api/insights/daily` field is still returned but no longer consumed by
  this card; no other UI surface uses it today, defer a backend cleanup
  until a second consumer appears).

## [4.8.2] - 2026-07-02

### Changed
- **StreakCard** redesigned for readability: hero "Day N" focal point with
  flame, "Best" + "This year" stat tiles below, subtle nudge hint. Replaces
  the cramped single-row layout where everything ran together.
- **WeeklyDigest** redesigned: 3-column stat grid (Days logged / Avg
  happiness with delta badge / Success rate) and "Best day" footer. Delta
  is colored green-up / red-down / gray-flat. Replaces the dense
  run-on-sentence layout.
- **TodayView**: 16 px spacers between StreakCard, EntryForm, and
  WeeklyDigest so cards have breathing room.
- **styles.css**: full CSS for both redesigned cards (was missing from the
  initial v4.8.0 release; the production deploy had been serving unstyled
  components).
- **Footer**: tab-bar pinned to bottom via `100dvh` so it's never hidden
  behind mobile browser chrome; update-banner lifted above the tab-bar
  with a `--tab-bar-height` CSS variable.

### Fixed
- **Release discipline** (Review 5, D2): the previous v4.8.2 code-only
  commit (`6fa8b3b`) shipped without a CHANGELOG entry, README stamp, or
  `version.js` bump. Production footer was therefore displaying
  `v4.8.1` despite the v4.8.2 redesign being live. This release catches
  the drift: `frontend/src/version.js` is now `4.8.2` and the README /
  STATUS version stamps reflect the deployed code.
- **REQUIREMENTS schema block** (Review 5, D1): the inline
  `CREATE TABLE entries` example in `docs/REQUIREMENTS.md` had not been
  updated when v4.7.0 made `happiness` / `progress` decimals (REAL,
  1.0–10.0). It is now in sync with `schema.sql` and ADR 0006.
- **SignupScreen birthday clamp** (Review 5, D5): the date picker's
  `max={today}` used the browser's local timezone via `Date.toISOString()`.
  Every other "today" computation in the project uses GMT+7 via
  `lib/date.js`. In a browser east of UTC+7 the picker would silently
  accept "tomorrow in GMT+7" as a birthday. Fixed by importing and
  using `todayISO()`.

### Docs
- Review 5 logged in `docs/REVIEWS.md` — covers v4.8.1 dependency
  upgrade + this v4.8.2 release-discipline patch.
- `STATUS.md` updated to v4.8.2 with a retrospective on the release
  discipline gap (code-only commit without `version.js` / CHANGELOG /
  STATUS updates in the same change).

### Notes
- The three Low-severity follow-ups from Review 5 remain open: ADR
  listing cleanup (D3), legacy-components note (D4), and MementoMori
  timezone util (D6). None are user-facing; defer to next sprint.

## [4.8.1] - 2026-07-02

### Security
- Upgraded `vite` 5.3 → 8.1.3, `vite-plugin-pwa` 0.20 → 1.3.0,
  `@vitejs/plugin-react` 4.3 → 6.0.3. Resolves the high-severity esbuild
  development-server vulnerability
  ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99))
  and two moderate transitive vulnerabilities.
- `npm audit` now reports **0 vulnerabilities** (was 3: 1 high, 2 moderate).
- Installed with `--legacy-peer-deps` to resolve a Babel 7/8 peer conflict
  in the `@vitejs/plugin-react@6` toolchain; the resolution is baked into the
  lockfile so future `npm ci` runs are unaffected.

### Changed
- No code or config changes — `vite.config.js` imports are unchanged.
- Build is faster (97 ms vs 447 ms) due to Vite 8 / Rolldown improvements.

## [4.8.0] - 2026-07-02

### Added
- **Streaks** — new `GET /api/insights/streak` endpoint returns current streak
  (consecutive days ending today, with a mid-day grace period), longest streak,
  days logged this year, total days logged, and `loggedToday`.
- **StreakCard** component on the Today view: a daily nudge showing the current
  streak (🔥 Day N), best streak, and days logged this year. Refetches after
  create/delete so it stays current.
- **WeeklyDigest** component on the Today view: compares the last 7 days
  against the prior 7 (days logged, avg-happiness delta with ↑/↓/→, best day,
  success rate). Reuses the existing daily insights endpoint — no new backend
  call beyond streaks.
- US-9 (streaks) and US-10 (weekly digest) added to `docs/REQUIREMENTS.md`.
- ADR 0007 documenting the retention-focused feature decision.

### Fixed
- **Test date-sensitivity** — the smoke test used fixed dates (`2026-06-24`)
  that fell outside the rollup window when run on later days, causing a false
  failure. Tests now use timezone-correct, today-relative dates.
- **Streak day-math** — `computeStreaks` now subtracts days in UTC
  (`...T00:00:00Z`) instead of local time, preventing off-by-one streaks in
  non-UTC environments.
- **User-cap test** — adjusted the cap-fill loop to account for the streak
  test's extra user (`carol`).

### Changed
- Documentation synced to v4.8.0 (`README.md`, `REQUIREMENTS.md`, `STATUS.md`,
  `REVIEWS.md`). README features list, component tree, and assertion count
  updated to reflect streaks + digest.

## [4.7.0] - 2026-06-28

### Changed
- Happiness and Progress sliders now step by 0.1 (was 1), giving
  finer-grained control (e.g. 7.3, 8.6).
- Schema: `happiness`/`progress` columns changed from `INTEGER` to `REAL`.
- Success rate now counts entries with `progress >= 9.5` (was exactly 10),
  so near-complete tasks count without requiring the slider max.
- Existing integer entries remain valid and render unchanged (7, not 7.0).

### Added
- Decimal rating round-trip and success-boundary test coverage.
- ADR 0006 documenting the decimal-step decision and the success
  redefinition.

## [4.6.0] - 2026-06-26

### Fixed
- Timezone: all date calculations now use GMT+7 instead of UTC. Dates
  were showing as the previous day in GMT+7 (worker, EntryForm, TodayView,
  HistoryView, insights queries).

## [4.5.2] - 2026-06-26

### Changed
- Future days in Memento Mori now visible with soft light background,
  border, and rounded corners (50% opacity) instead of nearly invisible.

## [4.5.1] - 2026-06-26

### Changed
- PWA registerType changed from 'prompt' to 'autoUpdate' to force
  automatic version refresh.

## [4.5.0] - 2026-06-26

### Added
- Registration limit: max 50 users (owner excluded from count).
  51st signup attempt returns 403.

## [4.4.2] - 2026-06-25

### Fixed
- Memento Mori scroll: fixed broken rAF cleanup logic, replaced with
  state-driven scroll using todayRowIndex.

## [4.4.1] - 2026-06-25

### Fixed
- Memento Mori scroll timing: added rAF + double timeout for DOM layout.

## [4.4.0] - 2026-06-25

### Changed
- History: shows only last 7 days by default; older entries require search.
- Search filters by task name, date, happiness, or progress value.
- Memento Mori: grid now 70vh tall so 9 rows before today + today row
  are visible on load without scrolling. Instant scroll for correct position.

## [4.3.0] - 2026-06-25

### Changed
- Removed avg happiness stat from Memento Mori top block.
- Removed separate bottom quote block.
- Random Memento Mori quote now displayed in top block (rotates each visit).

## [4.2.0] - 2026-06-25

### Changed
- Memento Mori grid: each row is 28 days (4 weeks), no year labels.
  Flat continuous grid of ~29,200 squares.
- Grid auto-scrolls to the row containing today on page load.
- Day cells are now square, responsive width filling the row.
- Fixed happiness colors displaying from API data.

## [4.1.0] - 2026-06-25

### Changed
- Memento Mori split into 3 distinct blocks: top (stats + avg happiness),
  center (scrollable day grid), bottom (quote).
- Grid auto-scrolls to the current year row on load.
- Happiness colors now display correctly (fixed field mapping).
- Reduced API calls: batch fetch years in groups of 10.
- Removed Daily Summary card from Today page.

## [4.0.0] - 2026-06-25

### Added
- Birthday field in signup form. Used to calculate personal Memento Mori grid.
- Memento Mori now spans 80 years from your birthday, day-by-day.
- History tab: all entries grouped by month/year, ordered most recent first.
- Bottom bar now fixed with copyright always visible below the tab buttons.
- New API endpoint: `GET /api/history` returns all user entries.

### Changed
- Users table gains `birthday` column (YYYY-MM-DD).
- Signup, login, and /me all return birthday in user object.
- Three tabs: Today, History, Memento (was Today, Insights).
- Footer copyright moved inside the fixed bottom bar.

### Removed
- Separate floating footer (copyright now in tab bar).

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
