# ADR 0008: Memento Tab Gains Philosophy Explainer + Verified Quote Pool

## Status
Accepted (shipped in v5.1.0, 2026-09-08)

## Context
The Memento tab (ADR 0004) ships the life grid and a rotating Stoic quote, but
users (and anyone new to the app) have no in-app context for *why* this tab
exists or what the practice of memento mori actually is. A research pass
(2026-09-08) also surfaced two quotes in the pool attributed to Seneca that
do not appear in his surviving works ("Every new beginning…" — popularized via
Semisonic; "Luck is what happens when preparation meets opportunity." — traces
to a 1928 City Loan ad). Publishing unverified quotations in a philosophy
product is a credibility problem.

Alternatives considered:
- **New "Philosophy" tab**: Rejected — a fourth tab for a one-time reading
  competes with the Today/History/Memento loop, and tab crowding was already
  a stated concern in ADR 0004.
- **Static footer text under the grid**: Rejected — too easy to miss and too
  long to leave always-visible.
- **Collapsible card inside the Memento tab**: Chosen. Progressive disclosure;
  default-closed so it never crowds the grid; lives exactly where the
  practice is practiced.

## Decision
- Add `PhilosophyPanel` (Thai copy — the app's audience is the owner, who
  reads Thai; the app UI stays English) as a collapsible card above the stats
  block. Sections: what it is, Stoic roots, history (Roman triumph
  tradition, framed as tradition rather than proven fact), and modern
  psychology — including the honest caveat that death contemplation only
  improves well-being when the person has meaning/relationship/self-worth
  buffers; the app's daily happiness logging is framed as that buffer.
- Extract the quote pool to `frontend/src/quotes.js` with
  `{ text, author, source }` entries. Remove the two misattributed lines;
  add two verified ones (Meditations 12.3; On the Shortness of Life 1.1).
- Render author + source under each quote and add a "New quote" shuffle
  button.

## Consequences
- Frontend-only release; no DB, API, or PWA-cache changes.
- Copy is Thai while the rest of the UI is English — intentional (ADR 0008 is
  explicitly owner-audience content), but it makes the panel the one
  non-English surface in the app.
- `quotes.js` is the new single source for quotations; future quote edits
  should go there, not inline.
- If the app is ever public-facing, the panel copy needs translation or an
  EN/TH toggle.
