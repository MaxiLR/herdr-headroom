import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawActing,
  drawClicking,
  drawForm,
  texts,
  withId,
} from "./helpers/draw.mjs";
import { reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();

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

const READINGS = [
  reading({
    id: MAXI,
    fetchedAt: THURSDAY - 2 * MINUTE,
    windows: [win("7d", 0.41, THURSDAY + 4 * DAY + 6 * HOUR)],
  }),
  reading({
    id: TERAC,
    label: "maxi · Terac",
    plan: "Team",
    fetchedAt: THURSDAY - 3 * MINUTE,
    windows: [win("7d", 0.78, THURSDAY + 2 * DAY + 4 * HOUR)],
  }),
  reading({
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    plan: null,
    fetchedAt: THURSDAY - 2 * MINUTE,
    windows: [win("7d", 0.23, THURSDAY + 5 * DAY + 2 * HOUR)],
  }),
];

const PENCIL = "mods/headroom/icons/pencil.svg";
const TRASH = "mods/headroom/icons/trash.svg";

const fixture = (extra = {}) => ({
  props: { form: "detail", overlay: "overlay-1" },
  size: { width: 380, height: 640 },
  now: THURSDAY,
  readings: READINGS,
  accounts: ACCOUNTS,
  ...extra,
});

const draw = (t, extra) => drawForm(t, "detail", fixture(extra));
const act = (t, steps, extra) => drawActing(t, "detail", fixture(extra), steps);

const show = (lines) => lines.join("\n");

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

const atText = (lines, text) =>
  lines.findIndex((line) => line.trim() === `text ${JSON.stringify(text)}`);

const atSvg = (lines, path) =>
  lines.findIndex((line) =>
    line.trim().startsWith(`svg ${JSON.stringify(path)}`),
  );

const inputs = (lines) => lines.filter((line) => /^\s*Input\b/.test(line));

test("each of three accounts draws its three dots after its arrows, named Rename or remove", (t) => {
  const lines = draw(t);
  if (!lines) return;
  for (const index of [0, 1, 2]) {
    const id = `account-${index}-more`;
    const control = withId(lines, id) ?? "";
    assert.ok(control, `${id} missing\n${show(lines)}`);
    assert.ok(
      inside(lines, `account-${index}`).includes(control),
      `${id} is not inside its account\n${show(lines)}`,
    );
    assert.ok(
      at(lines, id) > at(lines, `account-${index}-down`),
      `${id} is not after the arrows\n${show(lines)}`,
    );
    assert.match(control, /:role\[Str\("button"\)\]/, control);
    assert.match(
      control,
      /:accessibility_label\[Str\("Rename or remove"\)\]/,
      control,
    );
    assert.match(control, /:tooltip\[Str\("Rename or remove"\)\]/, control);
    assert.match(
      inside(lines, id).join("\n"),
      /svg "mods\/headroom\/icons\/more\.svg"/,
      show(lines),
    );
  }
});

test("with one account the three dots stand alone, without arrows", (t) => {
  const lines = draw(t, { readings: [READINGS[0]] });
  if (!lines) return;
  assert.equal(withId(lines, "account-0-up"), undefined, show(lines));
  assert.equal(withId(lines, "account-0-down"), undefined, show(lines));
  assert.ok(withId(lines, "account-0-more"), show(lines));
});

test("closed, the menu draws neither Rename nor Remove", (t) => {
  const lines = draw(t);
  if (!lines) return;
  for (const word of ["Rename", "Remove"]) {
    assert.ok(!texts(lines).includes(word), `${word}\n${show(lines)}`);
  }
  assert.equal(atSvg(lines, PENCIL), -1, show(lines));
  assert.equal(atSvg(lines, TRASH), -1, show(lines));
});

test("an open menu draws a pencil and Rename, a trash can and Remove", (t) => {
  const lines = draw(t, { ui: { detail: { menu: TERAC } } });
  if (!lines) return;
  const rename = atText(lines, "Rename");
  const remove = atText(lines, "Remove");
  const pencil = atSvg(lines, PENCIL);
  const trash = atSvg(lines, TRASH);
  assert.ok(rename >= 0 && remove >= 0, show(lines));
  assert.ok(pencil >= 0 && pencil < rename, show(lines));
  assert.ok(trash > rename && trash < remove, show(lines));
  // Only the open account's menu is drawn.
  assert.equal(
    texts(lines).filter((text) => text === "Rename").length,
    1,
    show(lines),
  );
});

test("Rename from the menu, then Enter, renames the account and draws its label again", (t) => {
  const result = act(
    t,
    `form.chooseMenu(view, ${JSON.stringify(TERAC)}, "rename", cx);
    form.renameInput(view).set_value("Terac work");
    form.submitRename(view);`,
    { ui: { detail: { menu: TERAC } } },
  );
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, [["rename", TERAC, "Terac work"]]);
  assert.equal(inputs(lines).length, 0, show(lines));
  assert.ok(texts(lines).includes("maxi · Terac"), show(lines));
  // The menu is closed.
  assert.ok(!texts(lines).includes("Rename"), show(lines));
});

test("Rename from the menu puts the field on that account's line and renames nothing yet", (t) => {
  const result = act(
    t,
    `form.chooseMenu(view, ${JSON.stringify(TERAC)}, "rename", cx);`,
    { ui: { detail: { menu: TERAC } } },
  );
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, []);
  const fields = inputs(lines);
  assert.equal(fields.length, 1, show(lines));
  const account = inside(lines, "account-1");
  assert.ok(account.includes(fields[0]), show(lines));
  // On its first line: before its email and its arrows.
  assert.ok(
    lines.indexOf(fields[0]) < atText(lines, "maxi@terac.example"),
    show(lines),
  );
  assert.ok(lines.indexOf(fields[0]) < at(lines, "account-1-up"), show(lines));
  const drawn = texts(lines);
  assert.ok(!drawn.includes("maxi · Terac"), show(lines));
  assert.ok(!drawn.includes("Team"), show(lines));
  // The other accounts keep their labels; the menu is closed.
  assert.ok(drawn.includes("maxi") && drawn.includes("maxilr"), show(lines));
  assert.ok(!drawn.includes("Rename"), show(lines));
});

test("Esc after Rename from the menu leaves the label as it was", (t) => {
  const result = act(
    t,
    `form.chooseMenu(view, ${JSON.stringify(TERAC)}, "rename", cx);
    form.renameInput(view).set_value("x");
    form.cancelRename(view);`,
  );
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls, []);
  assert.equal(inputs(lines).length, 0, show(lines));
  assert.ok(texts(lines).includes("maxi · Terac"), show(lines));
});

test("a rename given as data draws the field, and Enter keeps the label it holds", (t) => {
  const drawn = act(t, "", { ui: { detail: { renaming: TERAC } } });
  if (!drawn) return;
  assert.equal(inputs(drawn.lines).length, 1, show(drawn.lines));
  assert.ok(!texts(drawn.lines).includes("maxi · Terac"), show(drawn.lines));

  const entered = act(t, "form.submitRename(view);", {
    ui: { detail: { renaming: TERAC } },
  });
  assert.deepEqual(entered.calls, [["rename", TERAC, "maxi · Terac"]]);
});

test("Remove from the menu asks with the mod's own dialog and removes nothing", (t) => {
  const result = act(
    t,
    `form.chooseMenu(view, ${JSON.stringify(TERAC)}, "remove", cx);`,
    { ui: { detail: { menu: TERAC } } },
  );
  if (!result) return;
  const { calls, lines } = result;
  const overlays = calls.filter(([name]) => name === "openOverlay");
  assert.equal(overlays.length, 1, JSON.stringify(calls));
  assert.deepEqual(overlays[0][1], {
    mod: "headroom",
    kind: "dialog",
    width: 380,
    props: { remove: TERAC },
  });
  assert.ok(!calls.some(([name]) => name === "remove"), JSON.stringify(calls));
  assert.ok(
    !calls.some(([, spec]) => spec?.mod === "confirm"),
    JSON.stringify(calls),
  );
  // The menu is closed and the detail view stays.
  assert.ok(!texts(lines).includes("Remove"), show(lines));
  assert.ok(!calls.some(([name]) => name === "closeOverlay"), show(lines));
});

test("inside a clickable account the three dots keep their own click, which opens no view", (t) => {
  const lines = draw(t);
  if (!lines) return;
  for (const index of [0, 1, 2]) {
    assert.match(withId(lines, `account-${index}`) ?? "", /:on_click\(fn\)/);
    const id = `account-${index}-more`;
    const control = inside(lines, `account-${index}`).find((line) =>
      line.includes(`:id[Str(${JSON.stringify(id)})]`),
    );
    assert.match(control ?? "", /:on_click\(fn\)/, `${id}\n${show(lines)}`);
  }
  const clicked = drawClicking(t, "detail", fixture(), "account-1-more");
  assert.deepEqual(clicked.calls, []);
});
