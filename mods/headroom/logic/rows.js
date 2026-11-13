// What a row of the list, the rail and the strip shows of one reading.

import { levelOf } from "./levels.js";
import { paceOf } from "./pace.js";

const DAY = 24 * 60 * 60 * 1000;
const LOGIN_WARNING_MS = 3 * DAY;

// True for a window of a day or less, drawn as a thin bar.
export function isThin(window) {
  return window.durationMs <= DAY;
}

// What the bar of `window` draws at `now`.
export function barOf(window, now) {
  return {
    fraction: Math.min(1, Math.max(0, window.usedFraction)),
    level: levelOf(window),
    pace: paceOf(window, now),
  };
}

const isGeneral = (window) => !window.id.includes(":");
const isModel = (window) => window.id.startsWith("7d:");
const atLimit = (window) => levelOf(window) === "limit";

// True when `window` is more used than `weekly`.
function moreUsed(window, weekly) {
  return (
    window.usedFraction > weekly.usedFraction ||
    (atLimit(window) && !atLimit(weekly))
  );
}

// Of `windows`, one at its limit before any other, then the most used; a tie
// keeps the earlier.
function tightestOf(windows) {
  let tightest = null;
  for (const window of windows) {
    if (
      tightest === null ||
      (atLimit(window) && !atLimit(tightest)) ||
      (atLimit(window) === atLimit(tightest) &&
        window.usedFraction > tightest.usedFraction)
    ) {
      tightest = window;
    }
  }
  return tightest;
}

function stateOf(reading) {
  if (reading.status === "signed-out") return "signed-out";
  if (reading.status === "stale" && reading.fetchedAt == null) return "first";
  if (reading.status === "stale" || reading.status === "error") return "failed";
  return "ok";
}

// The row of `reading` at `now`.
export function rowOf(reading, now) {
  const general = reading.windows.filter(isGeneral);
  const weekly = general.find((window) => !isThin(window)) ?? null;
  const short = general.find(isThin) ?? null;
  const models = weekly
    ? reading.windows.filter(
        (window) => isModel(window) && moreUsed(window, weekly),
      )
    : [];
  const candidates = [weekly, short, ...models].filter(Boolean);
  return {
    id: reading.id,
    provider: reading.provider,
    label: reading.label,
    state: stateOf(reading),
    weekly,
    short,
    models,
    tightest: tightestOf(candidates),
    loginWarning:
      reading.loginEndsAt != null &&
      reading.status !== "signed-out" &&
      reading.loginEndsAt - now <= LOGIN_WARNING_MS,
  };
}
