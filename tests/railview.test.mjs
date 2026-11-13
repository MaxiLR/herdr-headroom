import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, themeColour, withId } from "./helpers/draw.mjs";
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

for (const props of [{}, { fit: "headroom" }]) {
  const name = props.fit ? "with props.fit" : "without props.fit";
  test(`${name} the rail draws a 1 px border line on its top edge`, (t) => {
    const border = themeColour(t, "border");
    if (border === null) return;
    const lines = drawForm(t, "rail", { size: MAC, props, readings: THREE });
    const all = lines.join("\n");
    const root = withId(lines, "rail") ?? "";
    assert.match(root, /\.border_t\[Number\(1(\.0)?\)\]/, all);
    assert.ok(
      root.includes(`.border_color[Str(${JSON.stringify(border)})]`),
      all,
    );
  });
}

test("a fitted rail carries the handler that fits it; an unfitted one none", (t) => {
  const fitted = drawForm(t, "rail", {
    size: MAC,
    props: { fit: "headroom" },
    readings: THREE,
  });
  if (!fitted) return;
  assert.ok(
    fitted.some((line) => line.includes(":on_size_change")),
    fitted.join("\n"),
  );
  const plain = drawForm(t, "rail", { size: MAC, readings: THREE });
  assert.ok(
    !plain.some((line) => line.includes(":on_size_change")),
    plain.join("\n"),
  );
});

// maxi at 41 % weekly and 62 % 5-hour, with Fable's weekly window, which the
// row has no bar for, at its limit.
const GENERAL = [
  win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR),
  win("5h", 0.62, NOW + HOUR + 48 * MINUTE),
];
const FABLE = win("7d:fable", 1, NOW + 4 * DAY + 6 * HOUR, { atLimit: true });
const fableAtLimit = (overrides = {}) =>
  reading({ windows: [...GENERAL, FABLE], ...overrides });
const FABLE_WORDS =
  "maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m, Fable at limit";

const fills = (lines) =>
  lines.filter((line) => /:id\[Str\("[^"]*-fill"\)\]/.test(line));

for (const size of [MAC, LINUX]) {
  test(`at ${size.width} px a per-model limit reached puts a 5 px blocked dot on the mark`, (t) => {
    const blocked = themeColour(t, "blocked");
    if (blocked === null) return;
    const lines = drawForm(t, "rail", { size, readings: [fableAtLimit()] });
    const all = lines.join("\n");
    const dot = withId(lines, "account-0-dot");
    assert.ok(dot, all);
    assert.match(dot, /\.size\[Number\(5(\.0)?\)\]/, all);
    assert.ok(dot.includes(`.bg[Str(${JSON.stringify(blocked)})]`), all);
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
    assert.equal(fills(lines).length, 2, all);
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
  test(`${name}: the rail draws no dot`, (t) => {
    for (const size of [MAC, LINUX]) {
      const lines = drawForm(t, "rail", { size, readings: [readingOf()] });
      if (!lines) return;
      assert.equal(
        withId(lines, "account-0-dot"),
        undefined,
        `${size.width} px\n${lines.join("\n")}`,
      );
    }
  });
}

test("the list of a per-model limit reached draws no dot: it has the words", (t) => {
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 300 },
    readings: [fableAtLimit()],
  });
  if (!lines) return;
  assert.equal(withId(lines, "account-0-dot"), undefined, lines.join("\n"));
});
