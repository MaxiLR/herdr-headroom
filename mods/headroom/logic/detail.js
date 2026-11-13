// What the detail view says of its readings: clock times, the age of the
// newest reading, the order of an account's windows, the popup's height and
// which way each account's arrows move it.

import { countdown } from "./pace.js";
import { isThin } from "./rows.js";

const MINUTE = 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const two = (n) => String(n).padStart(2, "0");

// `16:20` when `ms` falls on the local day of `now`, else `Mon 20:30`.
export function clockText(ms, now) {
  const date = new Date(ms);
  const today = new Date(now);
  const time = `${two(date.getHours())}:${two(date.getMinutes())}`;
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return sameDay ? time : `${WEEKDAYS[date.getDay()]} ${time}`;
}

// `Read 2m ago`: the age of the newest reading at `now`, or null before the
// first read.
export function ageText(readings, now) {
  const times = readings
    .map((reading) => reading.fetchedAt)
    .filter((fetchedAt) => fetchedAt != null);
  if (times.length === 0) return null;
  const age = now - Math.max(...times);
  return age < MINUTE ? "Read just now" : `Read ${countdown(age)} ago`;
}

const isGeneral = (window) => !window.id.includes(":");
const isModel = (window) => window.id.startsWith("7d:");

// The general windows longest first, then the per-model ones, then the
// others, each group otherwise in the order given.
export function windowsInOrder(windows) {
  const general = windows
    .filter(isGeneral)
    .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));
  const models = windows.filter(isModel);
  const others = windows.filter(
    (window) => !isGeneral(window) && !isModel(window),
  );
  return [...general, ...models, ...others];
}

// The heights the detail view draws, in px.
export const HEIGHTS = {
  header: 46,
  footer: 57,
  empty: 80,
  // An account: its padding (11 above, 13 below), its 1 px rule and its
  // 24 px label line.
  account: 49,
  // The email line, with its 1 px gap.
  who: 17,
  // A window: 11 above, its 16 px line, 6 to its bar and the bar.
  window: 33,
  full: 6,
  thin: 3,
  // A `Login ends` or `Login ended` line, 12 above.
  fact: 28,
};

/** The most the popup asks for; past it the accounts scroll. */
export const OPEN_MAX = 640;

// The px a popup needs to show `readings` whole, at most `OPEN_MAX`;
// `accounts` (as `store.accounts()` gives them) add their email lines.
export function openHeight(readings, accounts = []) {
  const sections = readings.map((reading) => {
    const windows = reading.status === "signed-out" ? [] : reading.windows;
    const bars = windows.reduce(
      (sum, window) =>
        sum + HEIGHTS.window + (isThin(window) ? HEIGHTS.thin : HEIGHTS.full),
      0,
    );
    const first = reading.status === "stale" && reading.fetchedAt == null;
    const fact =
      reading.status === "signed-out" || (!first && reading.loginEndsAt != null)
        ? HEIGHTS.fact
        : 0;
    const account = accounts.find((entry) => entry.id === reading.id);
    const who = account?.email || account?.organization ? HEIGHTS.who : 0;
    return HEIGHTS.account + who + bars + fact;
  });
  const body =
    sections.length === 0
      ? HEIGHTS.empty
      : sections.reduce((sum, px) => sum + px, 0);
  return Math.min(OPEN_MAX, HEIGHTS.header + body + HEIGHTS.footer + 2);
}

// The arrows of account `id` among `readings` (in the person's order):
// `{ up, down }`, whether it can move each way; null when there is one
// account, or `id` is none of them.
export function arrowsOf(readings, id) {
  const index = readings.findIndex((reading) => reading.id === id);
  if (readings.length < 2 || index < 0) return null;
  return { up: index > 0, down: index < readings.length - 1 };
}

// Moves account `id` one place up (`delta` -1) or down (1) when its arrow
// that way can; the store's answer, or nothing.
export function moveAccount(view, id, delta) {
  const arrows = arrowsOf(view.readings, id);
  const can = delta < 0 ? arrows?.up : arrows?.down;
  if (!can) return undefined;
  return view.store.move(id, delta);
}
