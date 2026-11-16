import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawActing,
  drawClicking,
  drawForm,
  drawSource,
  texts,
  withId,
} from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MAXI = "claude:acct-maxi:org-maxi";
const TERAC = "claude:acct-maxi:org-terac";
const MAXILR = "codex:acct-maxilr";

const READINGS = [
  reading({ id: MAXI, windows: [win("7d", 0.41, NOW + 4 * DAY)] }),
  reading({
    id: TERAC,
    label: "maxi · Terac",
    plan: "Team",
    windows: [win("7d", 0.78, NOW + 2 * DAY), win("5h", 0.91, NOW + HOUR)],
  }),
  reading({
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    plan: "Pro",
    windows: [win("7d", 0.23, NOW + 5 * DAY)],
  }),
];

const FIXTURE = {
  props: { remove: TERAC, overlay: "overlay-1" },
  size: { width: 380, height: 160 },
  now: NOW,
  readings: READINGS,
};

const show = (lines) => lines.join("\n");

// The theme's own colours, as Herdr prints them.
function themeColours(t) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";

export default class Colours extends View {
  render() {
    const t = theme();
    return div().child(JSON.stringify({ blocked: t.blocked, raised: t.raised }));
  }
}
`,
  );
  return lines ? JSON.parse(texts(lines)[0]) : null;
}

test("the remove dialog asks about the account it names, with Cancel and Remove", (t) => {
  const lines = drawForm(t, "remove", FIXTURE);
  if (!lines) return;
  const drawn = texts(lines);
  for (const text of [
    "Remove maxi · Terac?",
    "Esc",
    "Its stored login is deleted from this computer.",
    "Cancel",
    "Remove",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${show(lines)}`);
  }
  assert.ok(!drawn.includes("Remove maxi?"), show(lines));
  assert.ok(!drawn.includes("Confirm"), show(lines));
});

test("Remove is the one red thing: the blocked ground, and a click", (t) => {
  const colours = themeColours(t);
  if (!colours) return;
  assert.notEqual(colours.blocked, colours.raised);
  const lines = drawForm(t, "remove", FIXTURE);
  const remove = withId(lines, "remove") ?? "";
  assert.ok(
    remove.includes(`.bg[Str(${JSON.stringify(colours.blocked)})]`),
    `${remove}\n${show(lines)}`,
  );
  assert.match(remove, /:on_click\(fn\)/, remove);
  assert.match(remove, /:role\[Str\("button"\)\]/, remove);
  const cancel = withId(lines, "cancel") ?? "";
  assert.match(cancel, /:on_click\(fn\)/, show(lines));
  assert.ok(
    !cancel.includes(JSON.stringify(colours.blocked)),
    `${cancel}\n${show(lines)}`,
  );
  const red = lines.filter((line) =>
    line.includes(JSON.stringify(colours.blocked)),
  );
  assert.deepEqual(red, [remove], show(lines));
});

test("a click on Remove removes the account named, and no other", (t) => {
  const result = drawClicking(t, "remove", FIXTURE, "remove");
  if (!result) return;
  const { calls } = result;
  assert.deepEqual(calls[0], ["remove", TERAC], JSON.stringify(calls));
  assert.deepEqual(
    calls.filter(([name]) => name === "remove"),
    [["remove", TERAC]],
  );
});

test("a click on Cancel closes the dialog and removes nothing", (t) => {
  const result = drawClicking(t, "remove", FIXTURE, "cancel");
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
});

test("drawn alone, the dialog asks nothing of the store or the host", (t) => {
  const result = drawActing(t, "remove", FIXTURE);
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("a dialog whose account is not connected closes itself and removes nothing", (t) => {
  const result = drawActing(t, "remove", {
    ...FIXTURE,
    readings: READINGS.filter((entry) => entry.id !== TERAC),
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
});

// The line of the element with `id` and the lines drawn inside it.
function subtree(lines, id) {
  const at = lines.findIndex((line) =>
    line.includes(`:id[Str(${JSON.stringify(id)})]`),
  );
  if (at < 0) return [];
  const depth = (line) => line.length - line.trimStart().length;
  const inside = [lines[at]];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() === "" || depth(line) <= depth(lines[at])) break;
    inside.push(line);
  }
  return inside;
}

const SPINNER = /svg "mods\/workspace-chrome\/spinner\.svg"/;
const REMOVING = { ...FIXTURE, ui: { remove: { removing: true } } };
const minWidth = (line) => line?.match(/\.min_w\[Number\(([^)]*)\)\]/)?.[1];
const textColour = (line) =>
  line?.match(/\.text_color\[Str\("([^"]*)"\)\]/)?.[1];

test("while removing, Remove holds Herdr's spinner before its word, in its text colour", (t) => {
  const lines = drawForm(t, "remove", REMOVING);
  if (!lines) return;
  const remove = subtree(lines, "remove");
  const spin = remove.findIndex((line) => SPINNER.test(line));
  assert.ok(spin > 0, show(lines));
  const word = remove.findIndex((line) => /^\s*text "Remove"$/.test(line));
  assert.ok(word > spin, show(remove));
  assert.ok(remove[0].includes(".gap[Number(6.0)]"), remove[0]);
  assert.ok(remove[spin].includes(".size[Number(12.0)]"), remove[spin]);
  assert.equal(textColour(remove[spin]), textColour(remove[0]), show(remove));
  assert.ok(!subtree(lines, "cancel").some((line) => SPINNER.test(line)));
});

test("not removing, Remove holds no spinner", (t) => {
  const lines = drawForm(t, "remove", FIXTURE);
  if (!lines) return;
  assert.ok(!lines.some((line) => SPINNER.test(line)), show(lines));
});

test("while removing, both buttons are disabled at 45 %, with no hover, pressed look or pointer", (t) => {
  const lines = drawForm(t, "remove", REMOVING);
  if (!lines) return;
  for (const id of ["cancel", "remove"]) {
    const line = withId(lines, id);
    assert.ok(line, `${id} not drawn\n${show(lines)}`);
    assert.ok(line.includes(":disabled[Bool(true)]"), line);
    assert.ok(line.includes(".opacity[Number(0.45)]"), line);
    assert.ok(!line.includes(":hover("), line);
    assert.ok(!line.includes(":active("), line);
    assert.ok(!line.includes(".cursor_pointer"), line);
  }
});

test("not removing, both buttons keep their hover and pressed look", (t) => {
  const lines = drawForm(t, "remove", FIXTURE);
  if (!lines) return;
  for (const id of ["cancel", "remove"]) {
    const line = withId(lines, id);
    assert.ok(line, `${id} not drawn\n${show(lines)}`);
    assert.ok(line.includes(":hover("), line);
    assert.ok(line.includes(":active("), line);
    assert.ok(!line.includes(":disabled[Bool(true)]"), line);
    assert.ok(!line.includes(".opacity[Number(0.45)]"), line);
  }
});

test("Remove is as wide with its spinner as without it", (t) => {
  const idle = drawForm(t, "remove", FIXTURE);
  if (!idle) return;
  const busy = drawForm(t, "remove", REMOVING);
  const without = minWidth(withId(idle, "remove"));
  const withSpinner = minWidth(withId(busy, "remove"));
  assert.ok(without, withId(idle, "remove"));
  assert.equal(withSpinner, without, withId(busy, "remove"));
});

// Draws the dialog, then runs the handler `kind` (`on_click` of the element
// `id`, or `on_key_down` with `key`) with a cx that records its redraws.
function pressing(t, kind, { id, key }) {
  return drawActing(
    t,
    "remove",
    FIXTURE,
    `const kit = Object.getPrototypeOf(div());
    const setId = kit.id;
    const setHandler = kit[${JSON.stringify(kind)}];
    const ids = new Map();
    const handlers = [];
    kit.id = function (value) {
      ids.set(this, value);
      return setId.call(this, value);
    };
    kit[${JSON.stringify(kind)}] = function (handler) {
      handlers.push([this, handler]);
      return setHandler.call(this, handler);
    };
    try {
      form.render(view, cx);
    } finally {
      kit.id = setId;
      kit[${JSON.stringify(kind)}] = setHandler;
    }
    const wanted = ${JSON.stringify(id ?? null)};
    const found = handlers.find(([el]) => wanted === null || ids.get(el) === wanted);
    if (found === undefined) throw new Error("no ${kind}");
    const recording = {
      notify: () => calls.push(["notify"]),
      stop_propagation: () => undefined,
    };
    found[1](${JSON.stringify(key ? { key } : {})}, recording);`,
  );
}

test("a click on Remove asks for a redraw once it is removing", (t) => {
  const result = pressing(t, "on_click", { id: "remove" });
  if (!result) return;
  const { calls, lines } = result;
  assert.deepEqual(calls.slice(0, 2), [["remove", TERAC], ["notify"]]);
  assert.ok(
    lines.some((line) => SPINNER.test(line)),
    show(lines),
  );
});

test("Enter asks for a redraw once it is removing", (t) => {
  const result = pressing(t, "on_key_down", { key: "enter" });
  if (!result) return;
  assert.deepEqual(result.calls.slice(0, 2), [["remove", TERAC], ["notify"]]);
});

// The drawn lines between the title and the detail.
function between(lines, title) {
  const at = (text) =>
    lines.findIndex((line) => line.trim() === `text ${JSON.stringify(text)}`);
  const top = at(title);
  const bottom = at("Its stored login is deleted from this computer.");
  assert.ok(top >= 0 && bottom > top, show(lines));
  return lines.slice(top + 1, bottom);
}

const markOf = (lines, file, label) =>
  lines.find(
    (line) =>
      line.trimStart().startsWith(`svg "mods/headroom/icons/${file}"`) &&
      line.includes(".size[Number(14.0)]") &&
      line.includes(`:accessibility_label[Str(${JSON.stringify(label)})]`),
  );

const ACCOUNTS = [
  { id: MAXI, provider: "claude", label: "maxi", email: "maxi@example.com" },
  {
    id: TERAC,
    provider: "claude",
    label: "maxi · Terac",
    email: "terac@example.com",
  },
  { id: MAXILR, provider: "codex", label: "maxilr", email: null },
];

test("under the title, the account's mark and email; then the detail", (t) => {
  const lines = drawForm(t, "remove", { ...FIXTURE, accounts: ACCOUNTS });
  if (!lines) return;
  const line = between(lines, "Remove maxi · Terac?");
  assert.ok(markOf(line, "claude.svg", "Claude"), show(lines));
  const drawn = texts(line);
  assert.ok(drawn.includes("terac@example.com"), show(lines));
  assert.ok(!drawn.includes("maxi@example.com"), show(lines));
});

test("a Claude account without an email reads A Claude account", (t) => {
  const lines = drawForm(t, "remove", {
    ...FIXTURE,
    accounts: ACCOUNTS.map((entry) =>
      entry.id === TERAC ? { ...entry, email: null } : entry,
    ),
  });
  if (!lines) return;
  const line = between(lines, "Remove maxi · Terac?");
  assert.ok(markOf(line, "claude.svg", "Claude"), show(lines));
  const drawn = texts(line);
  assert.ok(drawn.includes("A Claude account"), show(lines));
  assert.ok(!drawn.includes("maxi@example.com"), show(lines));
});

test("a Codex account without an email reads A Codex account", (t) => {
  const lines = drawForm(t, "remove", {
    ...FIXTURE,
    props: { remove: MAXILR, overlay: "overlay-1" },
    accounts: ACCOUNTS,
  });
  if (!lines) return;
  const line = between(lines, "Remove maxilr?");
  assert.ok(markOf(line, "chatgpt.svg", "Codex"), show(lines));
  assert.ok(texts(line).includes("A Codex account"), show(lines));
});

test("two accounts with one label are told apart by their emails", (t) => {
  const A = "claude:acct-a:org-work";
  const B = "claude:acct-b:org-work";
  const fixture = (id) => ({
    ...FIXTURE,
    props: { remove: id, overlay: "overlay-1" },
    readings: [
      reading({ id: A, label: "work" }),
      reading({ id: B, label: "work" }),
    ],
    accounts: [
      { id: A, provider: "claude", label: "work", email: "a@example.com" },
      { id: B, provider: "claude", label: "work", email: "b@example.com" },
    ],
  });
  const first = drawForm(t, "remove", fixture(A));
  if (!first) return;
  const second = drawForm(t, "remove", fixture(B));
  const one = texts(between(first, "Remove work?"));
  const other = texts(between(second, "Remove work?"));
  assert.ok(
    one.includes("a@example.com") && !one.includes("b@example.com"),
    show(first),
  );
  assert.ok(
    other.includes("b@example.com") && !other.includes("a@example.com"),
    show(second),
  );
  assert.notDeepEqual(one, other);
});
