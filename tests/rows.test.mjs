import { test } from "node:test";
import assert from "node:assert/strict";
import { barOf, isThin, rowOf } from "../mods/headroom/logic/rows.js";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;

test("a window of a day or less is thin", () => {
  assert.equal(isThin(win("5h", 0.5, SHORT_RESET)), true);
  assert.equal(isThin(win("1d", 0.5, null, { durationMs: DAY })), true);
  assert.equal(isThin(win("2d", 0.5, null, { durationMs: DAY + 1 })), false);
  assert.equal(isThin(win("7d", 0.5, WEEKLY_RESET)), false);
});

test("a bar holds the used fraction, the level and the pace", () => {
  const bar = barOf(win("5h", 0.62, SHORT_RESET), NOW);
  assert.equal(bar.fraction, 0.62);
  assert.equal(bar.level, "normal");
  assert.ok(Math.abs(bar.pace - 0.64) < 1e-9);
});

test("a bar's fraction is clamped to 0..1", () => {
  const over = barOf(win("5h", 1.3, SHORT_RESET), NOW);
  assert.equal(over.fraction, 1);
  assert.equal(over.level, "limit");
  assert.equal(barOf(win("5h", -0.2, null), NOW).fraction, 0);
  assert.equal(barOf(win("5h", -0.2, null), NOW).pace, null);
});

test("a row carries the reading's id, provider and label", () => {
  const row = rowOf(reading(), NOW);
  assert.equal(row.id, "claude:acct-maxi:org-maxi");
  assert.equal(row.provider, "claude");
  assert.equal(row.label, "maxi");
});

test("a model window more used than weekly is in models and the tightest", () => {
  const opus = win("7d:opus", 0.67, WEEKLY_RESET);
  const r = reading();
  const row = rowOf({ ...r, windows: [...r.windows, opus] }, NOW);
  assert.equal(row.weekly, r.windows[0]);
  assert.equal(row.short, r.windows[1]);
  assert.deepEqual(row.models, [opus]);
  assert.equal(row.tightest, opus);
});

test("a model window less used than weekly is not in models", () => {
  const opus = win("7d:opus", 0.18, WEEKLY_RESET);
  const r = reading();
  const row = rowOf({ ...r, windows: [...r.windows, opus] }, NOW);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, r.windows[1]);
});

test("models keep the reading's order", () => {
  const opus = win("7d:opus", 0.5, WEEKLY_RESET);
  const sonnet = win("7d:sonnet", 0.8, WEEKLY_RESET);
  const r = reading();
  const row = rowOf(
    { ...r, windows: [opus, r.windows[0], sonnet, r.windows[1]] },
    NOW,
  );
  assert.deepEqual(row.models, [opus, sonnet]);
  assert.equal(row.tightest, sonnet);
});

test("a model window at its limit is in models and the tightest before any higher fraction", () => {
  const opus = win("7d:opus", 0.3, WEEKLY_RESET, { atLimit: true });
  const r = reading();
  const row = rowOf({ ...r, windows: [...r.windows, opus] }, NOW);
  assert.deepEqual(row.models, [opus]);
  assert.equal(row.tightest, opus);
});

test("a model window at its limit is not more used than a weekly at its limit with a higher fraction", () => {
  const weekly = win("7d", 0.5, WEEKLY_RESET, { atLimit: true });
  const opus = win("7d:opus", 0.3, WEEKLY_RESET, { atLimit: true });
  const row = rowOf(reading({ windows: [weekly, opus] }), NOW);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, weekly);
});

test("a tie keeps weekly before short", () => {
  const weekly = win("7d", 0.62, WEEKLY_RESET);
  const short = win("5h", 0.62, SHORT_RESET);
  const row = rowOf(reading({ windows: [short, weekly] }), NOW);
  assert.equal(row.tightest, weekly);
});

test("a weekly-only reading has no short window", () => {
  const weekly = win("7d", 0.41, WEEKLY_RESET);
  const row = rowOf(reading({ windows: [weekly] }), NOW);
  assert.equal(row.weekly, weekly);
  assert.equal(row.short, null);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, weekly);
});

test("without a weekly window there are no models", () => {
  const short = win("5h", 0.2, SHORT_RESET);
  const opus = win("7d:opus", 0.9, WEEKLY_RESET);
  const row = rowOf(reading({ windows: [short, opus] }), NOW);
  assert.equal(row.weekly, null);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, short);
});

test("a reading without windows has no tightest", () => {
  const row = rowOf(reading({ windows: [] }), NOW);
  assert.equal(row.weekly, null);
  assert.equal(row.short, null);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, null);
});

test("an extra: window never reaches the row", () => {
  const extraWeek = win("extra:spark:7d", 0.99, WEEKLY_RESET, {
    label: "Spark · Weekly",
    durationMs: 7 * DAY,
    atLimit: true,
  });
  const extraShort = win("extra:spark:5h", 0.99, SHORT_RESET, {
    label: "Spark · 5-hour",
    durationMs: 5 * HOUR,
  });
  const r = reading();
  const row = rowOf(
    { ...r, windows: [extraWeek, extraShort, ...r.windows] },
    NOW,
  );
  assert.equal(row.weekly, r.windows[0]);
  assert.equal(row.short, r.windows[1]);
  assert.deepEqual(row.models, []);
  assert.equal(row.tightest, r.windows[1]);
});

test("a Codex window of another length counts as general", () => {
  const day = win("1d", 0.3, NOW + 5 * HOUR, { durationMs: DAY });
  const month = win("30d", 0.2, NOW + 9 * DAY, { durationMs: 30 * DAY });
  const row = rowOf(reading({ windows: [month, day] }), NOW);
  assert.equal(row.weekly, month);
  assert.equal(row.short, day);
});

test("each status gives its state", () => {
  assert.equal(rowOf(reading(), NOW).state, "ok");
  assert.equal(
    rowOf(reading({ status: "stale", fetchedAt: null, windows: [] }), NOW)
      .state,
    "first",
  );
  assert.equal(
    rowOf(
      reading({ status: "stale", fetchedAt: NOW - HOUR, error: "network" }),
      NOW,
    ).state,
    "failed",
  );
  assert.equal(
    rowOf(
      reading({
        status: "error",
        fetchedAt: null,
        error: "unexpected",
        windows: [],
      }),
      NOW,
    ).state,
    "failed",
  );
  assert.equal(
    rowOf(reading({ status: "signed-out", windows: [] }), NOW).state,
    "signed-out",
  );
});

test("a login that ends within 3 days warns", () => {
  assert.equal(
    rowOf(reading({ loginEndsAt: NOW + 3 * DAY }), NOW).loginWarning,
    true,
  );
  assert.equal(
    rowOf(reading({ loginEndsAt: NOW + HOUR }), NOW).loginWarning,
    true,
  );
});

test("a login that ends later than 3 days does not warn", () => {
  assert.equal(
    rowOf(reading({ loginEndsAt: NOW + 3 * DAY + 1 }), NOW).loginWarning,
    false,
  );
});

test("no login end or a signed-out account does not warn", () => {
  assert.equal(rowOf(reading(), NOW).loginWarning, false);
  assert.equal(
    rowOf(
      reading({ status: "signed-out", windows: [], loginEndsAt: NOW + DAY }),
      NOW,
    ).loginWarning,
    false,
  );
});
