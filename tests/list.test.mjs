import { test } from "node:test";
import assert from "node:assert/strict";
import { listRowOf } from "../mods/headroom/logic/list.js";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;
const WIDE = 268;
const NARROW = 180;

const weeklyOnly = () =>
  reading({
    provider: "codex",
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  });
const shortOnly = () => reading({ windows: [win("5h", 0.62, SHORT_RESET)] });

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);

test("a pair row has both bars and the weekly numbers left of the 5-hour ones", () => {
  const row = listRowOf(reading(), NOW, WIDE);
  assert.equal(row.label, "maxi");
  assert.equal(row.provider, "claude");
  assert.equal(row.state, "ok");
  assert.equal(row.note, null);
  assert.equal(row.dimmed, false);
  assert.equal(row.pair.full.fraction, 0.41);
  assert.equal(row.pair.full.level, "normal");
  near(row.pair.full.pace, 66 / 168);
  assert.equal(row.pair.short.fraction, 0.62);
  near(row.pair.short.pace, 0.64);
  assert.deepEqual(row.numbers, {
    left: { word: null, parts: ["41%", "4d 6h"], level: "normal" },
    right: { word: "5-hour", parts: ["62%", "1h 48m"], level: "normal" },
  });
  assert.equal("models" in row, false);
});

test("below 220 px the 5-hour numbers lose their word", () => {
  const row = listRowOf(reading(), NOW, NARROW);
  assert.deepEqual(row.numbers.right, {
    word: null,
    parts: ["62%", "1h 48m"],
    level: "normal",
  });
  assert.equal(listRowOf(reading(), NOW, 219).numbers.right.word, null);
  assert.equal(listRowOf(reading(), NOW, 220).numbers.right.word, "5-hour");
});

test("before the block is laid out the row is drawn wide", () => {
  assert.equal(listRowOf(reading(), NOW, null).numbers.right.word, "5-hour");
});

test("weekly only has one full bar and its numbers say resets in", () => {
  const row = listRowOf(weeklyOnly(), NOW, WIDE);
  assert.equal(row.pair.short, null);
  assert.equal(row.pair.full.fraction, 0.23);
  assert.deepEqual(row.numbers, {
    left: { word: null, parts: ["23%", "resets in 5d 2h"], level: "normal" },
    right: null,
  });
});

test("weekly only below 220 px drops resets in", () => {
  const row = listRowOf(weeklyOnly(), NOW, NARROW);
  assert.deepEqual(row.numbers.left.parts, ["23%", "5d 2h"]);
});

test("5-hour only has the thin bar alone and its numbers on the left", () => {
  const row = listRowOf(shortOnly(), NOW, WIDE);
  assert.equal(row.pair.full, null);
  assert.equal(row.pair.short.fraction, 0.62);
  assert.deepEqual(row.numbers, {
    left: {
      word: "5-hour",
      parts: ["62%", "resets in 1h 48m"],
      level: "normal",
    },
    right: null,
  });
});

test("5-hour only below 220 px has neither its word nor resets in", () => {
  const row = listRowOf(shortOnly(), NOW, NARROW);
  assert.deepEqual(row.numbers.left, {
    word: null,
    parts: ["62%", "1h 48m"],
    level: "normal",
  });
});

test("each bar and its numbers take their own level", () => {
  const row = listRowOf(
    reading({
      windows: [win("7d", 0.78, WEEKLY_RESET), win("5h", 0.91, SHORT_RESET)],
    }),
    NOW,
    WIDE,
  );
  assert.equal(row.pair.full.level, "high");
  assert.equal(row.pair.short.level, "critical");
  assert.equal(row.numbers.left.level, "high");
  assert.equal(row.numbers.right.level, "critical");
});

test("at its limit the numbers become At limit and the time left", () => {
  const row = listRowOf(
    reading({
      windows: [
        win("7d", 0.81, WEEKLY_RESET),
        win("5h", 0.97, NOW + 38 * MINUTE, { atLimit: true }),
      ],
    }),
    NOW,
    WIDE,
  );
  assert.equal(row.pair.short.level, "limit");
  assert.deepEqual(row.numbers.right, {
    word: "5-hour",
    parts: ["At limit", "38m"],
    level: "limit",
  });
});

test("a per-model window ahead of weekly is neither a bar nor spoken", () => {
  const row = listRowOf(
    reading({
      windows: [
        win("7d", 0.41, WEEKLY_RESET),
        win("5h", 0.3, SHORT_RESET),
        win("7d:fable", 0.67, WEEKLY_RESET, { label: "Weekly · Fable" }),
      ],
    }),
    NOW,
    WIDE,
  );
  assert.equal("models" in row, false);
  assert.equal(row.pair.full.fraction, 0.41);
  assert.equal(row.pair.short.fraction, 0.3);
  assert.equal(
    row.spoken,
    "maxi, Weekly 41% used, resets in 4d 6h, 5-hour 30% used, resets in 1h 48m",
  );
});

test("a window that has not started has no pace and says not started", () => {
  const row = listRowOf(
    reading({
      windows: [win("7d", 0, NOW + 6 * DAY + 20 * HOUR), win("5h", 0, null)],
    }),
    NOW,
    WIDE,
  );
  assert.equal(row.pair.short.pace, null);
  assert.notEqual(row.pair.full.pace, null);
  assert.deepEqual(row.numbers.right.parts, ["0%", "not started"]);
});

test("a first read has empty tracks and no numbers", () => {
  const row = listRowOf(
    reading({ status: "stale", fetchedAt: null, windows: [] }),
    NOW,
    WIDE,
  );
  assert.equal(row.state, "first");
  assert.deepEqual(row.pair, {
    full: { fraction: 0, level: "normal", pace: null },
    short: { fraction: 0, level: "normal", pace: null },
  });
  assert.equal(row.numbers, null);
  assert.equal(row.note, null);
  assert.equal(row.dimmed, false);
});

test("a failed read keeps the last bars dimmed, percentages only, and its age", () => {
  const row = listRowOf(
    reading({
      status: "stale",
      fetchedAt: NOW - 12 * MINUTE,
      error: "network",
    }),
    NOW,
    WIDE,
  );
  assert.equal(row.state, "failed");
  assert.equal(row.dimmed, true);
  assert.equal(row.pair.full.fraction, 0.41);
  assert.equal(row.pair.short.fraction, 0.62);
  assert.deepEqual(row.note, { text: "12m old · network", tone: "muted" });
  assert.deepEqual(row.numbers, {
    left: { word: null, parts: ["41%"], level: "normal" },
    right: { word: "5-hour", parts: ["62%"], level: "normal" },
  });
});

test("a failed read with no earlier reading looks like a first read with its reason", () => {
  const row = listRowOf(
    reading({ status: "error", fetchedAt: null, error: "auth", windows: [] }),
    NOW,
    WIDE,
  );
  assert.deepEqual(row.note, { text: "sign-in", tone: "muted" });
  assert.deepEqual(row.pair, {
    full: { fraction: 0, level: "normal", pace: null },
    short: { fraction: 0, level: "normal", pace: null },
  });
  assert.equal(row.numbers, null);
});

test("signed out: Sign in again, when the login ended, no bars and no numbers", () => {
  const row = listRowOf(
    reading({
      status: "signed-out",
      loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
    }),
    NOW,
    WIDE,
  );
  assert.equal(row.state, "signed-out");
  assert.deepEqual(row.note, { text: "Sign in again", tone: "accent" });
  assert.equal(row.ended, "Login ended Nov 9");
  assert.equal(row.pair, null);
  assert.equal(row.numbers, null);
  assert.equal("models" in row, false);
});

test("a login ending within 3 days is said on the label line in the high tone", () => {
  const row = listRowOf(reading({ loginEndsAt: NOW + 2 * DAY }), NOW, WIDE);
  assert.deepEqual(row.note, { text: "Login ends in 2 days", tone: "high" });
  assert.equal(row.ended, null);
  assert.equal(row.pair.full.fraction, 0.41);
});

test("a row is spoken with its label, each window's use and its reset", () => {
  assert.equal(
    listRowOf(reading(), NOW, WIDE).spoken,
    "maxi, Weekly 41% used, resets in 4d 6h, 5-hour 62% used, resets in 1h 48m",
  );
  assert.equal(
    listRowOf(
      reading({
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
      }),
      NOW,
      WIDE,
    ).spoken,
    "maxi, Sign in again, Login ended Nov 9",
  );
});
