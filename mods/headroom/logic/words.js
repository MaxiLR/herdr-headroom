// The words the list, the rail, the strip, the detail view and the toasts use
// for windows and readings.

import { levelOf } from "./levels.js";
import { countdown, untilReset } from "./pace.js";
import { rowOf } from "./rows.js";

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const REASONS = {
  network: "network",
  auth: "sign-in",
  unexpected: "unexpected",
};

// `41%`: the used percent rounded down, 0 to 100.
export function percentText(window) {
  // The rounding absorbs binary error, so that 0.29 is 29 and not 28.
  const percent = Math.floor(Math.round(window.usedFraction * 1e6) / 1e4);
  return `${Math.min(100, Math.max(0, percent))}%`;
}

// The numbers beside `window`'s bar at `now`: `41% · 4d 6h`, or with `alone`
// `23% · resets in 5d 2h`; the percent alone when the reading `failed`.
export function numbersText(
  window,
  now,
  { alone = false, failed = false } = {},
) {
  if (failed) return percentText(window);
  const left = untilReset(window, now);
  if (levelOf(window) === "limit") {
    return left == null ? "At limit" : `At limit · ${left}`;
  }
  if (left == null) return `${percentText(window)} · not started`;
  return alone
    ? `${percentText(window)} · resets in ${left}`
    : `${percentText(window)} · ${left}`;
}

// Why the last read of `reading` failed and, when it has one, how old its
// last good read is at `now`: `12m old · network`.
export function failedText(reading, now) {
  const reason = REASONS[reading.error] ?? REASONS.unexpected;
  return reading.fetchedAt == null
    ? reason
    : `${countdown(now - reading.fetchedAt)} old · ${reason}`;
}

// When `reading`'s login ended or ends, or null when that is not worth saying.
export function loginText(reading, now) {
  if (reading.status === "signed-out") {
    const ended =
      reading.loginEndsAt != null && reading.loginEndsAt <= now
        ? reading.loginEndsAt
        : reading.fetchedAt;
    return `Login ended ${shortDate(ended)}`;
  }
  if (!rowOf(reading, now).loginWarning) return null;
  const days = Math.max(1, Math.ceil((reading.loginEndsAt - now) / DAY));
  return `Login ends in ${days} ${days === 1 ? "day" : "days"}`;
}

// `Nov 9`: the local month and day of `ms`.
export function shortDate(ms) {
  const date = new Date(ms);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

// `Opus`: the model a per-model weekly window is for.
export function modelName(window) {
  const prefix = "Weekly · ";
  return window.label.startsWith(prefix)
    ? window.label.slice(prefix.length)
    : window.label;
}

// The id of the row's short window when it is the tightest, else empty.
export function tagOf(row) {
  return row.short && row.tightest === row.short ? row.short.id : "";
}
