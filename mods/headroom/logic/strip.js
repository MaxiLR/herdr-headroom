// The strip: whether it starts with a separator, what each account's item
// holds, and how much of each item, and how many items, the width has room
// for.

import { railNumber } from "./rail.js";

/** Measures of the strip, in px, shared by the density and the drawing. */
export const STRIP = {
  pad: 14, // each side, as Herdr's status bar
  ruledPad: 2, // before the separator: the block before it pads 14 of its own
  rule: 1,
  gap: 16, // between items, and after the separator
  inner: 6, // between the parts of an item
  mark: 12,
  bars: 44,
  badge: 14,
  text: 11.8,
  tag: 10.5,
};

// Without a way to measure text, the width of a text is estimated so that it
// never falls short: a letter of ASCII is taken as 0.6 of the font size, wider
// than Geist's average, and any other letter (a middle dot, an accent, a CJK
// character, an emoji) as 1.1. An estimate errs toward leaving a part out
// rather than clipping one.
const ASCII_GLYPH = 0.6;
const OTHER_GLYPH = 1.1;

/** The estimated width, in px, of `text` at a font `size` px. */
export function textWidth(text, size) {
  let width = 0;
  for (const letter of text) {
    width += size * (letter.codePointAt(0) < 128 ? ASCII_GLYPH : OTHER_GLYPH);
  }
  return width;
}

/** The widest a label is drawn, in px; a longer one is cut with an ellipsis. */
export const STRIP_LABEL = 92;

/** The id of the strip's block in the installed layout. */
export const STRIP_BLOCK = "headroom-strip";

/** The strip's block anywhere in `layout`, or null. */
export function stripBlock(layout) {
  if (!layout) return null;
  if (layout.type === "block") return layout.id === STRIP_BLOCK ? layout : null;
  for (const child of layout.children ?? []) {
    const found = stripBlock(child);
    if (found) return found;
  }
  return null;
}

/**
 * True when the copy's own block, in `layout`, follows a shown sibling in a
 * row. The block is the one `props.fit` names, or else the only block of the
 * `headroom` mod; when it cannot be told, there is no separator.
 */
export function stripSeparator(layout, props) {
  if (!layout) return false;
  const found = [];
  const visit = (node, parent) => {
    if (node.type === "block") {
      const own = props?.fit
        ? node.id === props.fit
        : node.content?.mod === "headroom";
      if (own) found.push({ node, parent });
      return;
    }
    for (const child of node.children ?? []) visit(child, node);
  };
  visit(layout, null);
  if (found.length !== 1) return false;
  const { node, parent } = found[0];
  if (parent?.type !== "row") return false;
  const before = parent.children.slice(0, parent.children.indexOf(node));
  return before.some((sibling) => !sibling.hidden);
}

/**
 * What the strip draws of `row`: `{ label, bars, percent, tag, badge, level }`.
 * A signed-out account has the badge, and no bars or percentage.
 */
export function stripItem(row) {
  const signedOut = row.state === "signed-out";
  const number = railNumber(row);
  return {
    label: row.label,
    bars: !signedOut,
    percent: number?.text ?? null,
    tag: number?.tag ?? "",
    badge: signedOut,
    level: number?.level ?? "normal",
  };
}

const DENSITIES = ["full", "no-labels", "no-bars"];

/**
 * What a strip `width` px wide (null: not measured yet, drawn full) has room
 * for: `{ density, shown, more }`. The density is `full`, `no-labels` or
 * `no-bars`: labels go first, then bars. When the items do not fit even
 * without bars, the first `shown` accounts are drawn beside a "+N" item and
 * the `more` after them are left out; the first account is always drawn.
 */
export function stripFit(width, items, separator) {
  const all = { shown: items.length, more: 0 };
  if (width == null) return { density: "full", ...all };
  for (const density of DENSITIES) {
    if (stripWidth(items, separator, density) <= width) {
      return { density, ...all };
    }
  }
  const density = DENSITIES[DENSITIES.length - 1];
  if (items.length <= 1) return { density, ...all };
  let shown = items.length - 1;
  while (shown > 1) {
    const more = items.length - shown;
    const need =
      stripWidth(items.slice(0, shown), separator, density) +
      STRIP.gap +
      textWidth(`+${more}`, STRIP.text);
    if (need <= width) break;
    shown -= 1;
  }
  return { density, shown, more: items.length - shown };
}

function stripWidth(items, separator, density) {
  const ends = separator
    ? STRIP.ruledPad + STRIP.rule + STRIP.gap + STRIP.pad
    : 2 * STRIP.pad;
  const between = Math.max(0, items.length - 1) * STRIP.gap;
  return items.reduce(
    (sum, item) => sum + itemWidth(item, density),
    ends + between,
  );
}

function itemWidth(item, density) {
  const parts = [STRIP.mark];
  if (density === "full") {
    parts.push(Math.min(STRIP_LABEL, textWidth(item.label, STRIP.text)));
  }
  if (item.badge) parts.push(STRIP.badge);
  if (item.bars && density !== "no-bars") parts.push(STRIP.bars);
  if (item.percent) parts.push(textWidth(item.percent, STRIP.text));
  if (item.tag) parts.push(textWidth(item.tag, STRIP.tag));
  return (
    parts.reduce((sum, part) => sum + part, 0) +
    (parts.length - 1) * STRIP.inner
  );
}
