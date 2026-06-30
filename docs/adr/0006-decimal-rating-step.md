# ADR 0006: Rating Step Reduced to 0.1 (Decimal Ratings)

## Status
Accepted (breaking-ish change, shipped in v4.7.0, 2026-06-28)

## Context
Since v2.0.0 (ADR 0005) both Happiness and Progress have used an integer 1–10 scale. In practice even 1–10 felt too coarse for daily reflection — users wanted to express "a bit better than 7" without jumping to 8. The slider hardware (HTML range input) trivially supports a finer step, so the constraint was the data model and validation, not the UI.

Two coupled concerns had to be decided alongside the step change:

1. **Success definition.** Success rate was defined as `progress = 10` exactly. With a 0.1 step, a user landing on 9.9 would no longer count as "complete", and landing exactly on 10.0 becomes harder, not easier. The old definition would make successRate trend toward 0.
2. **Existing data.** Past entries are integers (7, 8, 10). A breaking migration that wipes data (per ADR 0005's precedent) was undesirable this time.

Alternatives considered:
- **Keep integer 1–10**: lowest churn, but does not solve the granularity problem users asked about.
- **0.5 step**: a middle ground, but the slider UX and storage changes are identical to 0.1 for roughly half the benefit.
- **0.1 step with `progress = 10` success**: rejected — makes success nearly unreachable, breaking the successRate metric.

## Decision
Reduce the slider step to **0.1** and change the storage type from integer to decimal:

- **Schema**: `happiness`/`progress` columns change from `INTEGER` to `REAL`, `CHECK` range stays 1.0–10.0.
- **Validation** (`isValidRating`): accepts any finite number in [1, 10]. The slider enforces the 0.1 step client-side; the backend validates range only (storing 7.37 if a future client sends it is harmless).
- **Success definition**: `progress >= 9.5` (was `= 10`). Near-complete tasks (9.5–10.0) now count, which matches the intent behind "complete".
- **Display**: progress percentage uses `Math.round(progress * 10)` to avoid floating-point artifacts (e.g. `73.00000001%`); happiness labels index by `Math.round(v)` so 7.3 maps to the "Happy" label.
- **Existing data preserved**: integer entries (7, 8, 10) remain valid on the REAL column and render as `7` (JS drops the trailing `.0`). No data wipe.

## Consequences
- Backwards-compatible at the data level (no migration wipe required), but the storage type changes — the production schema swap needs care because `schema.sql` begins with `DROP TABLE IF EXISTS` (see deploy risk in the implementation notes; a no-drop migration is preferred for production).
- `successRate` values shift upward for any period containing 9.5–9.9 entries that previously did not count. Historical rollups recompute against the new threshold on read.
- The Memento Mori color interpolation was already continuous (HAPP_STOPS used `t: 5.5`), so no change there — decimals just produce finer color gradations.
- Frontend label mapping rounds to the nearest integer label; a 7.3 and a 7.7 both show "Happy" (7) and "Joyful" (8) respectively, which is the intended behavior.
