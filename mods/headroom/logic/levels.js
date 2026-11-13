// How full a window is, as the bars and the toasts colour it.

// `limit`, `critical`, `high` or `normal` for `window`.
export function levelOf(window) {
  if (window.atLimit || window.usedFraction >= 1) return "limit";
  if (window.usedFraction >= 0.9) return "critical";
  if (window.usedFraction >= 0.75) return "high";
  return "normal";
}
