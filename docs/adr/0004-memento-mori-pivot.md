# ADR 0004: Insights Tab Replaced by Memento Mori Visualization

## Status
Accepted (shipped progressively: v3.0.0 initial pivot, refined through v4.6.0, 2026-06-25..26)

## Context
The original Insights tab (ADR-governed by REQUIREMENTS v1.0) showed three things: a 7/30/90-day Recharts trend chart, weekly/monthly rollup cards, and a GitHub-style yearly activity heatmap. After living with it, the trends proved low-value for a personal reflection tool — short windows of daily averages rarely surfaced meaningful patterns, and the activity heatmap duplicated information already visible in History.

Meanwhile the user wanted a stronger reflective anchor tied to their own life span, not just rolling time windows.

Alternatives considered:
- **Keep charts, add Memento Mori as a fourth tab**: Rejected — tab crowding, and the charts added maintenance weight (Recharts dependency) for little marginal value.
- **Keep charts behind a toggle, default to Memento Mori**: Rejected — two parallel visualization systems for the same underlying data is confusing and doubles the surface area to maintain.
- **Replace charts entirely with Memento Mori**: Chosen. One compelling, personal visualization; the data model (daily happiness/progress) already supports it.

## Decision
Replace the entire Insights tab with a **Memento Mori** visualization:
- An 80-year, day-by-day grid starting from the user's birthday (28 days per row, ~29,200 cells).
- Each day cell colored by that day's average happiness (red→amber→green gradient, sharing the slider's color stops).
- Past days without entries render as "lived"; future days render with a soft light style; today is highlighted.
- Top block: days lived, days ahead, a rotating Stoic quote, and a 1–10 happiness legend.
- Grid auto-scrolls on load so today's row is the 10th visible row.
- Data sourced from the existing `/api/insights/heatmap` endpoint (one request per year, batched 10 years at a time).
- A new **History** tab (v4.0.0) takes over "browse the past" duties that the activity heatmap used to serve.

The three tab structure becomes: **Today · History · Memento**.

## Consequences
- `TrendChart`, `RollupCard`, and the calendar `Heatmap` component become dead code (still in the tree, no longer rendered). Candidates for removal.
- Recharts remains a dependency but is now unused in the rendered UI.
- The `/api/insights/daily` and `/api/insights/rollup` endpoints are retained (still tested, still in the API surface) but have no active UI consumer.
- The visualization is tied to the user's `birthday` (added in v4.0.0); users without one see an empty state.
- Stronger personal anchor at the cost of analytic depth — an intentional product trade toward reflection over metrics.
