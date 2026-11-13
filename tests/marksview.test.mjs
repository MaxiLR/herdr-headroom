import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const CLAUDE = "claude:acct-maxi:org-maxi";
const CODEX = "codex:acct-maxilr";

const ACCOUNTS = [
  {
    id: CLAUDE,
    provider: "claude",
    label: "maxi",
    email: "maxi@example.com",
    organization: null,
    plan: "Max",
  },
  {
    id: CODEX,
    provider: "codex",
    label: "maxilr",
    email: "maxilr@example.com",
    organization: null,
    plan: null,
  },
];

// One Claude account and one Codex account.
const TWO = [
  reading({ id: CLAUDE }),
  reading({
    id: CODEX,
    provider: "codex",
    label: "maxilr",
    plan: null,
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  }),
];

const STATUS_BAR = {
  id: "root",
  type: "column",
  children: [
    { id: "panes", type: "block", content: { mod: "workspace-panes" } },
    {
      id: "status",
      type: "row",
      children: [{ id: "limits", type: "block", content: { mod: "headroom" } }],
    },
  ],
};

const svgLines = (lines, file) =>
  lines.filter((line) =>
    line.trimStart().startsWith(`svg "mods/headroom/icons/${file}"`),
  );
const tint = (line) => line.match(/\.text_color\[Str\("([^"]*)"\)\]/)?.[1];
const sized = (line, size) => line.includes(`.size[Number(${size}.0)]`);
const named = (line, label) =>
  line.includes(`:accessibility_label[Str(${JSON.stringify(label)})]`);

// Herdr's own provider icons, which the mod no longer draws.
const herdrIcons = (lines) =>
  lines.filter((line) => /^\s*(image|svg) "icons\//.test(line));

function assertCodex(lines, size) {
  const all = lines.join("\n");
  const marks = svgLines(lines, "chatgpt.svg");
  assert.ok(marks.length > 0, `no ChatGPT logo\n${all}`);
  for (const line of marks) {
    assert.ok(sized(line, size), `not ${size} px: ${line}`);
    assert.ok(named(line, "Codex"), `not named Codex: ${line}`);
    assert.ok(tint(line), `not tinted: ${line}`);
  }
}

function assertClaude(lines, size) {
  const all = lines.join("\n");
  const marks = svgLines(lines, "claude.svg");
  assert.ok(marks.length > 0, `no Claude spark\n${all}`);
  for (const line of marks) {
    assert.ok(sized(line, size), `not ${size} px: ${line}`);
    assert.ok(named(line, "Claude"), `not named Claude: ${line}`);
    assert.equal(tint(line)?.toLowerCase(), "#d97757", line);
  }
}

function assertNoHerdrIcons(lines) {
  assert.deepEqual(herdrIcons(lines), [], lines.join("\n"));
}

test("the list draws the ChatGPT logo and Claude's orange spark at 14 px", (t) => {
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 400 },
    readings: TWO,
  });
  if (!lines) return;
  assertCodex(lines, 14);
  assertClaude(lines, 14);
  assertNoHerdrIcons(lines);
});

test("the rail draws the ChatGPT logo and Claude's orange spark at 14 px", (t) => {
  const lines = drawForm(t, "rail", {
    size: { width: 76, height: 300 },
    readings: TWO,
  });
  if (!lines) return;
  assertCodex(lines, 14);
  assertClaude(lines, 14);
  assertNoHerdrIcons(lines);
});

test("the strip draws the ChatGPT logo and Claude's orange spark at 12 px", (t) => {
  const lines = drawForm(t, "strip", {
    size: { width: 640, height: 28 },
    readings: TWO,
    layout: STATUS_BAR,
  });
  if (!lines) return;
  assertCodex(lines, 12);
  assertClaude(lines, 12);
  assertNoHerdrIcons(lines);
});

test("the detail view draws the ChatGPT logo and Claude's orange spark at 16 px", (t) => {
  const lines = drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 640 },
    readings: TWO,
    accounts: ACCOUNTS,
  });
  if (!lines) return;
  assertCodex(lines, 16);
  assertClaude(lines, 16);
  assertNoHerdrIcons(lines);
});

for (const [id, assertMark] of [
  [CODEX, assertCodex],
  [CLAUDE, assertClaude],
]) {
  test(`the account view of ${id} draws its mark at 16 px`, (t) => {
    const lines = drawForm(t, "account", {
      props: { form: "account", account: id, overlay: "overlay-1" },
      size: { width: 380, height: 480 },
      readings: TWO,
      accounts: ACCOUNTS,
    });
    if (!lines) return;
    assertMark(lines, 16);
    assertNoHerdrIcons(lines);
  });
}

test("the connect dialog's choice draws both marks at 22 px", (t) => {
  const lines = drawForm(t, "connect", {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 360 },
    now: NOW,
    ui: {
      connect: {
        provider: null,
        shown: null,
        error: null,
        checking: false,
        closed: false,
        copied: null,
      },
    },
  });
  if (!lines) return;
  assertCodex(lines, 22);
  assertClaude(lines, 22);
  assertNoHerdrIcons(lines);
});
