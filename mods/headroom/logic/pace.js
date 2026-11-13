// How far through a window the clock is, and how long until it resets.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The share of `window`'s length that has passed at `now`, 0..1; null for a
// window that has not started.
export function paceOf(window, now) {
  if (window.resetsAt == null) return null;
  const pace = 1 - (window.resetsAt - now) / window.durationMs;
  return Math.min(1, Math.max(0, pace));
}

// `ms` in its two largest whole units: `<1m`, `42m`, `3h 12m`, `2d 4h`.
export function countdown(ms) {
  if (ms < MINUTE) return "<1m";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

// The time left until `window` resets; null for a window that has not started.
export function untilReset(window, now) {
  return window.resetsAt == null ? null : countdown(window.resetsAt - now);
}
