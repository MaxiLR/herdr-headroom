import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawn,
  hintCount,
  moreBelow,
  wheel,
} from "../mods/headroom/logic/hint.js";
import { NOW, reading } from "./helpers/fakes.mjs";

// Six accounts of 70 px, one after another.
const SIX = [70, 70, 70, 70, 70, 70];

test("at the top of an area that holds two, four accounts are below", () => {
  assert.equal(moreBelow(SIX, 140, 0), 4);
});

test("scrolled by one account, three are below", () => {
  assert.equal(moreBelow(SIX, 140, 70), 3);
});

test("at the end, none is below", () => {
  assert.equal(moreBelow(SIX, 140, 280), 0);
});

test("an area that holds them all has none below", () => {
  assert.equal(moreBelow(SIX, 420, 0), 0);
  assert.equal(moreBelow(SIX, 500, 0), 0);
});

test("no accounts have none below", () => {
  assert.equal(moreBelow([], 140, 0), 0);
});

test("an account cut off by part of its height counts as below", () => {
  // The area ends 5 px into the third account.
  assert.equal(moreBelow(SIX, 145, 0), 4);
});

test("accounts drawn from an offset are counted from it", () => {
  // The rail's accounts start 4 px down: the second ends at 144, past 140.
  assert.equal(moreBelow(SIX, 140, 0, 4), 5);
  assert.equal(moreBelow(SIX, 148, 0, 4), 4);
});

// A copy drawn as `form` in a block of `size`, with six accounts of both bars:
// 70 px each in the list, 44 px in the rail.
function sixAs(form, size, ui = {}) {
  const readings = Array.from({ length: 6 }, (_, i) =>
    reading({ id: `claude:acct-${i}:org-${i}`, label: `account ${i}` }),
  );
  return { form, size, now: NOW, readings, ui };
}

// The list fitted to two of them: 165 px under the header for 428 px of
// accounts, 263 px of overflow. The rail: 102 px for 272 px, 170 px over.
const LIST = { width: 268, height: 207 };
const RAIL = { width: 76, height: 103 };

test("a wheel toward the bottom moves the list's position down", () => {
  const view = sixAs("list", LIST);
  assert.equal(hintCount(view, "list"), 4);
  assert.equal(wheel(view, "list", -70), true);
  assert.equal(view.ui.list.scrolled, 70);
  assert.equal(hintCount(view, "list"), 3);
  assert.equal(wheel(view, "list", 10), false);
  assert.equal(view.ui.list.scrolled, 60);
});

test("the wheel holds the position between the top and the end", () => {
  const view = sixAs("list", LIST);
  wheel(view, "list", -1000);
  assert.equal(view.ui.list.scrolled, 263);
  assert.equal(hintCount(view, "list"), 0);
  wheel(view, "list", 1000);
  assert.equal(view.ui.list.scrolled, 0);
  assert.equal(hintCount(view, "list"), 4);
});

test("a position past the end comes back within it when the block grows", () => {
  const view = sixAs("rail", RAIL, { rail: { scrolled: 170 } });
  view.size = { width: 76, height: 203 };
  assert.equal(hintCount(view, "rail"), 0);
  assert.equal(view.ui.rail.scrolled, 70);
  view.size = { width: 76, height: 400 };
  hintCount(view, "rail");
  assert.equal(view.ui.rail.scrolled, 0);
});

test("a list drawn again after another form starts from the top", () => {
  // At the end of the list, the hint is gone.
  const ui = { list: { scrolled: 263 } };
  assert.equal(hintCount(sixAs("list", LIST, ui), "list"), 0);
  // Folded to the rail for a frame, the list's scroll area is not drawn and
  // comes back at the top.
  drawn(sixAs("rail", RAIL, ui));
  const back = sixAs("list", LIST, ui);
  drawn(back);
  assert.equal(hintCount(back, "list"), 4);
});

test("a rail drawn again after the strip starts from the top", () => {
  const ui = { rail: { scrolled: 170 } };
  drawn(sixAs("strip", { width: 76, height: 40 }, ui));
  const back = sixAs("rail", RAIL, ui);
  drawn(back);
  assert.equal(hintCount(back, "rail"), 4);
});

test("a form drawn frame after frame keeps its position", () => {
  const ui = { list: { scrolled: 70 } };
  const view = sixAs("list", LIST, ui);
  drawn(view);
  drawn(view);
  assert.equal(hintCount(view, "list"), 3);
});
