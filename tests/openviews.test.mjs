import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawClicking, drawForm, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

const show = (lines) => lines.join("\n");

test("the detail view opens as a 380 px popup of every account", (t) => {
  const result = drawActing(
    t,
    "detail",
    { props: { form: "detail", overlay: "overlay-1" }, readings: [reading()] },
    "form.open(view);",
  );
  if (!result) return;
  assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
  const [name, spec] = result.calls[0];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "popup");
  assert.equal(spec.width, 380);
  assert.deepEqual(spec.props, { form: "detail" });
});

for (const [form, size] of [
  ["list", { width: 268, height: 300 }],
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`each account in the ${form} is a button with a click`, (t) => {
    const lines = drawForm(t, form, { size, readings: THREE });
    if (!lines) return;
    for (const index of [0, 1, 2]) {
      const row = withId(lines, `account-${index}`) ?? "";
      assert.match(row, /:role\[Str\("button"\)\]/, show(lines));
      assert.match(row, /:on_click\(fn\)/, row);
    }
  });
}

test("the list header's control is named Accounts and settings and has a click", (t) => {
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 300 },
    readings: THREE,
  });
  if (!lines) return;
  const control = withId(lines, "open-detail") ?? "";
  assert.match(control, /:on_click\(fn\)/, show(lines));
  assert.ok(
    control.includes(':accessibility_label[Str("Accounts and settings")]'),
    control,
  );
});

// The one overlay a click opened: a 380 px popup of this mod.
function opened(result) {
  assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
  const [name, spec] = result.calls[0];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "popup");
  assert.equal(spec.width, 380);
  return spec.props;
}

for (const [form, fixture] of [
  ["list", { size: { width: 268, height: 300 } }],
  ["rail", { size: { width: 76, height: 300 } }],
  ["strip", { size: { width: 640, height: 28 } }],
  ["detail", { props: { form: "detail" }, size: { width: 380, height: 640 } }],
]) {
  for (const [index, id] of [
    [0, "claude:acct-maxi:org-maxi"],
    [1, "claude:acct-terac:org-terac"],
    [2, "codex:acct-maxilr"],
  ]) {
    test(`a click on account ${index} in the ${form} opens its account view`, (t) => {
      const result = drawClicking(
        t,
        form,
        { ...fixture, readings: THREE },
        `account-${index}`,
      );
      if (!result) return;
      assert.deepEqual(opened(result), { form: "account", account: id });
    });
  }
}

test("a click on the list header's control opens the detail view", (t) => {
  const result = drawClicking(
    t,
    "list",
    { size: { width: 268, height: 300 }, readings: THREE },
    "open-detail",
  );
  if (!result) return;
  assert.deepEqual(opened(result), { form: "detail" });
});

test("a click on the account popup's last row closes it, then opens the detail view", (t) => {
  const result = drawClicking(
    t,
    "account",
    {
      props: {
        form: "account",
        account: "claude:acct-terac:org-terac",
        overlay: "overlay-1",
      },
      size: { width: 380, height: 400 },
      readings: THREE,
    },
    "open-detail",
  );
  if (!result) return;
  const spec = closedThenOpened(result);
  assert.equal(spec.kind, "popup");
  assert.deepEqual(spec.props, { form: "detail" });
});

test("the account view as a pane opens the detail view and closes nothing", (t) => {
  const result = drawClicking(
    t,
    "account",
    {
      props: { form: "account", account: "claude:acct-terac:org-terac" },
      size: { width: 380, height: 400 },
      readings: THREE,
    },
    "open-detail",
  );
  if (!result) return;
  assert.deepEqual(opened(result), { form: "detail" });
});

// The calls of a popup that closed itself, then opened one view: the close
// of its own overlay first, then one overlay of this mod. Gives what the
// opened overlay was asked to show.
function closedThenOpened(result) {
  assert.equal(result.calls.length, 2, JSON.stringify(result.calls));
  assert.deepEqual(result.calls[0], ["closeOverlay", "overlay-1"]);
  const [name, spec] = result.calls[1];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  return spec;
}

// The detail view's accounts, the second one signed out.
const SIGNED_OUT = [
  THREE[0],
  { ...THREE[1], status: "signed-out", windows: [] },
  THREE[2],
];

const DETAIL_POPUP = {
  props: { form: "detail", overlay: "overlay-1" },
  size: { width: 380, height: 640 },
  readings: SIGNED_OUT,
};

const DETAIL_PANE = {
  props: { form: "detail" },
  size: { width: 380, height: 640 },
  readings: SIGNED_OUT,
};

for (const [index, id] of [
  [0, "claude:acct-maxi:org-maxi"],
  [2, "codex:acct-maxilr"],
]) {
  test(`a click on account ${index} in the detail popup closes it, then opens its account view`, (t) => {
    const result = drawClicking(t, "detail", DETAIL_POPUP, `account-${index}`);
    if (!result) return;
    const spec = closedThenOpened(result);
    assert.equal(spec.kind, "popup");
    assert.deepEqual(spec.props, { form: "account", account: id });
  });
}

const CONNECTS = [
  ["connect-account", {}],
  [
    "account-1-sign-in",
    { provider: "claude", account: "claude:acct-terac:org-terac" },
  ],
];

for (const [control, connect] of CONNECTS) {
  test(`a click on ${control} in the detail popup closes it, then opens the connect dialog`, (t) => {
    const result = drawClicking(t, "detail", DETAIL_POPUP, control);
    if (!result) return;
    const spec = closedThenOpened(result);
    assert.equal(spec.kind, "dialog");
    assert.deepEqual(spec.props, { connect });
  });

  test(`a click on ${control} in the detail pane opens the connect dialog and closes nothing`, (t) => {
    const result = drawClicking(t, "detail", DETAIL_PANE, control);
    if (!result) return;
    assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
    const [name, spec] = result.calls[0];
    assert.equal(name, "openOverlay");
    assert.equal(spec.kind, "dialog");
    assert.deepEqual(spec.props, { connect });
  });
}

for (const [form, fixture] of [
  ["list", { size: { width: 268, height: 300 } }],
  ["rail", { size: { width: 76, height: 300 } }],
  ["strip", { size: { width: 640, height: 28 } }],
]) {
  test(`Connect account in the ${form} opens the connect dialog and closes nothing`, (t) => {
    const result = drawClicking(t, form, fixture, "connect-account");
    if (!result) return;
    assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
    const [name, spec] = result.calls[0];
    assert.equal(name, "openOverlay");
    assert.equal(spec.kind, "dialog");
    assert.deepEqual(spec.props, { connect: {} });
  });
}

for (const control of ["refresh", "account-0-down", "account-2-up"]) {
  test(`a click on ${control} in the detail popup closes nothing`, (t) => {
    const result = drawClicking(t, "detail", DETAIL_POPUP, control);
    if (!result) return;
    assert.ok(
      !result.calls.some(([name]) => name === "closeOverlay"),
      JSON.stringify(result.calls),
    );
  });
}
