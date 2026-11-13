import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const THREE = [
  reading(),
  reading({
    id: "claude:acct-terac:org-terac",
    label: "maxi · Terac",
    windows: [win("7d", 0.78, NOW + 2 * DAY), win("5h", 0.91, NOW + 2 * HOUR)],
  }),
  reading({
    id: "codex:acct-maxilr",
    provider: "codex",
    label: "maxilr",
    plan: "Plus",
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  }),
];

const show = (lines) => lines.join("\n");

test("the detail view opens as a 380 px popup of every account", (t) => {
  const result = drawActing(
    t,
    "detail",
    { props: { form: "detail", overlay: "overlay-1" }, readings: [reading()] },
    "form.open(view);",
  );
  if (!result) return;
  assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
  const [name, spec] = result.calls[0];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "popup");
  assert.equal(spec.width, 380);
  assert.deepEqual(spec.props, { form: "detail" });
});

for (const [form, size] of [
  ["list", { width: 268, height: 300 }],
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`each account in the ${form} is a button with a click`, (t) => {
    const lines = drawForm(t, form, { size, readings: THREE });
    if (!lines) return;
    for (const index of [0, 1, 2]) {
      const row = withId(lines, `account-${index}`) ?? "";
      assert.match(row, /:role\[Str\("button"\)\]/, show(lines));
      assert.match(row, /:on_click\(fn\)/, row);
    }
  });
}

test("the list header's control is named Accounts and settings and has a click", (t) => {
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 300 },
    readings: THREE,
  });
  if (!lines) return;
  const control = withId(lines, "open-detail") ?? "";
  assert.match(control, /:on_click\(fn\)/, show(lines));
  assert.ok(
    control.includes(':accessibility_label[Str("Accounts and settings")]'),
    control,
  );
});
