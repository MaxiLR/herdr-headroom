// The strip: whether it starts with a separator, what each account's item
// holds, and how much of each item the width has room for.

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

// Without a way to measure text, a glyph is taken as 0.6 of the font size:
// wider than Geist's average, so an estimate errs toward dropping a part
// rather than clipping one.
const GLYPH = 0.6;

const textWidth = (text, size) => text.length * size * GLYPH;

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

/**
 * How much of each item fits a strip `width` px wide (null: not measured
 * yet, drawn full): `full`, `no-labels`, or `no-bars`. Labels go first, then
 * bars; marks and percentages always stay, clipped at the end if need be.
 */
export function stripDensity(width, items, separator) {
  if (width == null) return "full";
  for (const density of ["full", "no-labels"]) {
    if (stripWidth(items, separator, density) <= width) return density;
  }
  return "no-bars";
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
  if (density === "full") parts.push(textWidth(item.label, STRIP.text));
  if (item.badge) parts.push(STRIP.badge);
  if (item.bars && density !== "no-bars") parts.push(STRIP.bars);
  if (item.percent) parts.push(textWidth(item.percent, STRIP.text));
  if (item.tag) parts.push(textWidth(item.tag, STRIP.tag));
  return (
    parts.reduce((sum, part) => sum + part, 0) +
    (parts.length - 1) * STRIP.inner
  );
}
