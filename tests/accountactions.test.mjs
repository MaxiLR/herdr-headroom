import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawSource, texts, withId } from "./helpers/draw.mjs";
import { reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();
const NOV_9 = new Date(2026, 10, 9, 15, 0).getTime();

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
    plan: "Pro",
  },
];

const maxi = reading({
  id: MAXI,
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("7d", 0.41, THURSDAY + 4 * DAY + 6 * HOUR)],
});
const terac = (overrides = {}) =>
  reading({
    id: TERAC,
    label: "maxi · Terac",
    plan: "Team",
    fetchedAt: THURSDAY - 3 * MINUTE,
    windows: [
      win("7d", 0.78, THURSDAY + 2 * DAY + 4 * HOUR),
      win("5h", 0.91, THURSDAY + 2 * HOUR + 31 * MINUTE),
    ],
    ...overrides,
  });
const maxilr = reading({
  id: MAXILR,
  provider: "codex",
  label: "maxilr",
  plan: "Pro",
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("7d", 0.23, THURSDAY + 5 * DAY + 2 * HOUR)],
});

const show = (lines) => lines.join("\n");

// The account view of `account` among the three, after `steps`.
function act(t, { account = TERAC, readings, ui, steps = "" } = {}) {
  return drawActing(
    t,
    "account",
    {
      props: { form: "account", account, overlay: "overlay-1" },
      size: { width: 380, height: 640 },
      now: THURSDAY,
      readings: readings ?? [maxi, terac(), maxilr],
      accounts: ACCOUNTS,
      ...(ui ? { ui } : {}),
    },
    steps,
  );
}

// The theme's own colours, as Herdr prints them.
function themeColours(t) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";

export default class Colours extends View {
  render() {
    const t = theme();
    return div().child(JSON.stringify({ solid: t.solid, raised: t.raised }));
  }
}
`,
  );
  return lines ? JSON.parse(texts(lines)[0]) : null;
}

// The lines drawn inside the element with `id`.
function inside(lines, id) {
  const start = lines.findIndex((line) =>
    line.includes(`:id[Str(${JSON.stringify(id)})]`),
  );
  if (start < 0) return [];
  const depth = lines[start].search(/\S/);
  const found = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.search(/\S/) <= depth) break;
    found.push(line);
  }
  return found;
}

const at = (lines, id) =>
  lines.findIndex((line) => line.includes(`:id[Str(${JSON.stringify(id)})]`));

const inputs = (lines) => lines.filter((line) => /^\s*Input\b/.test(line));

const BUTTONS = [
  ["rename", "Rename"],
  ["sign-in", "Sign in again"],
  ["remove", "Remove"],
];

test("Rename, Sign in again and Remove are buttons, in that order, before the way to the detail view", (t) => {
  const result = act(t);
  if (!result) return;
  const { lines } = result;
  for (const [id, text] of BUTTONS) {
    const line = withId(lines, id) ?? "";
    assert.match(line, /:role\[Str\("button"\)\]/, `${id}\n${show(lines)}`);
    assert.match(line, /:on_click\(fn\)/, line);
    assert.deepEqual(texts(inside(lines, id)), [text], show(lines));
  }
  const order = [...BUTTONS.map(([id]) => id), "open-detail"].map((id) =>
    at(lines, id),
  );
  assert.ok(order[0] >= 0, show(lines));
  for (let k = 1; k < order.length; k++) {
    assert.ok(order[k] > order[k - 1], `${order}\n${show(lines)}`);
  }
});

test("Sign in again is raised for a signed-in account and solid for one that must sign in again", (t) => {
  const colours = themeColours(t);
  if (!colours) return;
  assert.notEqual(colours.solid, colours.raised);
  const ground = (colour) => `.bg[Str(${JSON.stringify(colour)})]`;

  const signedIn = act(t);
  const line = withId(signedIn.lines, "sign-in") ?? "";
  assert.ok(line.includes(ground(colours.raised)), line);
  assert.ok(!line.includes(ground(colours.solid)), line);

  const signedOut = act(t, {
    readings: [
      maxi,
      terac({ status: "signed-out", loginEndsAt: NOV_9, windows: [] }),
      maxilr,
    ],
  });
  const solid = withId(signedOut.lines, "sign-in") ?? "";
  assert.ok(solid.includes(ground(colours.solid)), solid);
  assert.ok(!solid.includes(ground(colours.raised)), solid);
});

test("Rename puts the label's field in the header, without the plan, and renames nothing yet", (t) => {
  const result = act(t, { steps: "form.startRename(view, cx);" });
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, []);
  const fields = inputs(lines);
  assert.equal(fields.length, 1, show(lines));
  // In the header: before the windows.
  assert.ok(
    lines.indexOf(fields[0]) < at(lines, "account-windows"),
    show(lines),
  );
  const drawn = texts(lines);
  assert.ok(!drawn.includes("maxi · Terac"), show(lines));
  assert.ok(!drawn.includes("Team"), show(lines));
});

test("Enter in the field renames the account to its text and draws the label again", (t) => {
  const result = act(t, {
    steps: `form.startRename(view, cx);
    form.renameInput(view).set_value("Terac work");
    form.submitRename(view);`,
  });
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, [["rename", TERAC, "Terac work"]]);
  assert.equal(inputs(lines).length, 0, show(lines));
  assert.ok(texts(lines).includes("maxi · Terac"), show(lines));
});

test("Esc in the field leaves the label as it was", (t) => {
  const result = act(t, {
    steps: `form.startRename(view, cx);
    form.renameInput(view).set_value("x");
    form.cancelRename(view);`,
  });
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, []);
  assert.equal(inputs(lines).length, 0, show(lines));
  assert.ok(texts(lines).includes("maxi · Terac"), show(lines));
});

test("a rename preloaded as data draws the field, and Enter renames to the label it holds", (t) => {
  const drawn = act(t, { ui: { account: { renaming: true } } });
  if (!drawn) return;
  assert.equal(inputs(drawn.lines).length, 1, show(drawn.lines));
  assert.ok(!texts(drawn.lines).includes("maxi · Terac"), show(drawn.lines));

  const entered = act(t, {
    ui: { account: { renaming: true } },
    steps: "form.submitRename(view);",
  });
  assert.deepEqual(entered.calls, [["rename", TERAC, "maxi · Terac"]]);
});

test("Sign in again closes the popup, then opens the connect dialog with the account's provider chosen", (t) => {
  const result = act(t, {
    account: MAXILR,
    steps: "form.signInAgain(view);",
  });
  if (!result) return;
  assert.equal(result.calls.length, 2, JSON.stringify(result.calls));
  assert.deepEqual(result.calls[0], ["closeOverlay", "overlay-1"]);
  const [name, spec] = result.calls[1];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "dialog");
  assert.deepEqual(spec.props, {
    connect: { provider: "codex", account: MAXILR },
  });
});

for (const [action, steps] of [
  ["Rename", "form.startRename(view, cx);"],
  ["Remove", "form.askRemove(view);"],
  ["Refresh", "form.refresh(view, cx);"],
]) {
  test(`${action} leaves the account popup open`, (t) => {
    const result = act(t, { steps });
    if (!result) return;
    assert.ok(
      !result.calls.some(([name]) => name === "closeOverlay"),
      JSON.stringify(result.calls),
    );
  });
}

const CONFIRM = {
  mod: "confirm",
  kind: "dialog",
  props: {
    title: "Remove maxi · Terac?",
    detail: "Its stored login is deleted from this computer.",
    command: { name: "headroom.remove" },
  },
};

test("Remove asks first with Herdr's confirm dialog and removes nothing", (t) => {
  const result = act(t, { steps: "form.askRemove(view);" });
  if (!result) return;
  assert.deepEqual(result.calls, [["openOverlay", CONFIRM]]);
});

test("the confirmed remove removes the account asked about, once", (t) => {
  const result = act(t, {
    steps: `form.askRemove(view);
    form.command("remove", view, cx);
    form.command("remove", view, cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [
    ["openOverlay", CONFIRM],
    ["remove", TERAC],
  ]);
});

test("a remove command with nothing waiting removes nothing", (t) => {
  const result = act(t, { steps: `form.command("remove", view, cx);` });
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("a newly opened account view disarms a remove left unanswered", (t) => {
  const result = act(t, {
    steps: `form.askRemove(view);
    form.init(view, cx);
    form.command("remove", view, cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["openOverlay", CONFIRM]]);
});
