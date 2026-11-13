// The account view's logic: the reading it shows and the popup that opens
// it. Kept apart from `ui/account.js` so any form can open the view without
// importing it.

import { OPEN_MAX } from "./detail.js";
import { isThin } from "./rows.js";

/** The popup's width. */
const WIDTH = 380;

// The heights the account view draws, in px.
export const HEIGHTS = {
  // 12 above its 26 px line.
  header: 38,
  // The windows' padding: 1 above, 15 below.
  body: 16,
  // A window: 13 above, its 16 px name, 6 to its bar, 6 after it and its
  // 14 px line of numbers; then the bar.
  window: 55,
  full: 6,
  thin: 3,
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

// The px the account view of `reading` needs, at most `OPEN_MAX`.
export function accountHeight(reading, account) {
  return openHeight(reading);
}

function openHeight(reading) {
  const windows = (reading?.windows ?? []).reduce(
    (sum, window) =>
      sum + HEIGHTS.window + (isThin(window) ? HEIGHTS.thin : HEIGHTS.full),
    0,
  );
  const px =
    HEIGHTS.header + HEIGHTS.body + windows + HEIGHTS.detail + HEIGHTS.frame;
  return Math.min(OPEN_MAX, px);
}

/** Opens the account view of the account `id`, a popup of that account alone. */
export function openAccount(view, id) {
  const reading = view.readings.find((entry) => entry.id === id) ?? null;
  view.host.openOverlay({
    mod: "headroom",
    kind: "popup",
    width: WIDTH,
    height: openHeight(reading),
    props: { form: "account", account: id },
  });
}
