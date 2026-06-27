# ADR 0005: Rating Scale Changed from 1–5 to 1–10

## Status
Accepted (breaking change, shipped in v2.0.0, 2026-06-24)

## Context
v1.0 used a 1–5 scale for both Happiness (five emoji) and Progress (icon row / slider). In practice the coarse 1–5 granularity made daily trends look identical and gave the user too little expressive range — most entries clustered at 3–4, flattening the signal in the heatmap and trend chart.

Alternatives considered:
- **Keep 1–5 and widen the legend**: Lowest churn, but does not solve the resolution problem.
- **1–7 scale**: Better than 1–5, but a 1–10 scale maps naturally to percentages for Progress (10% steps) and is more familiar to users.
- **Asymmetric scales (e.g. happiness 1–10, progress 1–5)**: Rejected for UI/UX consistency — both inputs are sliders of the same shape.

## Decision
Move both Happiness and Progress to a **1–10 integer scale**:
- Schema `CHECK` constraints updated to `BETWEEN 1 AND 10`.
- Happiness input becomes a gradient slider (red→green) with 10 descriptive labels (Awful → Perfect).
- Progress input becomes a slider displayed in 10% increments (1 = 1%, 10 = 100%).
- Entry chips render numeric values (e.g. "😊 7/10", "📊 60%").
- Success rate now counts entries with `progress = 10` (was 5).
- Existing data was **wiped** on migration (acceptable for an early-stage personal app).

## Consequences
- **Breaking**: data from the 1–5 era is not compatible. Migration wipes entries.
- Insights, heatmap color thresholds, and trend-chart Y-axis all recalibrated to 0–10.
- The coarser-to-finer migration is one-way; no downgrade path.
- All derived math (`successRate`, averages) operates on the new scale.
