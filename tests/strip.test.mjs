import { test } from "node:test";
import assert from "node:assert/strict";
import { stripDensity, stripSeparator } from "../mods/headroom/logic/strip.js";

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
const THREE = [
  { label: "maxi", bars: true, percent: "62%", tag: "5h" },
  { label: "maxi · Terac", bars: true, percent: "91%", tag: "5h" },
  { label: "maxilr", bars: true, percent: "23%", tag: "" },
];

test("the draft's three accounts are full at 640 px", () => {
  assert.equal(stripDensity(640, THREE, false), "full");
  assert.equal(stripDensity(640, THREE, true), "full");
});

test("at 400 px they lose their labels", () => {
  assert.equal(stripDensity(400, THREE, false), "no-labels");
});

test("at 250 px they lose their bars too", () => {
  assert.equal(stripDensity(250, THREE, false), "no-bars");
});

test("narrower than even the marks and percentages need, they stay", () => {
  assert.equal(stripDensity(80, THREE, false), "no-bars");
});

test("a block not measured yet is drawn full", () => {
  assert.equal(stripDensity(null, THREE, false), "full");
});
