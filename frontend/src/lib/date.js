// Shared date helpers for the frontend.
// All "today" math uses GMT+7 (matches the worker's TIMEZONE_OFFSET).
// Keep this in sync with worker/src/index.js when the offset changes.

export const TIMEZONE_OFFSET = 7; // GMT+7

function shiftedNow() {
  const now = new Date();
  return new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
}

/** Today's date as `YYYY-MM-DD` in GMT+7. */
export function todayISO() {
  return shiftedNow().toISOString().slice(0, 10);
}

/** The date `n` days before today, as `YYYY-MM-DD` in GMT+7. */
export function daysAgoISO(n) {
  const local = shiftedNow();
  local.setUTCDate(local.getUTCDate() - n);
  return local.toISOString().slice(0, 10);
}
