import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MAC = { width: 76, height: 300 };
const LINUX = { width: 44, height: 300 };

// maxi at 41 % weekly and 62 % 5-hour; work at 78 % and 91 %; a Codex
// account with a weekly window alone, at 23 %.
const THREE = [
  reading(),
  reading({
    id: "claude:acct-work:org-work",
    label: "work",
    windows: [win("7d", 0.78, NOW + 2 * DAY), win("5h", 0.91, NOW + 2 * HOUR)],
  }),
  reading({
    id: "codex:acct-codex",
    provider: "codex",
    label: "codex",
    plan: "Plus",
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  }),
];

const labelled = (lines, label) =>
  lines.filter((line) =>
    line.includes(`:accessibility_label[Str(${JSON.stringify(label)})]`),
  );

test("at 76 px each account shows its tightest percent, 5h, and its bars", (t) => {
  const lines = drawForm(t, "rail", { size: MAC, readings: THREE });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["62%", "5h", "91%", "5h", "23%"], all);
  assert.ok(withId(lines, "account-0-full"), all);
  assert.ok(withId(lines, "account-0-short"), all);
  assert.ok(withId(lines, "account-1-full"), all);
  assert.ok(withId(lines, "account-1-short"), all);
  assert.ok(withId(lines, "account-2-full"), all);
  assert.equal(withId(lines, "account-2-short"), undefined, all);
  assert.equal(withId(lines, "account-3"), undefined, all);
});

test("each account is a button with its label and numbers as tooltip and name", (t) => {
  const lines = drawForm(t, "rail", { size: MAC, readings: THREE });
  if (!lines) return;
  const first = withId(lines, "account-0") ?? "";
  const words = "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m";
  assert.ok(first.includes(`:tooltip[Str(${JSON.stringify(words)})]`), first);
  assert.ok(
    first.includes(`:accessibility_label[Str(${JSON.stringify(words)})]`),
    first,
  );
  assert.match(first, /:role\[Str\("button"\)\]/);
  assert.match(first, /:on_click/);
  assert.equal(labelled(lines, "Claude").length, 2, lines.join("\n"));
  assert.equal(labelled(lines, "Codex").length, 1, lines.join("\n"));
});

test("at 44 px the numbers are dropped and the marks and bars stay", (t) => {
  const lines = drawForm(t, "rail", { size: LINUX, readings: THREE });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), [], all);
  assert.ok(withId(lines, "account-0-full"), all);
  assert.ok(withId(lines, "account-0-short"), all);
  assert.ok(withId(lines, "account-1-full"), all);
  assert.ok(withId(lines, "account-1-short"), all);
  assert.ok(withId(lines, "account-2-full"), all);
  assert.equal(labelled(lines, "Claude").length, 2, all);
  assert.equal(labelled(lines, "Codex").length, 1, all);
});

test("a signed-out account shows a faded mark and the ! badge, no bars", (t) => {
  const lines = drawForm(t, "rail", {
    size: MAC,
    readings: [reading({ status: "signed-out" })],
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["!"], all);
  assert.equal(withId(lines, "account-0-full"), undefined, all);
  assert.equal(withId(lines, "account-0-short"), undefined, all);
  const [mark] = labelled(lines, "Claude");
  assert.match(mark ?? "", /\.opacity\[Number\(0\.45\)\]/, all);
  const account = withId(lines, "account-0") ?? "";
  assert.ok(account.includes(':tooltip[Str("maxi: Sign in again")]'), all);
  assert.match(account, /:on_click/);
});

test("a signed-out account keeps the ! badge at 44 px", (t) => {
  const lines = drawForm(t, "rail", {
    size: LINUX,
    readings: [reading({ status: "signed-out" })],
  });
  if (!lines) return;
  assert.deepEqual(texts(lines), ["!"], lines.join("\n"));
});

test("a failed read draws its bars at 40 % opacity and keeps the number", (t) => {
  const lines = drawForm(t, "rail", {
    size: MAC,
    readings: [
      reading({
        status: "error",
        error: "network",
        fetchedAt: NOW - 12 * MINUTE,
      }),
    ],
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["62%", "5h"], all);
  assert.match(
    withId(lines, "account-0-full") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
  );
  assert.match(
    withId(lines, "account-0-short") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
  );
});

test("a healthy account's bars are drawn at full opacity", (t) => {
  const lines = drawForm(t, "rail", { size: MAC, readings: [reading()] });
  if (!lines) return;
  const full = withId(lines, "account-0-full");
  assert.ok(full, lines.join("\n"));
  assert.doesNotMatch(full, /\.opacity/);
});

test("with no accounts the rail offers to connect one", (t) => {
  const lines = drawForm(t, "rail", { size: MAC, readings: [] });
  if (!lines) return;
  const connect = withId(lines, "connect-account") ?? "";
  assert.ok(
    connect.includes(':accessibility_label[Str("Connect account")]'),
    lines.join("\n"),
  );
  assert.match(connect, /:on_click/);
});
