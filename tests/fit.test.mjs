import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIT_MIN,
  fitTo,
  listNeeds,
  listRowHeight,
  railNeeds,
  railRowHeight,
} from "../mods/headroom/logic/fit.js";
import { chooseForm } from "../mods/headroom/logic/form.js";
import { NOW, fakeHost, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// An account with both bars, under its own label.
function both(label) {
  return reading({ id: `claude:acct-${label}:org`, label });
}

// An account whose plan has the weekly window alone: one bar.
function weeklyOnly(label) {
  return reading({
    id: `codex:acct-${label}`,
    provider: "codex",
    label,
    windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
  });
}

// An account that must sign in again.
function signedOut(label) {
  return reading({
    id: `claude:acct-${label}:org`,
    label,
    status: "signed-out",
    loginEndsAt: NOW - DAY,
    windows: [],
  });
}

// An account connected but not read yet.
function unread(label) {
  return reading({
    id: `claude:acct-${label}:org`,
    label,
    status: "stale",
    fetchedAt: null,
    windows: [],
  });
}

// A view as main.js hands it to a form, over a host that records resizes.
function fitted(props = { fit: "headroom" }) {
  const host = fakeHost();
  return { view: { props, host, ui: {} }, host };
}

// What a fitted list block asks for `readings`, once fitted from scratch.
function listAsks(readings) {
  const { view, host } = fitted();
  fitTo(view, listNeeds(readings, NOW));
  return host.resizes;
}

function railAsks(readings) {
  const { view, host } = fitted();
  fitTo(view, railNeeds(readings, NOW));
  return host.resizes;
}

test("a list account takes the px its row draws", () => {
  assert.equal(listRowHeight(both("maxi"), NOW), 70);
  assert.equal(listRowHeight(weeklyOnly("codex"), NOW), 61);
  assert.equal(listRowHeight(signedOut("old"), NOW), 49);
  assert.equal(listRowHeight(unread("new"), NOW), 50);
});

test("a rail account takes the px its row draws", () => {
  assert.equal(railRowHeight(both("maxi"), NOW), 44);
  assert.equal(railRowHeight(weeklyOnly("codex"), NOW), 37);
  assert.equal(railRowHeight(signedOut("old"), NOW), 28);
});

test("a fitted list asks for the line, the header and one account", () => {
  assert.deepEqual(listAsks([weeklyOnly("codex")]), [
    { id: "headroom", px: 111 },
  ]);
  assert.deepEqual(listAsks([both("maxi")]), [{ id: "headroom", px: 120 }]);
});

test("a fitted list asks for two accounts with both bars", () => {
  assert.deepEqual(listAsks([both("maxi"), both("work")]), [
    { id: "headroom", px: 190 },
  ]);
});

test("with three accounts or more a fitted list asks for two and room for the hint", () => {
  const six = ["a", "b", "c", "d", "e", "f"].map(both);
  assert.deepEqual(listAsks(six.slice(0, 3)), [{ id: "headroom", px: 207 }]);
  assert.deepEqual(listAsks(six), [{ id: "headroom", px: 207 }]);
});

test("an account to sign in again counts 49 and one not read yet 50", () => {
  assert.deepEqual(listAsks([signedOut("old")]), [{ id: "headroom", px: 99 }]);
  assert.deepEqual(listAsks([unread("new")]), [{ id: "headroom", px: 100 }]);
  assert.deepEqual(listAsks([signedOut("old"), unread("new"), both("c")]), [
    { id: "headroom", px: 1 + 41 + 49 + 50 + 25 },
  ]);
});

test("a fitted rail asks for its first two accounts and room for the hint", () => {
  assert.deepEqual(railAsks([both("maxi"), both("work")]), [
    { id: "headroom", px: 97 },
  ]);
  assert.deepEqual(railAsks([both("maxi"), both("work"), both("more")]), [
    { id: "headroom", px: 103 },
  ]);
});

test("a fitted block asks once per needed height", () => {
  const { view, host } = fitted();
  const fit = (readings) => fitTo(view, listNeeds(readings, NOW));
  const [a, b] = [both("a"), both("b")];
  const short = signedOut("c");
  fit([a, b]);
  fit([a, b]);
  assert.deepEqual(host.resizes, [{ id: "headroom", px: 190 }]);
  fit([a, b, short]);
  fit([a, b, short]);
  assert.deepEqual(host.resizes.slice(1), [{ id: "headroom", px: 207 }]);
  const lost = reading({
    id: a.id,
    label: "a",
    windows: [win("7d", 0.41, NOW + 4 * DAY)],
  });
  fit([lost, b, short]);
  assert.deepEqual(host.resizes.slice(2), [{ id: "headroom", px: 198 }]);
  fit([short, b, lost]);
  fit([short, b, lost]);
  assert.deepEqual(host.resizes.slice(3), [{ id: "headroom", px: 186 }]);
  assert.equal(host.resizes.length, 4);
});

test("without props.fit nothing is resized", () => {
  const { view, host } = fitted({});
  fitTo(view, listNeeds([both("maxi")], NOW));
  fitTo(view, railNeeds([both("maxi")], NOW));
  assert.deepEqual(host.resizes, []);
});

// A folded sidebar's rail can need less than a strip's height. Fitted to
// that, the block would stay a strip once the sidebar unfolds, and the strip
// never fits it again.
test("a rail that needs less than 48 asks for 48, so it unfolds to the list", () => {
  assert.equal(FIT_MIN, 48);
  assert.equal(railNeeds([signedOut("old")], NOW), 1 + 4 + 28 + 4);
  assert.deepEqual(railAsks([signedOut("old")]), [{ id: "headroom", px: 48 }]);
  assert.equal(
    chooseForm({ fit: "headroom" }, { width: 268, height: 48 }),
    "list",
  );
});

// A copy of the mod as it starts in the layout `layout`: a fresh `ui` over
// `host`, whose shared state Herdr keeps across restarts.
function copyOn(host, props = { fit: "headroom" }) {
  return { props, host, ui: {} };
}

function inLayout(layout) {
  const host = fakeHost();
  host.state.layout = layout;
  return host;
}

test("a first fit asks for the height and remembers it under headroom.fit", () => {
  const host = inLayout("herdr-headroom");
  fitTo(copyOn(host), listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(host.resizes, [{ id: "headroom", px: 111 }]);
  assert.deepEqual(host.sets, [
    ["headroom.fit", { "herdr-headroom": { headroom: 111 } }],
  ]);
});

test("the same view fitted again to the same height asks nothing", () => {
  const host = inLayout("herdr-headroom");
  const view = copyOn(host);
  fitTo(view, listNeeds([weeklyOnly("codex")], NOW));
  fitTo(view, listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(host.resizes, [{ id: "headroom", px: 111 }]);
  assert.equal(host.sets.length, 1);
});

// A restart: the block was dragged since, and the new copy must not undo it.
test("a new copy over a remembered height asks nothing", () => {
  const host = inLayout("herdr-headroom");
  host.state["headroom.fit"] = { "herdr-headroom": { headroom: 111 } };
  fitTo(copyOn(host), listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(host.resizes, []);
  assert.deepEqual(host.sets, []);
});

test("a second account with both bars asks once for 181 and remembers it", () => {
  const host = inLayout("herdr-headroom");
  host.state["headroom.fit"] = { "herdr-headroom": { headroom: 111 } };
  const two = [weeklyOnly("codex"), both("maxi")];
  fitTo(copyOn(host), listNeeds(two, NOW));
  fitTo(copyOn(host), listNeeds(two, NOW));
  assert.deepEqual(host.resizes, [
    { id: "headroom", px: 1 + 41 + 61 + 70 + 8 },
  ]);
  assert.deepEqual(host.state["headroom.fit"], {
    "herdr-headroom": { headroom: 181 },
  });
});

test("the same block id under another layout is fitted on its own", () => {
  const host = inLayout("mine");
  host.state["headroom.fit"] = { "herdr-headroom": { headroom: 111 } };
  fitTo(copyOn(host), listNeeds([weeklyOnly("codex")], NOW));
  fitTo(copyOn(host), listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(host.resizes, [{ id: "headroom", px: 111 }]);
  assert.deepEqual(host.state["headroom.fit"], {
    "herdr-headroom": { headroom: 111 },
    mine: { headroom: 111 },
  });
});

test("without props.fit nothing is asked and nothing is remembered", () => {
  const host = inLayout("herdr-headroom");
  fitTo(copyOn(host, {}), listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(host.resizes, []);
  assert.deepEqual(host.sets, []);
});

test("the fitted block keeps no height of its own in the view", () => {
  const host = inLayout("herdr-headroom");
  const view = copyOn(host);
  fitTo(view, listNeeds([weeklyOnly("codex")], NOW));
  assert.deepEqual(view.ui, {});
});
