import { test } from "node:test";
import assert from "node:assert/strict";
import { levelOf } from "../mods/headroom/logic/levels.js";
import { NOW, win } from "./helpers/fakes.mjs";

const RESET = NOW + 60 * 60 * 1000;

test("a window below 75 % is normal", () => {
  assert.equal(levelOf(win("7d", 0, RESET)), "normal");
  assert.equal(levelOf(win("7d", 0.749, RESET)), "normal");
});

test("a window from 75 % is high", () => {
  assert.equal(levelOf(win("7d", 0.75, RESET)), "high");
  assert.equal(levelOf(win("7d", 0.899, RESET)), "high");
});

test("a window from 90 % is critical", () => {
  assert.equal(levelOf(win("7d", 0.9, RESET)), "critical");
  assert.equal(levelOf(win("7d", 0.999, RESET)), "critical");
});

test("a window at 100 % or more is at its limit", () => {
  assert.equal(levelOf(win("7d", 1, RESET)), "limit");
  assert.equal(levelOf(win("5h", 1.2, RESET)), "limit");
});

test("a window the provider flags as at its limit is at its limit", () => {
  assert.equal(levelOf(win("5h", 0.5, RESET, { atLimit: true })), "limit");
});
