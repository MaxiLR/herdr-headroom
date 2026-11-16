import { test } from "node:test";
import assert from "node:assert/strict";
import { canCut } from "../mods/headroom/logic/cut.js";

// Widths by hand: an ASCII letter is 0.6 of the font size, any other 1.1.

test("work at 13 px, 31.2 px, cannot be cut in a 100 px place", () => {
  assert.equal(canCut("work", 13, 100), false);
});

test("54 ASCII letters at 13 px, 421.2 px, can be cut in a 200 px place", () => {
  assert.equal(canCut("a".repeat(54), 13, 200), true);
});

test("ten letters at 10 px fit a 100 px place in ASCII, 60 px, but not as accented letters, 110 px", () => {
  assert.equal(canCut("eeeeeeeeee", 10, 100), false);
  assert.equal(canCut("éééééééééé", 10, 100), true);
});
