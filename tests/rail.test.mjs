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

test("a row whose tightest is a per-model window shows that window's percent", () => {
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
  assert.deepEqual(railNumber(row), { text: "67%", tag: "", level: "normal" });
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

test("a per-model window that is the tightest is named in the tooltip", () => {
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
    "maxi: Weekly 41% · 4d 6h, 5-hour 30% · 1h 48m, Opus 67% · 4d 6h",
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
