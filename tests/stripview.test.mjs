import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawForm,
  drawSource,
  texts,
  themeColour,
  withId,
} from "./helpers/draw.mjs";
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

// The theme's border colour, as Herdr prints it.
function borderColour(t) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";

export default class Colours extends View {
  render() {
    return div().child(JSON.stringify({ border: theme().border }));
  }
}
`,
  );
  return lines ? JSON.parse(texts(lines)[0]).border : null;
}

for (const [name, fixture] of [
  ["three accounts at 640 px", { width: 640, readings: THREE }],
  ["three accounts at 250 px", { width: 250, readings: THREE }],
  ["no accounts", { width: 640, readings: [] }],
]) {
  test(`${name}: the strip draws a 1 px border line on its top edge`, (t) => {
    const border = borderColour(t);
    if (border === null) return;
    const lines = drawForm(t, "strip", {
      size: { width: fixture.width, height: 28 },
      readings: fixture.readings,
      layout: AFTER,
    });
    if (!lines) return;
    const all = lines.join("\n");
    const strip = withId(lines, "strip") ?? "";
    assert.match(strip, /\.border_t\[Number\(1(\.0)?\)\]/, all);
    assert.ok(
      strip.includes(`.border_color[Str(${JSON.stringify(border)})]`),
      all,
    );
  });
}

// maxi at 41 % weekly and 62 % 5-hour, with Fable's weekly window, which the
// item has no bar for, at its limit.
const GENERAL = [
  win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR),
  win("5h", 0.62, NOW + HOUR + 48 * MINUTE),
];
const FABLE = win("7d:fable", 1, NOW + 4 * DAY + 6 * HOUR, { atLimit: true });
const fableAtLimit = (overrides = {}) =>
  reading({ windows: [...GENERAL, FABLE], ...overrides });
const FABLE_WORDS =
  "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m, Fable at limit";

const fills = (lines, index) =>
  lines.filter((line) =>
    new RegExp(`:id\\[Str\\("account-${index}-[^"]*-fill"\\)\\]`).test(line),
  );

// What each density draws of the three accounts, with the dot or without.
for (const [width, drawn, barsPerAccount] of [
  [640, ["maxi", "62%", "5h", "maxi · Terac", "91%", "5h", "maxilr", "23%"], 2],
  [400, ["62%", "5h", "91%", "5h", "23%"], 2],
  [250, ["62%", "5h", "91%", "5h", "23%"], 0],
]) {
  test(`at ${width} px a per-model limit reached puts a 5 px blocked dot on the mark`, (t) => {
    const blocked = themeColour(t, "blocked");
    if (blocked === null) return;
    const lines = drawForm(t, "strip", {
      size: { width, height: 28 },
      readings: [fableAtLimit(), ...THREE.slice(1)],
      layout: ALONE,
    });
    const all = lines.join("\n");
    assert.deepEqual(texts(lines), drawn, all);
    const dot = withId(lines, "account-0-dot");
    assert.ok(dot, all);
    assert.match(dot, /\.size\[Number\(5(\.0)?\)\]/, all);
    assert.ok(dot.includes(`.bg[Str(${JSON.stringify(blocked)})]`), all);
    assert.equal(withId(lines, "account-1-dot"), undefined, all);
    assert.equal(withId(lines, "account-2-dot"), undefined, all);
    const account = withId(lines, "account-0") ?? "";
    assert.ok(
      account.includes(`:tooltip[Str(${JSON.stringify(FABLE_WORDS)})]`),
      all,
    );
    assert.ok(
      account.includes(
        `:accessibility_label[Str(${JSON.stringify(FABLE_WORDS)})]`,
      ),
      all,
    );
    assert.equal(fills(lines, 0).length, barsPerAccount, all);
  });
}

for (const [name, readingOf] of [
  ["no per-model limit reached", () => reading()],
  [
    "weekly at its limit too",
    () =>
      reading({
        windows: [
          win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR, { atLimit: true }),
          GENERAL[1],
          FABLE,
        ],
      }),
  ],
  [
    "a failed read",
    () =>
      fableAtLimit({
        status: "error",
        error: "network",
        fetchedAt: NOW - 12 * MINUTE,
      }),
  ],
  ["a first read", () => fableAtLimit({ status: "stale", fetchedAt: null })],
  ["a signed-out account", () => fableAtLimit({ status: "signed-out" })],
]) {
  test(`${name}: the strip draws no dot`, (t) => {
    for (const width of [640, 250]) {
      const lines = drawForm(t, "strip", {
        size: { width, height: 28 },
        readings: [readingOf()],
        layout: ALONE,
      });
      if (!lines) return;
      assert.equal(
        withId(lines, "account-0-dot"),
        undefined,
        `${width} px\n${lines.join("\n")}`,
      );
    }
  });
}
