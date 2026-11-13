import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here; resets in local time.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();
const MONDAY_2030 = new Date(2026, 10, 16, 20, 30).getTime(); // in 4d 6h
const TODAY_1618 = new Date(2026, 10, 12, 16, 18).getTime(); // in 1h 48m
const SATURDAY_1830 = new Date(2026, 10, 14, 18, 30).getTime(); // in 2d 4h
const TODAY_1701 = new Date(2026, 10, 12, 17, 1).getTime(); // in 2h 31m
const TUESDAY_1630 = new Date(2026, 10, 17, 16, 30).getTime(); // in 5d 2h

const MAXI = "claude:acct-maxi:org-maxi";
const TERAC = "claude:acct-maxi:org-terac";
const MAXILR = "codex:acct-maxilr";

const ACCOUNTS = [
  {
    id: MAXI,
    provider: "claude",
    label: "maxi",
    email: "maxi@example.com",
    organization: null,
    plan: "Max",
  },
  {
    id: TERAC,
    provider: "claude",
    label: "maxi · Terac",
    email: "maxi@terac.example",
    organization: "Terac",
    plan: "Team",
  },
  {
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    email: "maxilr@example.com",
    organization: null,
    plan: null,
  },
];

const maxi = reading({
  id: MAXI,
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("5h", 0.62, TODAY_1618), win("7d", 0.41, MONDAY_2030)],
});
// The 5-hour window first, so the view's order is seen.
const terac = reading({
  id: TERAC,
  label: "maxi · Terac",
  plan: "Team",
  fetchedAt: THURSDAY - 3 * MINUTE,
  windows: [win("5h", 0.91, TODAY_1701), win("7d", 0.78, SATURDAY_1830)],
});
const maxilr = reading({
  id: MAXILR,
  provider: "codex",
  label: "maxilr",
  plan: null,
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("7d", 0.23, TUESDAY_1630)],
});

const show = (lines) => lines.join("\n");

function draw(t, fixture = {}) {
  return drawForm(t, "account", {
    props: { form: "account", account: TERAC, overlay: "overlay-1" },
    size: { width: 380, height: 480 },
    now: THURSDAY,
    readings: [maxi, terac, maxilr],
    accounts: ACCOUNTS,
    ...fixture,
  });
}

test("the account view draws its one account: header, every window, the way to the detail view", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const drawn = texts(lines);
  for (const text of [
    "maxi · Terac",
    "Team",
    "Weekly",
    "5-hour",
    "78%",
    "91%",
    "resets in 2d 4h",
    "Sat 18:30",
    "Accounts and settings",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${show(lines)}`);
  }
  // Nothing of the other accounts.
  for (const text of ["maxi", "maxilr", "41%", "23%"]) {
    assert.ok(!drawn.includes(text), `${text}\n${show(lines)}`);
  }
});

test("the weekly window comes before the 5-hour one, each with its bar", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.indexOf("Weekly") < drawn.indexOf("5-hour"), show(lines));
  for (const id of ["window-0", "window-0-fill", "window-1", "window-1-fill"]) {
    assert.ok(withId(lines, id), `${id}\n${show(lines)}`);
  }
  assert.equal(withId(lines, "window-2"), undefined, show(lines));
});

test("the header's mark names the provider", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const marks = lines.filter((line) =>
    line.includes(':accessibility_label[Str("Claude")]'),
  );
  assert.equal(marks.length, 1, show(lines));
});

test("Accounts and settings is a button with a click", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const row = withId(lines, "open-detail") ?? "";
  assert.match(row, /:role\[Str\("button"\)\]/, show(lines));
  assert.match(row, /:on_click\(fn\)/, row);
});

test("an account that is not connected closes its view once and draws no label", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: "claude:gone:x", overlay: "overlay-1" },
    now: THURSDAY,
    readings: [maxi, terac],
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
  const drawn = texts(result.lines);
  for (const text of ["maxi", "maxi · Terac", "Accounts and settings"]) {
    assert.ok(!drawn.includes(text), `${text}\n${show(result.lines)}`);
  }
});

test("a connected account's view asks nothing of the host", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: TERAC, overlay: "overlay-1" },
    now: THURSDAY,
    readings: [maxi, terac],
    accounts: ACCOUNTS,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("an account that goes away after the view opened closes it once", (t) => {
  const result = drawActing(
    t,
    "account",
    {
      props: { form: "account", account: TERAC, overlay: "overlay-1" },
      now: THURSDAY,
      readings: [maxi, terac],
    },
    "view.readings = [view.readings[0]];",
  );
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
});

test("a copy that is not an overlay draws nothing for an account not connected", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: "claude:gone:x" },
    readings: [maxi],
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
  assert.deepEqual(texts(result.lines), [], show(result.lines));
});

test("a reading with no windows draws its label and the way to the detail view", (t) => {
  const lines = draw(t, { readings: [{ ...terac, windows: [] }] });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("maxi · Terac"), show(lines));
  assert.ok(drawn.includes("Accounts and settings"), show(lines));
  assert.equal(withId(lines, "window-0"), undefined, show(lines));
});
