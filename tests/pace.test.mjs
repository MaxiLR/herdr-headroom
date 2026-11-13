import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, paceOf, untilReset } from "../mods/headroom/logic/pace.js";
import { NOW, win } from "./helpers/fakes.mjs";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${actual} to be ${expected}`,
  );

test("a weekly window resetting in 4d 6h has its mark at 66/168", () => {
  const weekly = win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR);
  near(paceOf(weekly, NOW), 66 / 168);
  assert.equal(untilReset(weekly, NOW), "4d 6h");
});

test("a 5-hour window resetting in 1h 48m has its mark at 0.64", () => {
  const short = win("5h", 0.62, NOW + HOUR + 48 * MINUTE);
  near(paceOf(short, NOW), 0.64);
  assert.equal(untilReset(short, NOW), "1h 48m");
});

test("a reset time in the past gives a full mark and <1m", () => {
  const past = win("5h", 0.3, NOW - 10 * MINUTE);
  assert.equal(paceOf(past, NOW), 1);
  assert.equal(untilReset(past, NOW), "<1m");
});

test("a reset time further than the window's length gives an empty mark", () => {
  const ahead = win("5h", 0.3, NOW + 6 * HOUR);
  assert.equal(paceOf(ahead, NOW), 0);
});

test("a window that has not started has no mark and no countdown", () => {
  const idle = win("5h", 0, null);
  assert.equal(paceOf(idle, NOW), null);
  assert.equal(untilReset(idle, NOW), null);
});

test("countdown below one minute is <1m, zero and negative too", () => {
  assert.equal(countdown(59 * SECOND), "<1m");
  assert.equal(countdown(0), "<1m");
  assert.equal(countdown(-5 * MINUTE), "<1m");
});

test("countdown below one hour gives whole minutes", () => {
  assert.equal(countdown(MINUTE), "1m");
  assert.equal(countdown(MINUTE + 59 * SECOND), "1m");
  assert.equal(countdown(42 * MINUTE + 30 * SECOND), "42m");
  assert.equal(countdown(59 * MINUTE + 59 * SECOND), "59m");
});

test("countdown below one day gives hours and minutes", () => {
  assert.equal(countdown(3 * HOUR + 12 * MINUTE), "3h 12m");
  assert.equal(countdown(3 * HOUR + 12 * MINUTE + 59 * SECOND), "3h 12m");
  assert.equal(countdown(3 * HOUR), "3h");
  assert.equal(countdown(3 * HOUR + 40 * SECOND), "3h");
  assert.equal(countdown(21 * HOUR), "21h");
  assert.equal(countdown(23 * HOUR + 59 * MINUTE), "23h 59m");
});

test("countdown from one day gives days and hours", () => {
  assert.equal(countdown(2 * DAY + 4 * HOUR), "2d 4h");
  assert.equal(countdown(2 * DAY + 4 * HOUR + 59 * MINUTE), "2d 4h");
  assert.equal(countdown(5 * DAY + 2 * HOUR), "5d 2h");
  assert.equal(countdown(DAY), "1d");
  assert.equal(countdown(2 * DAY + 30 * MINUTE), "2d");
});
