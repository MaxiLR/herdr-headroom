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
