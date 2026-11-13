// A block as tall as its first two accounts: the height to ask its layout for.
import { STRIP_BELOW } from "./form.js";
import { listRowOf } from "./list.js";
import { rowOf } from "./rows.js";

/** The 1 px line on the top edge of the list and the rail. */
export const LINE = 1;

/** The list's header: "Limits" and its control. */
export const HEADER = 41;

/**
 * The least a block asks for: a strip's height. A folded sidebar's rail can be
 * shorter, and a block fitted to it would stay a strip once the sidebar
 * unfolds, since the strip never fits its block.
 */
export const FIT_MIN = STRIP_BELOW;

// How many accounts a fitted block holds; the rest scroll under them.
const SHOWN = 2;

// The list's row: the label line, `Login ended …`, the bars and their gap,
// the line of numbers with its margin, the padding under the row.
const LIST = { label: 26, ended: 14, bars: [6, 3], gap: 6, numbers: 20, pb: 9 };
// Under the list's accounts, and more when some are cut off (the hint's room).
const LIST_BELOW = 8;
const LIST_HINT = 17;

// The rail's row: its padding top and bottom, the 16 px line, the gap to the
// bars, the bars and their gap.
const RAIL = { py: 6, line: 16, gap: 4, bars: [5, 3] };
// Above and under the rail's accounts, and more when some are cut off.
const RAIL_EDGE = 4;
const RAIL_HINT = 6;

// The px of a pair of bars with `full` and `short`, either of which may be
// missing, `gap` apart.
function barsHeight(full, short, [fullPx, shortPx], gap) {
  const bars = [full ? fullPx : null, short ? shortPx : null].filter(
    (px) => px !== null,
  );
  if (bars.length === 0) return 0;
  return bars.reduce((sum, px) => sum + px, 0) + gap * (bars.length - 1);
}

/** The px one account of the list takes, as `ui/list.js` draws it. */
export function listRowHeight(reading, now) {
  const row = listRowOf(reading, now, null);
  return (
    LIST.label +
    (row.ended !== null ? LIST.ended : 0) +
    (row.pair !== null
      ? barsHeight(row.pair.full, row.pair.short, LIST.bars, LIST.gap)
      : 0) +
    (row.numbers !== null ? LIST.numbers : 0) +
    LIST.pb
  );
}

/** The px one account of the rail takes, as `ui/rail.js` draws it. */
export function railRowHeight(reading, now) {
  const row = rowOf(reading, now);
  const frame = 2 * RAIL.py + RAIL.line;
  if (row.state === "signed-out") return frame;
  // An account not read yet draws the empty track of its weekly bar.
  const unread = row.state === "first" && !row.weekly && !row.short;
  return (
    frame +
    RAIL.gap +
    barsHeight(row.weekly || unread, row.short, RAIL.bars, RAIL.gap)
  );
}

// The px of the first two of `readings`, and whether more are cut off.
function shown(readings, now, height) {
  return {
    rows: readings
      .slice(0, SHOWN)
      .reduce((sum, reading) => sum + height(reading, now), 0),
    cut: readings.length > SHOWN,
  };
}

/**
 * The px a fitted list asks for: the line, the header, its first two accounts
 * and what is under them, with room for the hint when more are cut off.
 */
export function listNeeds(readings, now) {
  const { rows, cut } = shown(readings, now, listRowHeight);
  return LINE + HEADER + rows + LIST_BELOW + (cut ? LIST_HINT : 0);
}

/**
 * The px a fitted rail asks for: the line, its first two accounts and the
 * space above and under them, with room for the hint when more are cut off.
 */
export function railNeeds(readings, now) {
  const { rows, cut } = shown(readings, now, railRowHeight);
  return LINE + RAIL_EDGE + rows + RAIL_EDGE + (cut ? RAIL_HINT : 0);
}

/** The px to ask for `needed`, or null when that is `last`, the height asked. */
export function fitHeight(needed, last) {
  const px = Math.max(Math.ceil(needed), FIT_MIN);
  return px === last ? null : px;
}

/**
 * Resizes the layout block named by `view.props.fit` to `needed`, once per
 * height. Call it from an event handler (`on_size_change`), never in render.
 */
export function fitTo(view, needed) {
  if (!view.props.fit) return;
  const px = fitHeight(needed, view.ui.fit);
  if (px === null) return;
  view.host.resize(view.props.fit, px);
  view.ui.fit = px;
}
