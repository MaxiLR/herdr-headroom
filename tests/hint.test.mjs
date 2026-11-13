import { test } from "node:test";
import assert from "node:assert/strict";
import { moreBelow } from "../mods/headroom/logic/hint.js";

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
  // The rail's accounts start 4 px down: the second ends at 148, past 145.
  assert.equal(moreBelow(SIX, 145, 0, 4), 5);
  assert.equal(moreBelow(SIX, 148, 0, 4), 4);
});
