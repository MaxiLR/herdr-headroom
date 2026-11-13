import { test } from "node:test";
import assert from "node:assert/strict";
import {
  failedText,
  loginText,
  modelName,
  numbersText,
  percentText,
  shortDate,
  tagOf,
} from "../mods/headroom/logic/words.js";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;

test("percentText gives the used percent rounded down", () => {
  assert.equal(percentText(win("7d", 0.41, WEEKLY_RESET)), "41%");
  assert.equal(percentText(win("7d", 0.416, WEEKLY_RESET)), "41%");
  assert.equal(percentText(win("7d", 0.999, WEEKLY_RESET)), "99%");
  assert.equal(percentText(win("7d", 0, WEEKLY_RESET)), "0%");
});

test("percentText is exact for fractions that are not exact in binary", () => {
  assert.equal(percentText(win("7d", 0.29, WEEKLY_RESET)), "29%");
  assert.equal(percentText(win("7d", 0.57, WEEKLY_RESET)), "57%");
});

test("percentText stays within 0 to 100", () => {
  assert.equal(percentText(win("7d", 1.4, WEEKLY_RESET)), "100%");
  assert.equal(percentText(win("7d", -0.1, WEEKLY_RESET)), "0%");
});

test("numbersText gives the percent and the countdown", () => {
  const weekly = win("7d", 0.41, WEEKLY_RESET);
  assert.equal(numbersText(weekly, NOW, {}), "41% · 4d 6h");
  assert.equal(
    numbersText(weekly, NOW, { alone: false, failed: false }),
    "41% · 4d 6h",
  );
});

test("numbersText alone says when it resets", () => {
  const weekly = win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR);
  assert.equal(
    numbersText(weekly, NOW, { alone: true }),
    "23% · resets in 5d 2h",
  );
});

test("numbersText of a failed reading gives the percent alone", () => {
  const weekly = win("7d", 0.41, WEEKLY_RESET);
  assert.equal(numbersText(weekly, NOW, { failed: true }), "41%");
  assert.equal(numbersText(weekly, NOW, { alone: true, failed: true }), "41%");
});

test("numbersText at the limit says so with the countdown", () => {
  const short = win("5h", 0.6, NOW + 38 * MINUTE, { atLimit: true });
  assert.equal(numbersText(short, NOW, {}), "At limit · 38m");
  assert.equal(numbersText(short, NOW, { alone: true }), "At limit · 38m");
  const full = win("5h", 1, NOW + 38 * MINUTE);
  assert.equal(numbersText(full, NOW, {}), "At limit · 38m");
});

test("numbersText at the limit without a reset time", () => {
  const short = win("5h", 1, null);
  assert.equal(numbersText(short, NOW, {}), "At limit");
});

test("numbersText of a window that has not started", () => {
  const short = win("5h", 0, null);
  assert.equal(numbersText(short, NOW, {}), "0% · not started");
  assert.equal(numbersText(short, NOW, { alone: true }), "0% · not started");
});

test("failedText gives the age and the reason", () => {
  const stale = (error) =>
    reading({ status: "stale", fetchedAt: NOW - 12 * MINUTE, error });
  assert.equal(failedText(stale("network"), NOW), "12m old · network");
  assert.equal(failedText(stale("auth"), NOW), "12m old · sign-in");
  assert.equal(failedText(stale("unexpected"), NOW), "12m old · unexpected");
  assert.equal(
    failedText(
      reading({
        status: "stale",
        fetchedAt: NOW - 2 * DAY - 4 * HOUR,
        error: "network",
      }),
      NOW,
    ),
    "2d 4h old · network",
  );
});

test("failedText without a fetchedAt gives the reason alone", () => {
  const failed = (error) =>
    reading({ status: "error", fetchedAt: null, windows: [], error });
  assert.equal(failedText(failed("network"), NOW), "network");
  assert.equal(failedText(failed("auth"), NOW), "sign-in");
  assert.equal(failedText(failed("unexpected"), NOW), "unexpected");
});

test("shortDate gives the local month and day", () => {
  assert.equal(shortDate(new Date(2026, 10, 9, 12, 0).getTime()), "Nov 9");
  assert.equal(shortDate(new Date(2026, 0, 31, 0, 0).getTime()), "Jan 31");
  assert.equal(shortDate(new Date(2026, 11, 1, 23, 59).getTime()), "Dec 1");
  assert.equal(shortDate(new Date(2026, 4, 15, 8, 0).getTime()), "May 15");
  assert.equal(shortDate(new Date(2026, 8, 3, 8, 0).getTime()), "Sep 3");
});

test("a signed-out login ended at loginEndsAt when that has passed", () => {
  const signedOut = reading({
    status: "signed-out",
    windows: [],
    fetchedAt: NOW,
    loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
  });
  assert.equal(loginText(signedOut, NOW), "Login ended Nov 9");
});

test("a signed-out login ended when it was found otherwise", () => {
  const found = new Date(2026, 10, 10, 12, 0).getTime();
  const early = reading({
    status: "signed-out",
    windows: [],
    fetchedAt: found,
    loginEndsAt: NOW + 20 * DAY,
  });
  assert.equal(loginText(early, NOW), "Login ended Nov 10");
  const codex = reading({
    provider: "codex",
    status: "signed-out",
    windows: [],
    fetchedAt: found,
  });
  assert.equal(loginText(codex, NOW), "Login ended Nov 10");
});

test("a login that ends soon gives the days left rounded up", () => {
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + 2 * DAY }), NOW),
    "Login ends in 2 days",
  );
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + DAY + HOUR }), NOW),
    "Login ends in 2 days",
  );
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + 3 * DAY }), NOW),
    "Login ends in 3 days",
  );
});

test("a login that ends within a day is 1 day", () => {
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + 5 * HOUR }), NOW),
    "Login ends in 1 day",
  );
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + DAY }), NOW),
    "Login ends in 1 day",
  );
});

test("a login that does not end soon has no text", () => {
  assert.equal(loginText(reading(), NOW), null);
  assert.equal(
    loginText(reading({ loginEndsAt: NOW + 3 * DAY + 1 }), NOW),
    null,
  );
});

test("modelName gives the label after Weekly · ", () => {
  assert.equal(
    modelName(win("7d:opus", 0.5, WEEKLY_RESET, { label: "Weekly · Opus" })),
    "Opus",
  );
  assert.equal(modelName(win("7d:sonnet", 0.5, WEEKLY_RESET)), "Sonnet");
});

test("tagOf names the short window when it is the tightest", () => {
  const weekly = win("7d", 0.41, WEEKLY_RESET);
  const short = win("5h", 0.62, SHORT_RESET);
  assert.equal(tagOf({ weekly, short, models: [], tightest: short }), "5h");
  assert.equal(tagOf({ weekly, short, models: [], tightest: weekly }), "");
  assert.equal(
    tagOf({ weekly: null, short: null, models: [], tightest: null }),
    "",
  );
});
