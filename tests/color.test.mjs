import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alpha,
  levelFill,
  levelText,
  mix,
  track,
} from "../mods/headroom/logic/color.js";

// A dark theme made by hand: every colour a level or the track needs.
const DARK = {
  foreground: "#ffffff",
  muted: "#808080",
  working: "#000000",
  blocked: "#c80000",
  chrome: "#202020",
};

// A light one: the track is the foreground at 10 % here too.
const LIGHT = { ...DARK, foreground: "#1a1a1a", chrome: "#f4f4f4" };

test("mix moves a colour a share of the way toward another", () => {
  assert.equal(mix("#000000", "#ffffff", 0), "#000000");
  assert.equal(mix("#000000", "#ffffff", 1), "#ffffff");
  // 255 × 0.5 = 127.5, rounded to 128 = 0x80.
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  // 16 + 239 × 0.22 = 68.58 → 69 = 0x45; 32 + 223 × 0.22 = 81.06 → 81 = 0x51;
  // 48 + 207 × 0.22 = 93.54 → 94 = 0x5e.
  assert.equal(mix("#102030", "#ffffff", 0.22), "#45515e");
  // Toward a darker colour: 200 - 200 × 0.25 = 150 = 0x96.
  assert.equal(mix("#c8c8c8", "#000000", 0.25), "#969696");
});

test("mix moves the alpha of a translucent colour the same share", () => {
  // Alpha 0x17 = 23: 23 + 232 × 0.06 = 36.92 → 37 = 0x25; red and green
  // 255 - 17 × 0.06 = 253.98 → 254 = 0xfe; blue 255 - 16 × 0.06 = 254.04 →
  // 254 = 0xfe. `#eeeeef` has no alpha, so it counts as 0xff.
  assert.equal(mix("#ffffff17", "#eeeeef", 0.06), "#fefefe25");
  // Alpha 0x12 = 18: 18 + 237 × 0.06 = 32.22 → 32 = 0x20; red and green
  // 27 × 0.06 = 1.62 → 2; blue 30 × 0.06 = 1.8 → 2.
  assert.equal(mix("#00000012", "#1b1b1e", 0.06), "#02020220");
  // Toward a translucent colour from an opaque one: 255 - 127 × 0.5 = 191.5
  // → 192 = 0xc0.
  assert.equal(mix("#000000", "#ffffff80", 0.5), "#808080c0");
});

test("alpha writes a share of opacity as the colour's last two digits", () => {
  // 255 × 0.1 = 25.5 → 26 = 0x1a.
  assert.equal(alpha("#ffffff", 0.1), "#ffffff1a");
  // 255 × 0.4 = 102 = 0x66.
  assert.equal(alpha("#336699", 0.4), "#33669966");
  assert.equal(alpha("#336699", 1), "#336699ff");
  assert.equal(alpha("#336699", 0), "#33669900");
});

test("the track is the foreground at 10 % in both appearances", () => {
  assert.equal(track(DARK), "#ffffff1a");
  assert.equal(track(LIGHT), "#1a1a1a1a");
});

test("each level fills its bar with its own theme colour", () => {
  assert.equal(levelFill("normal", DARK), "#808080");
  assert.equal(levelFill("high", DARK), "#000000");
  assert.equal(levelFill("critical", DARK), "#c80000");
  assert.equal(levelFill("limit", DARK), "#c80000");
});

test("a level's number is its colour moved 22 % toward the foreground", () => {
  assert.equal(levelText("normal", DARK), "#808080");
  // 0 + 255 × 0.22 = 56.1 → 56 = 0x38.
  assert.equal(levelText("high", DARK), "#383838");
  // 200 + 55 × 0.22 = 212.1 → 212 = 0xd4; 0 + 255 × 0.22 → 0x38.
  assert.equal(levelText("critical", DARK), "#d43838");
  assert.equal(levelText("limit", DARK), "#d43838");
});
