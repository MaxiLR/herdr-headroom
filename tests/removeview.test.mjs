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
