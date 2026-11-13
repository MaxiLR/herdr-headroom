// The account view's logic: the reading it shows, what it draws of it and the
// popup that opens it. Kept apart from `ui/account.js` so any form can open
// the view without importing it.

import { ageText, clockText, OPEN_MAX, windowsInOrder } from "./detail.js";
import { levelOf } from "./levels.js";
import { untilReset } from "./pace.js";
import { barOf, isThin, rowOf, stateOf } from "./rows.js";
import { failedText, loginText, percentText, shortDate } from "./words.js";

/** The popup's width. */
const WIDTH = 380;

// The heights the account view draws, in px.
export const HEIGHTS = {
  // 12 above its 26 px line.
  header: 38,
  // The email and organization line, 1 below the header.
  who: 17,
  // A window: 13 above, its 16 px name, 6 to its bar, 6 after it and its
  // 14 px line of numbers; then the bar.
  window: 55,
  full: 6,
  thin: 3,
  // A first read's pair of empty tracks: 16 above, 6, 6 apart, 3.
  first: 31,
  // The line about the pace mark, 14 above.
  pace: 30,
  // The login line, 12 above.
  login: 28,
  // Below the last of these.
  bottom: 15,
  // The 1 px rule and the 38 px row that opens the detail view.
  detail: 39,
  // The popup's frame.
  frame: 2,
};

/** The reading the view shows: the one `view.props.account` names, or null. */
export function accountOf(view) {
  const id = view.props.account;
  return view.readings.find((reading) => reading.id === id) ?? null;
}

// What the view draws of `reading`, whatever the time: its state, the parts
// of its header, its windows and whether each line after them is there.
function shapeOf(reading, account) {
  const state = stateOf(reading);
  const windows =
    state === "signed-out" || state === "first"
      ? []
      : windowsInOrder(reading.windows);
  return {
    state,
    who: [account?.email, account?.organization].filter(Boolean),
    windows,
    // Pace marks are drawn on a fresh reading's windows that have started.
    paced: state === "ok" && windows.some((window) => window.resetsAt != null),
    login:
      state === "signed-out" ||
      (state !== "first" && reading.loginEndsAt != null),
  };
}

/**
 * What the account view draws of `reading` at `now`; `account` is its entry
 * in `store.accounts()`, for the email and organization:
 *
 * - `state`: `ok`, `first`, `failed` or `signed-out`, as `rowOf` gives it.
 * - `plan`: the plan beside the label, or null (none before the first read).
 * - `who`: the email and the organization, those it has.
 * - `age`: `Read 2m ago`, or a failed read's `12m old · network`, or null.
 * - `windows`: in the detail view's order, each `{ name, bar, thin, percent,
 *   level, reset, clock }`: `percent` is `41%` or `At limit` in its `level`'s
 *   colour; `reset` (`resets in 4d 6h`, `not started`) and `clock` (`Mon
 *   20:30`) are null when not said.
 * - `dimmed`: the bars are a failed read's last ones.
 * - `empty`: a pair of empty tracks stands for windows not read yet.
 * - `paced`: at least one pace mark is drawn, so the line about it is.
 * - `login`: `{ text, warning }`, `Login ends Dec 5` or, in its last 3 days,
 *   `Login ends in 2 days` with `warning`; or null.
 */
export function accountViewOf(reading, account, now) {
  const shape = shapeOf(reading, account);
  const { state } = shape;
  const failed = state === "failed";
  const row = rowOf(reading, now);
  return {
    state,
    plan: state === "first" ? null : (reading.plan ?? null),
    who: shape.who,
    age: failed
      ? failedText(reading, now)
      : state === "ok"
        ? ageText([reading], now)
        : null,
    windows: shape.windows.map((window) => windowOf(window, now, failed)),
    dimmed: failed,
    empty: state === "first",
    paced: shape.paced,
    login: shape.login
      ? {
          text:
            state === "signed-out" || row.loginWarning
              ? loginText(reading, now)
              : `Login ends ${shortDate(reading.loginEndsAt)}`,
          warning: row.loginWarning,
        }
      : null,
  };
}

// One window's bar and numbers; a failed read's keeps only its percentage.
function windowOf(window, now, failed) {
  const level = levelOf(window);
  const { fraction, pace } = barOf(window, now);
  const left = failed ? null : untilReset(window, now);
  const limit = level === "limit" && !failed;
  return {
    name: window.label,
    bar: { fraction, level, pace: failed ? null : pace },
    thin: isThin(window),
    percent: limit ? "At limit" : percentText(window),
    level: failed ? "normal" : level,
    reset:
      left !== null
        ? `resets in ${left}`
        : failed || limit
          ? null
          : "not started",
    clock: left === null ? null : clockText(window.resetsAt, now),
  };
}

/**
 * The px the account view of `reading` needs to show it whole, at most
 * `OPEN_MAX`; `account` adds its email line.
 */
export function accountHeight(reading, account) {
  let px = HEIGHTS.header + HEIGHTS.bottom + HEIGHTS.detail + HEIGHTS.frame;
  if (reading) {
    const shape = shapeOf(reading, account);
    if (shape.who.length > 0) px += HEIGHTS.who;
    for (const window of shape.windows) {
      px += HEIGHTS.window + (isThin(window) ? HEIGHTS.thin : HEIGHTS.full);
    }
    if (shape.state === "first") px += HEIGHTS.first;
    if (shape.paced) px += HEIGHTS.pace;
    if (shape.login) px += HEIGHTS.login;
  }
  return Math.min(OPEN_MAX, px);
}

/** Opens the account view of the account `id`, a popup of that account alone. */
export function openAccount(view, id) {
  const reading = view.readings.find((entry) => entry.id === id) ?? null;
  const account = view.store.accounts().find((entry) => entry.id === id);
  view.host.openOverlay({
    mod: "headroom",
    kind: "popup",
    width: WIDTH,
    height: accountHeight(reading, account),
    props: { form: "account", account: id },
  });
}

export function removeQuestion(_label) {
  return null;
}
