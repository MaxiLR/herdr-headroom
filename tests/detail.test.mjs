import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageText,
  clockText,
  openHeight,
  windowsInOrder,
} from "../mods/headroom/logic/detail.js";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();

test("clockText gives the time alone for a reset later today", () => {
  assert.equal(
    clockText(new Date(2026, 10, 12, 16, 20).getTime(), THURSDAY),
    "16:20",
  );
  assert.equal(
    clockText(new Date(2026, 10, 12, 23, 59).getTime(), THURSDAY),
    "23:59",
  );
});

test("clockText pads the hour and the minutes", () => {
  assert.equal(
    clockText(
      new Date(2026, 10, 13, 9, 5).getTime(),
      new Date(2026, 10, 13, 1, 0).getTime(),
    ),
    "09:05",
  );
});

test("clockText names the weekday for a reset on another day", () => {
  assert.equal(
    clockText(new Date(2026, 10, 16, 20, 30).getTime(), THURSDAY),
    "Mon 20:30",
  );
  assert.equal(
    clockText(new Date(2026, 10, 13, 0, 10).getTime(), THURSDAY),
    "Fri 00:10",
  );
  assert.equal(
    clockText(new Date(2026, 10, 14, 18, 30).getTime(), THURSDAY),
    "Sat 18:30",
  );
});

test("ageText says how old the newest reading is", () => {
  const readings = [
    reading({ fetchedAt: NOW - 9 * MINUTE }),
    reading({ id: "codex:b", fetchedAt: NOW - 2 * MINUTE }),
    reading({ id: "codex:c", fetchedAt: null, status: "stale" }),
  ];
  assert.equal(ageText(readings, NOW), "Read 2m ago");
  assert.equal(
    ageText([reading({ fetchedAt: NOW - 3 * HOUR - 12 * MINUTE })], NOW),
    "Read 3h 12m ago",
  );
});

test("ageText says just now under a minute", () => {
  assert.equal(
    ageText([reading({ fetchedAt: NOW - 20 * 1000 })], NOW),
    "Read just now",
  );
});

test("ageText is null before the first read and with no accounts", () => {
  assert.equal(ageText([], NOW), null);
  assert.equal(
    ageText([reading({ fetchedAt: null, status: "stale", windows: [] })], NOW),
    null,
  );
});

test("windowsInOrder: general longest first, then per-model, then the others", () => {
  const fiveHour = win("5h", 0.62, NOW + HOUR);
  const weekly = win("7d", 0.41, NOW + 4 * DAY);
  const sonnet = win("7d:sonnet", 0.18, NOW + 4 * DAY, {
    label: "Weekly · Sonnet",
  });
  const spark = win("extra:spark:7d", 0.12, NOW + 3 * DAY, {
    label: "Spark · Weekly",
    durationMs: 7 * DAY,
  });
  const ordered = windowsInOrder([spark, fiveHour, sonnet, weekly]);
  assert.deepEqual(
    ordered.map((window) => window.label),
    ["Weekly", "5-hour", "Weekly · Sonnet", "Spark · Weekly"],
  );
});

test("windowsInOrder keeps per-model and other windows in their order", () => {
  const opus = win("7d:opus", 0.3, NOW + DAY, { label: "Weekly · Opus" });
  const sonnet = win("7d:sonnet", 0.6, NOW + DAY, { label: "Weekly · Sonnet" });
  const a = win("extra:a:5h", 0.1, NOW + HOUR, {
    label: "A · 5-hour",
    durationMs: 5 * HOUR,
  });
  const b = win("extra:b:7d", 0.1, NOW + DAY, {
    label: "B · Weekly",
    durationMs: 7 * DAY,
  });
  assert.deepEqual(
    windowsInOrder([a, opus, b, sonnet]).map((window) => window.id),
    ["7d:opus", "7d:sonnet", "extra:a:5h", "extra:b:7d"],
  );
});

test("openHeight grows with the accounts and stops at the most a popup takes", () => {
  const one = openHeight([reading()]);
  const three = openHeight([
    reading(),
    reading({ id: "b" }),
    reading({ id: "c" }),
  ]);
  assert.ok(openHeight([]) < one, "an account adds height");
  assert.ok(one < three, "more accounts, more height");
  const many = Array.from({ length: 20 }, (_, index) =>
    reading({ id: `claude:${index}` }),
  );
  assert.equal(openHeight(many), 640);
});

test("openHeight counts the footer's second switch: 28 px more", () => {
  assert.equal(openHeight([reading()]), 229);
  assert.equal(openHeight([reading()], [], { strip: true }), 257);
  const many = Array.from({ length: 20 }, (_, index) =>
    reading({ id: `claude:${index}` }),
  );
  assert.equal(openHeight(many, [], { strip: true }), 640);
});

test("openHeight leaves out the login line of an account not read yet", () => {
  const first = { status: "stale", fetchedAt: null, windows: [] };
  assert.equal(
    openHeight([reading({ ...first, loginEndsAt: NOW + 2 * DAY })]),
    openHeight([reading({ ...first, loginEndsAt: null })]),
  );
});
