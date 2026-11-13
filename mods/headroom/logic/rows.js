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

// `Opus`: the model a per-model weekly window is for.
export function modelName(window) {
  const prefix = "Weekly · ";
  return window.label.startsWith(prefix)
    ? window.label.slice(prefix.length)
    : window.label;
}

const isGeneral = (window) => !window.id.includes(":");
const isModel = (window) => window.id.startsWith("7d:");
const atLimit = (window) => levelOf(window) === "limit";

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

// `ok`, `first` (nothing read yet), `failed` or `signed-out`.
export function stateOf(reading) {
  if (reading.status === "signed-out") return "signed-out";
  if (reading.status === "stale" && reading.fetchedAt == null) return "first";
  if (reading.status === "stale" || reading.status === "error") return "failed";
  return "ok";
}

// Which per-model windows of `reading` are at their limit, in words:
// `Fable at limit`, `2 models at limit`, or null for none. Null too when the
// account is not read, or is out with its weekly window anyway.
function limitWordsOf(reading, state, weekly) {
  if (state !== "ok" || weekly === null || atLimit(weekly)) return null;
  const reached = reading.windows.filter(
    (window) => isModel(window) && atLimit(window),
  );
  if (reached.length === 0) return null;
  return reached.length === 1
    ? `${modelName(reached[0])} at limit`
    : `${reached.length} models at limit`;
}

// The row of `reading` at `now`: its weekly and 5-hour windows, the fuller of
// the two, and the per-model windows at their limit in words.
export function rowOf(reading, now) {
  const general = reading.windows.filter(isGeneral);
  const weekly = general.find((window) => !isThin(window)) ?? null;
  const short = general.find(isThin) ?? null;
  const state = stateOf(reading);
  return {
    id: reading.id,
    provider: reading.provider,
    label: reading.label,
    state,
    weekly,
    short,
    tightest: tightestOf([weekly, short].filter(Boolean)),
    limitWords: limitWordsOf(reading, state, weekly),
    loginWarning:
      reading.loginEndsAt != null &&
      reading.status !== "signed-out" &&
      reading.loginEndsAt - now <= LOGIN_WARNING_MS,
  };
}
