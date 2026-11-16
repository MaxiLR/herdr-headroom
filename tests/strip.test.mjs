import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripFit,
  stripSeparator,
  textWidth,
} from "../mods/headroom/logic/strip.js";

const block = (id, mod, extra = {}) => ({
  id,
  type: "block",
  content: { mod },
  ...extra,
});

// Herdr's main layout, cut down: the sidebar beside a column whose last row
// is the status bar.
const window = (bar) => ({
  id: "root",
  type: "row",
  children: [
    {
      id: "sidebar",
      type: "column",
      children: [block("spaces", "spaces"), block("agents", "agents")],
    },
    {
      id: "work",
      type: "column",
      children: [block("panes", "workspace-panes"), bar],
    },
  ],
});

const bar = (...children) => ({ id: "status", type: "row", children });

test("a block that follows another in its row draws the separator", () => {
  const layout = window(
    bar(block("status-bar", "workspace-status"), block("limits", "headroom")),
  );
  assert.equal(stripSeparator(layout, {}), true);
});

test("a block alone in its row draws none", () => {
  const layout = window(bar(block("limits", "headroom")));
  assert.equal(stripSeparator(layout, {}), false);
});

test("a block first in its row draws none", () => {
  const layout = window(
    bar(block("limits", "headroom"), block("status-bar", "workspace-status")),
  );
  assert.equal(stripSeparator(layout, {}), false);
});

test("two Headroom blocks and no props.fit: it cannot tell, so none", () => {
  const layout = window(
    bar(
      block("status-bar", "workspace-status"),
      block("limits", "headroom"),
      block("more-limits", "headroom"),
    ),
  );
  assert.equal(stripSeparator(layout, {}), false);
});

test("with props.fit the right one of two Headroom blocks is found", () => {
  const layout = {
    id: "root",
    type: "column",
    children: [
      {
        id: "sidebar-bar",
        type: "row",
        children: [block("side-limits", "headroom")],
      },
      bar(block("status-bar", "workspace-status"), block("limits", "headroom")),
    ],
  };
  assert.equal(stripSeparator(layout, { fit: "limits" }), true);
  assert.equal(stripSeparator(layout, { fit: "side-limits" }), false);
});

test("a props.fit that names no block draws none", () => {
  const layout = window(
    bar(block("status-bar", "workspace-status"), block("limits", "headroom")),
  );
  assert.equal(stripSeparator(layout, { fit: "elsewhere" }), false);
});

test("a block that follows another in a column draws none", () => {
  const layout = {
    id: "root",
    type: "column",
    children: [
      block("status-bar", "workspace-status"),
      block("limits", "headroom"),
    ],
  };
  assert.equal(stripSeparator(layout, {}), false);
});

test("a hidden block before it does not count", () => {
  const layout = window(
    bar(
      block("status-bar", "workspace-status", { hidden: true }),
      block("limits", "headroom"),
    ),
  );
  assert.equal(stripSeparator(layout, {}), false);
});

test("a shown block before a hidden one still counts", () => {
  const layout = window(
    bar(
      block("status-bar", "workspace-status"),
      block("clock", "clock", { hidden: true }),
      block("limits", "headroom"),
    ),
  );
  assert.equal(stripSeparator(layout, {}), true);
});

test("with no layout it draws none", () => {
  assert.equal(stripSeparator(null, {}), false);
});

// The draft's three accounts: maxi at 62 % of its 5-hour window, maxi · Terac
// at 91 % of its 5-hour window, maxilr at 23 % of its weekly window alone.
// By hand, at 11.8 px a letter of ASCII is 7.08 px and the middle dot 12.98:
// full 28 + 142.16 + 204.7 + 137.72 + 32 = 544.58 px, without labels
// 28 + 107.84 + 107.84 + 89.24 + 32 = 364.92, without bars too
// 28 + 57.84 + 57.84 + 39.24 + 32 = 214.92.
const THREE = [
  { label: "maxi", bars: true, percent: "62%", tag: "5h" },
  { label: "maxi · Terac", bars: true, percent: "91%", tag: "5h" },
  { label: "maxilr", bars: true, percent: "23%", tag: "" },
];

test("the draft's three accounts are full at 640 px", () => {
  assert.deepEqual(stripFit(640, THREE, false), {
    density: "full",
    shown: 3,
    more: 0,
  });
  assert.deepEqual(stripFit(640, THREE, true), {
    density: "full",
    shown: 3,
    more: 0,
  });
});

test("at 400 px they lose their labels", () => {
  assert.deepEqual(stripFit(400, THREE, false), {
    density: "no-labels",
    shown: 3,
    more: 0,
  });
});

test("at 250 px they lose their bars too", () => {
  assert.deepEqual(stripFit(250, THREE, false), {
    density: "no-bars",
    shown: 3,
    more: 0,
  });
});

test("the middle dot counts 1.1 em: 544 px is not enough for them full", () => {
  // At 0.6 em the dot would make 538.68 px, which 544 px would hold.
  assert.equal(stripFit(544, THREE, false).density, "no-labels");
  assert.equal(stripFit(544.6, THREE, false).density, "full");
});

test("narrower than even the first mark and percentage need, the first stays and the rest are counted", () => {
  // The first alone, without bars: 28 + 57.84 = 85.84 px, more than 80.
  assert.deepEqual(stripFit(80, THREE, false), {
    density: "no-bars",
    shown: 1,
    more: 2,
  });
});

test("a block not measured yet is drawn full, every account", () => {
  assert.deepEqual(stripFit(null, THREE, false), {
    density: "full",
    shown: 3,
    more: 0,
  });
});

// Twelve accounts at 62 % of a 5-hour window. Without labels and bars each
// item is mark 12, "62%" 21.24 and "5h" 12.6, 6 apart: 57.84 px. "+N" with
// one digit is 2 × 7.08 = 14.16 px, with two 21.24.
const TWELVE = Array.from({ length: 12 }, (_, index) => ({
  label: `account ${index + 1}`,
  bars: true,
  percent: "62%",
  tag: "5h",
}));
const ITEM = 57.84;
const plus = (more) => (String(more).length + 1) * 7.08;
// The hand sum of `shown` items beside "+more", 14 px each end, 16 apart.
const handSum = (shown, more) =>
  28 + shown * ITEM + (shown - 1) * 16 + (more > 0 ? 16 + plus(more) : 0);

test("twelve accounts that do not fit 408 px: as many as fit, and +N for the rest", () => {
  assert.ok(handSum(12, 0) > 408);
  const fit = stripFit(408, TWELVE, false);
  assert.equal(fit.density, "no-bars");
  assert.ok(fit.shown < 12, JSON.stringify(fit));
  assert.ok(fit.more > 0, JSON.stringify(fit));
  assert.equal(fit.shown + fit.more, 12);
  assert.ok(handSum(fit.shown, fit.more) <= 408, JSON.stringify(fit));
  assert.ok(handSum(fit.shown + 1, fit.more - 1) > 408, JSON.stringify(fit));
  // 28 + 4 × 57.84 + 3 × 16 + 16 + 14.16 = 337.52 px; a fifth makes 411.36.
  assert.deepEqual(fit, { density: "no-bars", shown: 4, more: 8 });
});

test("after the separator the ends are 2 + 1 + 16 before and 14 after", () => {
  // Four and "+8": 2 + 1 + 16 + 14 + 4 × 57.84 + 3 × 16 + 16 + 14.16 = 342.52.
  assert.deepEqual(stripFit(342.53, TWELVE, true), {
    density: "no-bars",
    shown: 4,
    more: 8,
  });
  assert.deepEqual(stripFit(342.51, TWELVE, true), {
    density: "no-bars",
    shown: 3,
    more: 9,
  });
});

test("the +N item's own width counts: two digits are wider than one", () => {
  // Twenty accounts at 408 px: four and "+16" make 28 + 279.36 + 16 + 21.24
  // = 344.6 px; five and "+15" make 418.44.
  const twenty = Array.from({ length: 20 }, () => TWELVE[0]);
  assert.deepEqual(stripFit(344.61, twenty, false), {
    density: "no-bars",
    shown: 4,
    more: 16,
  });
  assert.deepEqual(stripFit(344.59, twenty, false), {
    density: "no-bars",
    shown: 3,
    more: 17,
  });
});

test("five accounts that fit give no +N", () => {
  // Full: 28 + 5 × (12 + "account 1" 63.72 + 44 + 21.24 + 12.6 + 24) + 4 × 16
  // = 979.8 px; without labels 28 + 5 × 107.84 + 64 = 631.2.
  const five = TWELVE.slice(0, 5);
  assert.deepEqual(stripFit(640, five, false), {
    density: "no-labels",
    shown: 5,
    more: 0,
  });
});

test("a label of 30 letters counts 92 px", () => {
  // Mark 12, then 6, then the label: 28 + 12 + 6 + 92 = 138 px.
  const long = [{ label: "a".repeat(30), bars: false, percent: null, tag: "" }];
  assert.equal(stripFit(138, long, false).density, "full");
  assert.equal(stripFit(137.9, long, false).density, "no-labels");
});

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("a letter of ASCII counts 0.6 em, any other letter 1.1 em", () => {
  close(textWidth("maxi", 10), 24);
  close(textWidth("é", 10), 11);
  close(textWidth("·", 11.8), 12.98);
  close(textWidth("日本", 10), 22);
  close(textWidth("a😀", 10), 17);
});
