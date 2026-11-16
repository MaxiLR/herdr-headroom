import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, themeColour, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MAXI = "claude:acct-maxi:org-maxi";
const TERAC = "claude:acct-maxi:org-terac";
const MAXILR = "codex:acct-maxilr";

const ACCOUNTS = [
  { id: MAXI, provider: "claude", label: "maxi", email: "maxi@example.com" },
  { id: TERAC, provider: "claude", label: "maxi · Terac", plan: "Team" },
  { id: MAXILR, provider: "codex", label: "maxilr", plan: null },
];

// maxi signed in; maxi · Terac must sign in again; maxilr signed in.
const READINGS = [
  reading({ id: MAXI }),
  reading({
    id: TERAC,
    label: "maxi · Terac",
    status: "signed-out",
    loginEndsAt: NOW - 3 * DAY,
    windows: [],
  }),
  reading({
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    plan: null,
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  }),
];

const CLAUDE_URL = "https://claude.ai/oauth/authorize?code=true";
const CODEX_URL = "https://auth.openai.com/codex/device";

const show = (lines) => lines.join("\n");

// The pressed styles as Herdr prints them.
const ground = (colour) => `:active(.bg[Str(${JSON.stringify(colour)})])`;
const SOLID = ":active(.opacity[Number(0.72)])";
const WORD = ":active(.opacity[Number(0.7)])";
const STOP = ":on_mouse_down_left(fn)";

// The theme's `selected` ground, or null (the test skipped) without Herdr.
const selectedOf = (t) => themeColour(t, "selected");

// `selected` mixed 6 % toward `foreground`, worked by hand for the two pairs
// Herdr's themes have (see tests/color.test.mjs).
const STEP = {
  "#ffffff17 #eeeeef": "#fefefe25",
  "#00000012 #1b1b1e": "#02020220",
};

function assertPressed(lines, id, style) {
  const line = withId(lines, id);
  assert.ok(line, `${id} not drawn\n${show(lines)}`);
  assert.ok(line.includes(style), `${id} should print ${style}\n${line}`);
}

function assertNotPressed(lines, id) {
  const line = withId(lines, id);
  assert.ok(line, `${id} not drawn\n${show(lines)}`);
  assert.ok(!line.includes(":active("), `${id} has a pressed look\n${line}`);
}

// The element with `id` stops the pointer-down itself.
function assertStopped(lines, id) {
  const line = withId(lines, id);
  assert.ok(line, `${id} not drawn\n${show(lines)}`);
  assert.ok(line.includes(STOP), `no pointer-down stop on ${id}\n${line}`);
}

// The element with `id`, or an element around it still inside `outer`,
// stops the pointer-down: the three dots are a Popover's trigger, and the
// Popover owns the press on them, so the stop may sit just outside it.
function assertStoppedAround(lines, id, outer) {
  let k = lines.findIndex((line) => withId([line], id));
  assert.ok(k >= 0, `${id} not drawn\n${show(lines)}`);
  while (k >= 0 && !withId([lines[k]], outer)) {
    if (lines[k].includes(STOP)) return;
    const depth = lines[k].search(/\S/);
    do k--;
    while (k >= 0 && lines[k].search(/\S/) >= depth);
  }
  assert.fail(`no pointer-down stop on ${id} inside ${outer}\n${show(lines)}`);
}

const LIST = { width: 268, height: 400 };

test("the list's rows, its header control and its empty state's Connect take the selected ground", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const lines = drawForm(t, "list", { size: LIST, readings: READINGS });
  for (const id of ["account-0", "account-1", "account-2", "open-detail"]) {
    assertPressed(lines, id, ground(selected));
  }
  const empty = drawForm(t, "list", { size: LIST, readings: [] });
  assertPressed(empty, "connect-account", ground(selected));
});

test("the list's Sign in again dims to 70 % and keeps the press from its row", (t) => {
  const lines = drawForm(t, "list", { size: LIST, readings: READINGS });
  if (!lines) return;
  assertPressed(lines, "account-1-sign-in", WORD);
  assertStopped(lines, "account-1-sign-in");
});

for (const [form, size] of [
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`the ${form}'s accounts and its Connect take the selected ground`, (t) => {
    const selected = selectedOf(t);
    if (selected === null) return;
    const lines = drawForm(t, form, { size, readings: READINGS });
    for (const id of ["account-0", "account-1", "account-2"]) {
      assertPressed(lines, id, ground(selected));
    }
    const empty = drawForm(t, form, { size, readings: [] });
    assertPressed(empty, "connect-account", ground(selected));
  });
}

function drawAccount(t, readings = READINGS) {
  return drawForm(t, "account", {
    props: { form: "account", account: TERAC, overlay: "overlay-1" },
    size: { width: 380, height: 480 },
    readings,
    accounts: ACCOUNTS,
  });
}

test("the account view's refresh and last row take the selected ground", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const lines = drawAccount(t);
  assertPressed(lines, "refresh", ground(selected));
  assertPressed(lines, "open-detail", ground(selected));
});

test("Rename, Sign in again and Remove take the ground one step past selected", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const foreground = themeColour(t, "foreground");
  const signedIn = READINGS.map((each) =>
    each.id === TERAC ? reading({ id: TERAC, label: "maxi · Terac" }) : each,
  );
  const lines = drawAccount(t, signedIn);
  const step = withId(lines, "rename")?.match(
    /:active\(\.bg\[Str\("([^"]*)"\)\]\)/,
  )?.[1];
  assert.ok(step, show(lines));
  assert.notEqual(step, selected);
  const worked = STEP[`${selected} ${foreground}`];
  if (worked) assert.equal(step, worked);
  for (const id of ["sign-in", "remove"]) {
    assertPressed(lines, id, ground(step));
  }
});

test("the solid Sign in again falls to 72 % opacity", (t) => {
  const lines = drawAccount(t);
  if (!lines) return;
  assertPressed(lines, "sign-in", SOLID);
});

function drawDetail(t, extra = {}) {
  return drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 640 },
    readings: READINGS,
    accounts: ACCOUNTS,
    ...extra,
  });
}

test("the detail view's refresh, sections, enabled arrows, dots and menu rows take the selected ground", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const lines = drawDetail(t, { ui: { detail: { menu: MAXI } } });
  for (const id of [
    "refresh",
    "account-0",
    "account-1",
    "account-2",
    "account-0-down",
    "account-1-up",
    "account-1-down",
    "account-2-up",
    "account-0-more",
    "account-1-more",
    "account-0-menu-rename",
    "account-0-menu-remove",
  ]) {
    assertPressed(lines, id, ground(selected));
  }
});

test("a dimmed arrow has no pressed look", (t) => {
  const lines = drawDetail(t);
  if (!lines) return;
  assertNotPressed(lines, "account-0-up");
  assertNotPressed(lines, "account-2-down");
});

test("the detail view's Connect account takes the step ground in both shapes", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const foreground = themeColour(t, "foreground");
  for (const width of [380, 320]) {
    const lines = drawDetail(t, { size: { width, height: 640 } });
    const step = withId(lines, "connect-account")?.match(
      /:active\(\.bg\[Str\("([^"]*)"\)\]\)/,
    )?.[1];
    assert.ok(step, `${width}\n${show(lines)}`);
    assert.notEqual(step, selected);
    const worked = STEP[`${selected} ${foreground}`];
    if (worked) assert.equal(step, worked);
  }
});

test("the detail view's Sign in again dims to 70 %", (t) => {
  const lines = drawDetail(t);
  if (!lines) return;
  assertPressed(lines, "account-1-sign-in", WORD);
});

test("a press on a control inside a section stops before the section", (t) => {
  const lines = drawDetail(t, { ui: { detail: { menu: MAXI } } });
  if (!lines) return;
  for (const id of [
    "account-1-sign-in",
    "account-0-down",
    "account-1-up",
    "account-1-down",
    "account-2-up",
    "account-0-menu-items",
  ]) {
    assertStopped(lines, id);
  }
  assertStoppedAround(lines, "account-0-more", "account-0");
  assertStoppedAround(lines, "account-1-more", "account-1");
  const renaming = drawActing(
    t,
    "detail",
    {
      props: { form: "detail", overlay: "overlay-1" },
      size: { width: 380, height: 640 },
      readings: READINGS,
      accounts: ACCOUNTS,
      ui: { detail: { renaming: MAXILR } },
    },
    "",
  );
  assertStopped(renaming.lines, "account-2-name");
});

function drawConnect(t, state, steps = "") {
  const fixture = {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 360 },
    ui: {
      connect: {
        provider: null,
        shown: null,
        error: null,
        checking: false,
        closed: false,
        copied: null,
        ...state,
      },
    },
  };
  return drawActing(t, "connect", fixture, steps)?.lines ?? null;
}

test("the provider choices take the selected ground", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const lines = drawConnect(t, {});
  assertPressed(lines, "choose-claude", ground(selected));
  assertPressed(lines, "choose-codex", ground(selected));
});

test("Back, Copy and Open take the selected ground, Cancel falls to 72 %; an empty Connect has no pressed look", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const lines = drawConnect(t, {
    provider: "claude",
    shown: { url: CLAUDE_URL },
  });
  for (const id of ["back", "copy-url", "open-url"]) {
    assertPressed(lines, id, ground(selected));
  }
  assertPressed(lines, "cancel", SOLID);
  assertNotPressed(lines, "connect");
});

const PASTE = `view.ui.connectLive.input.set_value("code#state");`;

test("Connect with a pasted code falls to 72 %; while checking it has no pressed look", (t) => {
  const ready = drawConnect(
    t,
    { provider: "claude", shown: { url: CLAUDE_URL } },
    PASTE,
  );
  if (!ready) return;
  assertPressed(ready, "connect", SOLID);
  const checking = drawConnect(
    t,
    { provider: "claude", shown: { url: CLAUDE_URL }, checking: true },
    PASTE,
  );
  assertNotPressed(checking, "connect");
});

test("the device code's Copy takes the selected ground; Start again falls to 72 %", (t) => {
  const selected = selectedOf(t);
  if (selected === null) return;
  const waiting = drawConnect(t, {
    provider: "codex",
    shown: { url: CODEX_URL, code: "WDJB-MJHT", deadline: NOW + 14 * MINUTE },
  });
  assertPressed(waiting, "copy-code", ground(selected));
  const failed = drawConnect(t, {
    provider: "codex",
    shown: { url: CODEX_URL, code: "WDJB-MJHT", deadline: NOW - MINUTE },
    error: "timeout",
  });
  assertPressed(failed, "start-again", SOLID);
});

test("Remove's dialog's Cancel and Remove fall to 72 %", (t) => {
  const lines = drawForm(t, "remove", {
    props: { remove: TERAC, overlay: "overlay-1" },
    size: { width: 380, height: 160 },
    readings: READINGS,
  });
  if (!lines) return;
  assertPressed(lines, "cancel", SOLID);
  assertPressed(lines, "remove", SOLID);
});
