import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;

// Weekly at 41 %, 5-hour at 30 %, and Fable's weekly window ahead of both at
// 67 %.
const AHEAD = reading({
  windows: [
    win("7d", 0.41, WEEKLY_RESET),
    win("5h", 0.3, SHORT_RESET),
    win("7d:fable", 0.67, WEEKLY_RESET, { label: "Weekly · Fable" }),
  ],
});

for (const [form, size] of [
  ["list", { width: 268, height: 300 }],
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`the ${form} draws the weekly and the 5-hour bar and no per-model one`, (t) => {
    const lines = drawForm(t, form, { size, readings: [AHEAD] });
    if (!lines) return;
    const all = lines.join("\n");
    assert.ok(withId(lines, "account-0-full"), all);
    assert.ok(withId(lines, "account-0-short"), all);
    assert.equal(
      lines.find((line) => /:id\[Str\("[^"]*-model-/.test(line)),
      undefined,
      all,
    );
    assert.doesNotMatch(texts(lines).join(" "), /67%/, all);
  });
}

for (const [form, size] of [
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`the ${form} reads the weekly percent, not the per-model one`, (t) => {
    const lines = drawForm(t, form, { size, readings: [AHEAD] });
    if (!lines) return;
    assert.ok(texts(lines).includes("41%"), lines.join("\n"));
  });
}
