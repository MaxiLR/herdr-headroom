// Colours worked out from the theme without Herdr: mixes, alphas, the track
// and each level's fill and number. `t` is the theme: `#rrggbb` by name.

/**
 * `a` moved `share` (0 to 1) of the way toward `b`, alpha too: `#rrggbbaa`
 * when either has an alpha (a colour without one counts as `ff`), else
 * `#rrggbb`.
 */
export function mix(a, b, share) {
  const from = channels(a);
  const to = channels(b);
  const mixed = from.map((value, i) => hex(value + (to[i] - value) * share));
  const translucent = a.length > 7 || b.length > 7;
  return `#${(translucent ? mixed : mixed.slice(0, 3)).join("")}`;
}

/** `#rrggbbaa`: the colour at `share` (0 to 1) of full opacity. */
export function alpha(color, share) {
  return `${color.slice(0, 7)}${hex(share * 255)}`;
}

/** A bar's empty track: `foreground` at 10 %, in light and dark alike. */
export function track(t) {
  return alpha(t.foreground, 0.1);
}

// The theme colour each level takes; `normal` stays quiet.
const LEVEL_COLOR = {
  normal: "muted",
  high: "working",
  critical: "blocked",
  limit: "blocked",
};

/** The fill of a bar at `level`. */
export function levelFill(level, t) {
  return t[LEVEL_COLOR[level]];
}

/** The number beside a bar at `level`, readable on any ground. */
export function levelText(level, t) {
  if (level === "normal") return t.muted;
  return mix(t[LEVEL_COLOR[level]], t.foreground, 0.22);
}

// Red, green, blue and alpha, 0 to 255; a colour without alpha is opaque.
function channels(color) {
  return [1, 3, 5, 7].map((start) =>
    start < color.length
      ? Number.parseInt(color.slice(start, start + 2), 16)
      : 255,
  );
}

function hex(value) {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");
}
