import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The draft's three accounts: maxi at 41 % weekly and 62 % 5-hour; maxi ·
// Terac at 78 % and 91 %; a Codex account with a weekly window alone, at 23 %.
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

const block = (id, mod) => ({ id, type: "block", content: { mod } });
const statusBar = (...children) => ({
  id: "root",
  type: "column",
  children: [
    block("panes", "workspace-panes"),
    { id: "status", type: "row", children },
  ],
});

const ALONE = statusBar(block("limits", "headroom"));
const AFTER = statusBar(
  block("status-bar", "workspace-status"),
  block("limits", "headroom"),
);

const BAR_IDS = [
  "account-0-full",
  "account-0-short",
  "account-1-full",
  "account-1-short",
  "account-2-full",
];

const labelled = (lines, label) =>
  lines.filter((line) =>
    line.includes(`:accessibility_label[Str(${JSON.stringify(label)})]`),
  );

test("three accounts alone in the bar: labels, bars, percentages, no separator", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: THREE,
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(
    texts(lines),
    ["maxi", "62%", "5h", "maxi · Terac", "91%", "5h", "maxilr", "23%"],
    all,
  );
  for (const id of BAR_IDS) assert.ok(withId(lines, id), `${id}\n${all}`);
  assert.equal(withId(lines, "account-2-short"), undefined, all);
  assert.equal(withId(lines, "separator"), undefined, all);
  assert.equal(labelled(lines, "Claude").length, 2, all);
  assert.equal(labelled(lines, "Codex").length, 1, all);
});

test("after another block in its row the strip starts with the separator", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: THREE,
    layout: AFTER,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.ok(withId(lines, "separator"), all);
  assert.deepEqual(
    texts(lines),
    ["maxi", "62%", "5h", "maxi · Terac", "91%", "5h", "maxilr", "23%"],
    all,
  );
});

test("props.fit finds its own block among two Headroom blocks", (t) => {
  const layout = statusBar(
    block("other-limits", "headroom"),
    block("limits", "headroom"),
  );
  const lines = drawForm(t, "strip", {
    props: { fit: "limits" },
    size: { width: 640, height: 28 },
    readings: THREE,
    layout,
  });
  if (!lines) return;
  assert.ok(withId(lines, "separator"), lines.join("\n"));
});

test("at 400 px the labels are dropped and the bars stay", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 400, height: 28 },
    readings: THREE,
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["62%", "5h", "91%", "5h", "23%"], all);
  for (const id of BAR_IDS) assert.ok(withId(lines, id), `${id}\n${all}`);
  assert.equal(labelled(lines, "Claude").length, 2, all);
  assert.equal(labelled(lines, "Codex").length, 1, all);
});

test("at 250 px the bars are dropped too; marks and percentages stay", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 250, height: 28 },
    readings: THREE,
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["62%", "5h", "91%", "5h", "23%"], all);
  for (const id of BAR_IDS) assert.equal(withId(lines, id), undefined, all);
  assert.equal(labelled(lines, "Claude").length, 2, all);
  assert.equal(labelled(lines, "Codex").length, 1, all);
});

test("each account is a button that opens its account view, named with its numbers", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: THREE,
    layout: ALONE,
  });
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
});

test("sign in again: a faded mark and the ! badge, no bars, no percentage", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: [reading({ status: "signed-out" })],
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["maxi", "!"], all);
  assert.equal(withId(lines, "account-0-full"), undefined, all);
  assert.equal(withId(lines, "account-0-short"), undefined, all);
  const [mark] = labelled(lines, "Claude");
  assert.match(mark ?? "", /\.opacity\[Number\(0\.45\)\]/, all);
  const account = withId(lines, "account-0") ?? "";
  assert.ok(account.includes(':tooltip[Str("maxi: Sign in again")]'), all);
  assert.match(account, /:on_click/);
});

test("read failed: the bars at 40 % opacity, the percentage kept", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: [
      reading({
        status: "error",
        error: "network",
        fetchedAt: NOW - 12 * MINUTE,
      }),
    ],
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["maxi", "62%", "5h"], all);
  assert.match(
    withId(lines, "account-0-full") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
    all,
  );
  assert.match(
    withId(lines, "account-0-short") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
    all,
  );
});

test("a healthy account's bars are drawn at full opacity", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: [reading()],
    layout: ALONE,
  });
  if (!lines) return;
  const full = withId(lines, "account-0-full");
  assert.ok(full, lines.join("\n"));
  assert.doesNotMatch(full, /\.opacity/);
});

test("with no accounts the strip offers to connect one", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: [],
    layout: ALONE,
  });
  if (!lines) return;
  const all = lines.join("\n");
  assert.deepEqual(texts(lines), ["Connect account"], all);
  assert.match(withId(lines, "connect-account") ?? "", /:on_click/, all);
});
