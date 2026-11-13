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

// Weekly at 41 %, 5-hour at 30 %, and the per-model windows `models`.
const withModels = (...models) =>
  reading({
    windows: [
      win("7d", 0.41, WEEKLY_RESET),
      win("5h", 0.3, SHORT_RESET),
      ...models,
    ],
  });
const fable = (overrides) => win("7d:fable", 0.67, WEEKLY_RESET, overrides);
const opus = (overrides) => win("7d:opus", 0.5, WEEKLY_RESET, overrides);

test("a per-model window ahead of weekly is neither on the row nor its tightest", () => {
  const r = withModels(fable());
  const row = rowOf(r, NOW);
  assert.equal(row.weekly, r.windows[0]);
  assert.equal(row.short, r.windows[1]);
  assert.equal("models" in row, false);
  assert.equal(row.tightest, r.windows[0]);
  assert.equal(row.limitWords, null);
});

test("a per-model window at its limit is named, and weekly stays the tightest", () => {
  const r = withModels(fable({ atLimit: true }));
  const row = rowOf(r, NOW);
  assert.equal(row.limitWords, "Fable at limit");
  assert.equal(row.tightest, r.windows[0]);
});

test("a per-model window used up is at its limit without the flag", () => {
  const row = rowOf(withModels(win("7d:fable", 1, WEEKLY_RESET)), NOW);
  assert.equal(row.limitWords, "Fable at limit");
});

test("the name is the label after Weekly · ", () => {
  const row = rowOf(
    withModels(fable({ atLimit: true, label: "Weekly · Fable" })),
    NOW,
  );
  assert.equal(row.limitWords, "Fable at limit");
});

test("several per-model windows at their limit are counted", () => {
  const row = rowOf(
    withModels(fable({ atLimit: true }), opus({ atLimit: true })),
    NOW,
  );
  assert.equal(row.limitWords, "2 models at limit");
});

test("only the per-model windows at their limit are named", () => {
  const row = rowOf(withModels(fable(), opus({ atLimit: true })), NOW);
  assert.equal(row.limitWords, "Opus at limit");
});

test("with weekly itself at its limit no per-model window is named", () => {
  const r = reading({
    windows: [
      win("7d", 0.5, WEEKLY_RESET, { atLimit: true }),
      win("5h", 0.3, SHORT_RESET),
      fable({ atLimit: true }),
    ],
  });
  const row = rowOf(r, NOW);
  assert.equal(row.limitWords, null);
  assert.equal(row.tightest, r.windows[0]);
});

test("a failed read, a first read and a signed-out account name no per-model window", () => {
  const { windows } = withModels(fable({ atLimit: true }));
  for (const overrides of [
    { status: "stale", fetchedAt: NOW - HOUR, error: "network" },
    { status: "stale", fetchedAt: null },
    { status: "error", fetchedAt: NOW - HOUR, error: "unexpected" },
    { status: "signed-out" },
  ]) {
    const row = rowOf(reading({ windows, ...overrides }), NOW);
    assert.equal(row.limitWords, null, JSON.stringify(overrides));
  }
});

test("the 5-hour window at its limit is the tightest before a fuller weekly", () => {
  const r = reading({
    windows: [
      win("7d", 0.8, WEEKLY_RESET),
      win("5h", 0.6, SHORT_RESET, { atLimit: true }),
      fable({ atLimit: true }),
    ],
  });
  const row = rowOf(r, NOW);
  assert.equal(row.tightest, r.windows[1]);
  assert.equal(row.limitWords, "Fable at limit");
});

test("a model window less used than weekly leaves the tightest to the general windows", () => {
  const r = reading();
  const row = rowOf(
    { ...r, windows: [...r.windows, win("7d:opus", 0.18, WEEKLY_RESET)] },
    NOW,
  );
  assert.equal(row.tightest, r.windows[1]);
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
  assert.equal(row.tightest, weekly);
});

test("without a weekly window no per-model window is named", () => {
  const short = win("5h", 0.2, SHORT_RESET);
  const row = rowOf(
    reading({ windows: [short, opus({ usedFraction: 1, atLimit: true })] }),
    NOW,
  );
  assert.equal(row.weekly, null);
  assert.equal(row.tightest, short);
  assert.equal(row.limitWords, null);
});

test("a reading without windows has no tightest", () => {
  const row = rowOf(reading({ windows: [] }), NOW);
  assert.equal(row.weekly, null);
  assert.equal(row.short, null);
  assert.equal(row.tightest, null);
  assert.equal(row.limitWords, null);
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
  assert.equal(row.tightest, r.windows[1]);
  assert.equal(row.limitWords, null);
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
