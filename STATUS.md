# Project Status: Task Logger

## Current Stage

- **Role**: DevOps (Stage 7) — **Complete** (v5.1.0 committed to `main` 2026-09-08)
- **Status**: 🟢 Shipped. v5.1.0 is the current `version.js`.

### v5.1.0 (2026-09-08) — Memento philosophy layer (ADR 0008)
- **PhilosophyPanel** (Thai, collapsible) at the top of the Memento tab:
  what memento mori is, Stoic roots, Roman triumph history, modern
  death-awareness psychology (with the honest "buffers" caveat), and a
  primary-sources list. Frontend-only.
- **Quote pool** → `frontend/src/quotes.js` as `{ text, author, source }`;
  attribution + "New quote" shuffle in the top block.
- **Removed 2 misattributed "Seneca" quotes** (verified 2026-09-08); added
  2 verified (Meditations 12.3; On the Shortness of Life 1.1).
- Verified: API smoke tests pass, `frontend build` clean, Thai spellcheck
  (pythainlp) found only 3 false-positive suspects. Research:
  `~/hermes-agent/memento-mori-research.md`.
- **Deploy**: `npm run deploy` (needs a Cloudflare account / `CLOUDFLARE_API_TOKEN`
  in CI — see README + `.github/workflows/`). CI runs API tests + frontend build on push.
- **Last Updated**: 2026-09-08

> **Production deploy note:** the v4.8.4 → v4.10.0 commits are on `main` but
> whether each has been deployed to `task-logger.adduckivity.com` is not
> recorded in-repo. Run `npm run deploy` from `main` to bring production to
> v4.10.0 if it lags.

---

## SDLC Progress Tracker

- [x] **Stage 1: Product Owner** — v4.10.1 Memento Mori tweak: drop "days ahead" stat, expand Stoic quote pool. v4.10.0 was a dependency-bump release (React 18 → 19) plus the v4.8.4–v4.9.1 mobile/iOS-layout and History-grouping work.
- [x] **Stage 2: Product Manager** — `REQUIREMENTS.md` unchanged since v4.8.3 (US-10 still reflects the happiness focus).
- [x] **Stage 3: Tech Lead** — Tech Stack defined (`wrangler.toml`).
- [x] **Stage 4: Architect** — Database schema (`schema.sql`) and APIs designed; ADRs 0001–0007 current. No schema/API change since v4.8.3.
- [x] **Stage 5: Coder** — Test suite green: 78/78 assertions (re-verified 2026-07-12; no test changes in v4.8.4–v4.10.0).
- [x] **Stage 6: Reviewer** — Reviews 4 (v4.8.0) and 5 (v4.8.1/v4.8.2) logged. v4.8.3–v4.10.0 are client/dep-only deltas; no separate review pass was recorded.
- [x] **Stage 7: DevOps** — v4.10.0 on `main`; CI pipeline (`.github/workflows/ci.yml`) current; README + STATUS version stamps synced this pass (2026-07-12).

---

## What shipped between v4.8.3 and v4.10.0 (2026-07-05)

These nine releases landed in a single day on `dev`, then reached `main`:

| Version | Theme |
|---------|-------|
| 4.8.4–4.8.8 | Iterative fixes for an iOS PWA footer/keyboard desync. The sequence tried a version bump → a safe-area fill element → a JS viewport handler (reverted) → and finally a scroll-container restructure that removed `position: fixed` from the tab-bar. |
| 4.8.9 | History search box no longer overlapped month headers after the scroll-container change. |
| 4.9.0 | History view nests entries by month → date. |
| 4.9.1 | Top spacing added to the Today entries header. |
| 4.10.0 | React + react-dom 18.3.1 → 19.2.7 (Dependabot PRs #1–#5 merged). |

> **Doc-stamp drift corrected this pass:** when v4.8.4–v4.10.0 shipped,
> `version.js` advanced but `package.json` (root), `frontend/package.json`,
> `README.md`, `STATUS.md`, and `CHANGELOG.md` were not updated alongside —
> the same release-discipline gap Review 5's retrospective called out.
> On 2026-07-12 these were all reconciled to 4.10.0 and the nine CHANGELOG
> entries were backfilled from the actual commit diffs.

---

## Handoff Notes (v4.10.1)

1. **v4.11.0** — Memento Mori: restored the "days remaining" stat in the top block (days lived + days remaining = 29,200 over the 80-year horizon). Reverses the v4.10.1 removal.
2. **Version stamps in sync** — `version.js`, `package.json` (root), `frontend/package.json`, `README.md`, and this file all read 4.11.0.
2. **CHANGELOG backfilled** — entries for 4.8.4 through 4.10.0 added from commit diffs (2026-07-12).
3. **Backend verified green** — `node scripts/test-worker.mjs` passes 78/78 assertions (signup, login, JWT auth, CRUD, row-level isolation, validation, insights math, streaks, user cap). No backend change since v4.8.3.
4. **Branches** — `main` and `dev` are at the same commit (47d8cc3).
5. **Remaining Low-severity items from Review 5** (still deferred — non-blocking):
   - **D3** ADR listing in REQUIREMENTS project-structure block stops at 0005.
   - **D4** Stale "legacy components" note in REQUIREMENTS — those files were already removed.
   - **D6** `MementoMori.jsx` uses local-time parsing instead of `lib/date.js`.
6. **Unchanged carryovers from Review 3** — regex-based mock, per-isolate rate limiter, TIMEZONE duplication, no UI tests on History/Memento.

---

## Retrospective (Review 5)

What went well:
- Backend correctness is solid: cross-user isolation, decimal round-trip, success boundary (>= 9.5), and the new streak math are all tested.
- The v4.8.1 dependency upgrade eliminated the only outstanding security advisory (`GHSA-67mh-4wv8-2f99`) without code changes.
- CI keeps both test discipline and a build artifact, so a dep-only PR would have surfaced a regression here.

What to fix:
- The release/version discipline broke between v4.8.1 and v4.8.2: a UI redesign with 206 lines of diff shipped without a CHANGELOG entry or version bump. Going forward, a release must update (a) `frontend/src/version.js`, (b) `CHANGELOG.md`, and (c) `STATUS.md` in the same commit as user-visible changes.
- `REQUIREMENTS.md` is treated as the source of truth for new contributors; we need a process check that schema changes bump both `schema.sql` and the inline schema block in REQUIREMENTS.md in the same PR.

> **2026-07-12 note:** the release-discipline gap recurred — v4.8.4 through
> v4.9.1 shipped with only `version.js` advanced, and v4.10.0 (a merge commit)
> bumped `version.js` without touching the other stamps or CHANGELOG. This pass
> reconciled them retroactively. The underlying process fix (single-commit
> stamp sync) is still the open action.

Next-sprint actions:
1. Patch v4.8.2 docs (D1, D2, D3, D4) and the two frontend cleanliness items (D5, D6) in one PR. This will leave the project doc-clean and ready for v4.9.x.
2. Open a backlog item for replacing the regex-based SQL mock (C1) with `better-sqlite3`; this is the highest-leverage remaining test-quality improvement.
