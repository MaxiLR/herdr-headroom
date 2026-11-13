import { test } from "node:test";
import assert from "node:assert/strict";
import {
  railNumber,
  railTooltip,
  showsNumber,
} from "../mods/headroom/logic/rail.js";
import { rowOf } from "../mods/headroom/logic/rows.js";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;

const codex = (windows) =>
  reading({
    id: "codex:acct-codex",
    provider: "codex",
    label: "codex",
    plan: "Plus",
    windows,
  });

test("a pair row shows its 5-hour percent, tagged 5h", () => {
  assert.deepEqual(railNumber(rowOf(reading(), NOW)), {
    text: "62%",
    tag: "5h",
    level: "normal",
  });
});

test("the number takes the level of the tightest window", () => {
  const row = rowOf(
    reading({
      windows: [win("7d", 0.78, WEEKLY_RESET), win("5h", 0.91, SHORT_RESET)],
    }),
    NOW,
  );
  assert.deepEqual(railNumber(row), {
    text: "91%",
    tag: "5h",
    level: "critical",
  });
});

test("a weekly-only row shows its weekly percent with no tag", () => {
  const row = rowOf(codex([win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)]), NOW);
  assert.deepEqual(railNumber(row), { text: "23%", tag: "", level: "normal" });
});

test("a per-model window ahead of weekly never gives the number", () => {
  const row = rowOf(
    reading({
      windows: [
        win("7d", 0.41, WEEKLY_RESET),
        win("5h", 0.3, SHORT_RESET),
        win("7d:opus", 0.67, WEEKLY_RESET),
      ],
    }),
    NOW,
  );
  assert.deepEqual(railNumber(row), { text: "41%", tag: "", level: "normal" });
});

test("a signed-out row and a first read show no number", () => {
  assert.equal(railNumber(rowOf(reading({ status: "signed-out" }), NOW)), null);
  assert.equal(
    railNumber(
      rowOf(reading({ status: "stale", fetchedAt: null, windows: [] }), NOW),
    ),
    null,
  );
});

test("the tooltip names the account and gives both windows' numbers", () => {
  assert.equal(
    railTooltip(reading(), NOW),
    "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m",
  );
});

test("a weekly-only tooltip says when its one window resets", () => {
  assert.equal(
    railTooltip(codex([win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)]), NOW),
    "codex: Weekly 23% · resets in 5d 2h",
  );
});

test("the tooltip gives the weekly and the 5-hour numbers only", () => {
  assert.equal(
    railTooltip(
      reading({
        windows: [
          win("7d", 0.41, WEEKLY_RESET),
          win("5h", 0.3, SHORT_RESET),
          win("7d:opus", 0.67, WEEKLY_RESET),
        ],
      }),
      NOW,
    ),
    "maxi: Weekly 41% · 4d 6h, 5-hour 30% · 1h 48m",
  );
});

test("a signed-out account's tooltip asks to sign in again", () => {
  assert.equal(
    railTooltip(reading({ status: "signed-out" }), NOW),
    "maxi: Sign in again",
  );
});

test("a failed read's tooltip gives the percents and why the read failed", () => {
  assert.equal(
    railTooltip(
      reading({
        status: "error",
        error: "network",
        fetchedAt: NOW - 12 * MINUTE,
      }),
      NOW,
    ),
    "maxi: Weekly 41%, 5-hour 62% · Read failed: 12m old · network",
  );
});

test("a first read's tooltip says it is being read", () => {
  assert.equal(
    railTooltip(
      reading({ status: "stale", fetchedAt: null, windows: [] }),
      NOW,
    ),
    "maxi: Not read yet",
  );
});

test("the number is shown at 76 px and 159 px and dropped at 44 px", () => {
  assert.equal(showsNumber(76), true);
  assert.equal(showsNumber(159), true);
  assert.equal(showsNumber(60), true);
  assert.equal(showsNumber(59), false);
  assert.equal(showsNumber(44), false);
});

test("before its size is known the rail shows the number", () => {
  assert.equal(showsNumber(null), true);
});

// Fable's weekly window, at its limit; the row has no bar for it.
const FABLE = win("7d:fable", 1, WEEKLY_RESET, { atLimit: true });
const OPUS = win("7d:opus", 1, WEEKLY_RESET, { atLimit: true });
const GENERAL = [win("7d", 0.41, WEEKLY_RESET), win("5h", 0.62, SHORT_RESET)];

test("a per-model window at its limit ends the tooltip with its name", () => {
  assert.equal(
    railTooltip(reading({ windows: [...GENERAL, FABLE] }), NOW),
    "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m, Fable at limit",
  );
});

test("several per-model windows at their limit are counted in the tooltip", () => {
  assert.equal(
    railTooltip(reading({ windows: [...GENERAL, FABLE, OPUS] }), NOW),
    "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m, 2 models at limit",
  );
});

test("with weekly at its limit too the tooltip names no model", () => {
  const words = railTooltip(
    reading({
      windows: [
        win("7d", 0.41, WEEKLY_RESET, { atLimit: true }),
        win("5h", 0.62, SHORT_RESET),
        FABLE,
      ],
    }),
    NOW,
  );
  assert.doesNotMatch(words, /Fable/);
  assert.doesNotMatch(words, /at limit$/);
});

test("a failed read, a first read and a signed-out account name no model", () => {
  for (const overrides of [
    { status: "error", error: "network", fetchedAt: NOW - 12 * MINUTE },
    { status: "stale", fetchedAt: null },
    { status: "signed-out" },
  ]) {
    const words = railTooltip(
      reading({ windows: [...GENERAL, FABLE], ...overrides }),
      NOW,
    );
    assert.doesNotMatch(words, /Fable/, JSON.stringify(overrides));
  }
});
