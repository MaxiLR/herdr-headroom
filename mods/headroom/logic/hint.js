// The hint on the bottom edge of the list and the rail: how many accounts are
// cut off below. Herdr gives a mod no way to read where a scroll area is, so
// the position is the copy's own, moved by the wheel over the accounts and
// kept as plain data in `view.ui.<form>.scrolled`.
import {
  HEADER,
  LINE,
  LIST_BELOW,
  listRowHeight,
  RAIL_EDGE,
  railRowHeight,
} from "./fit.js";

// A row is in view when no more than this of it is cut, so a measured height
// a fraction of a pixel off does not count an account that shows.
const SLACK = 0.5;

// Each form's accounts: the px of a row, the space above and under them in
// the scrolling area, and what is above that area in the block.
const FORMS = {
  list: {
    row: listRowHeight,
    top: 0,
    bottom: LIST_BELOW,
    above: LINE + HEADER,
  },
  rail: { row: railRowHeight, top: RAIL_EDGE, bottom: RAIL_EDGE, above: LINE },
};

/**
 * How many of the accounts, `heights` px tall one after another from `top` px
 * down, are not fully in view in an area `area` px tall scrolled `position`
 * px down.
 */
export function moreBelow(heights, area, position, top = 0) {
  const end = position + area + SLACK;
  let bottom = top;
  let below = 0;
  for (const height of heights) {
    bottom += height;
    if (bottom > end) below += 1;
  }
  return below;
}

// The accounts of `form` in its scrolling area, or null before the block is
// measured: their heights, the px above the first, the px of all of it and the
// area's own height.
function measure(view, form) {
  if (!view.size) return null;
  const { row, top, bottom, above } = FORMS[form];
  const heights = view.readings.map((reading) => row(reading, view.now));
  const rows = heights.reduce((sum, px) => sum + px, 0);
  return {
    heights,
    top,
    content: top + rows + bottom,
    area: view.size.height - above,
  };
}

// `position` held between 0 and what the content overflows the area by.
function held(position, { content, area }) {
  return Math.min(Math.max(position, 0), Math.max(content - area, 0));
}

/**
 * How many accounts of `form` (`list` or `rail`) are cut off below. The held
 * position is written back, so it is 0 again once they all fit.
 */
export function hintCount(view, form) {
  const box = measure(view, form);
  if (box === null) return 0;
  const state = (view.ui[form] ??= {});
  state.scrolled = held(state.scrolled ?? 0, box);
  return moreBelow(box.heights, box.area, state.scrolled, box.top);
}

/**
 * Moves the position of `form`'s accounts by a wheel's `delta` (px, positive
 * toward the top), as their scrolling area moves. Gives whether the count of
 * accounts cut off below changed, so the hint must be drawn again.
 */
export function wheel(view, form, delta) {
  const box = measure(view, form);
  if (box === null) return false;
  const was = hintCount(view, form);
  view.ui[form].scrolled = held(view.ui[form].scrolled - delta, box);
  return hintCount(view, form) !== was;
}

/** `count` accounts, in words: "1 more account", "3 more accounts". */
export function moreWords(count) {
  return `${count} more account${count === 1 ? "" : "s"}`;
}
