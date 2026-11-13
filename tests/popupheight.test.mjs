import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// A number the element's line sets, as `.h[Number(404)]` sets h to 404;
// NaN when it sets none.
const measure = (line, name) =>
  Number(
    line?.match(new RegExp(`\\.${name}\\[Number\\((-?[\\d.]+)\\)\\]`))?.[1],
  );

const show = (lines) => lines.join("\n");

const MAXI = "claude:acct-maxi:org-maxi";
const maxiAccount = {
  id: MAXI,
  provider: "claude",
  label: "maxi",
  email: "maxi@example.com",
  organization: null,
  plan: "Max",
};

// The account `tests/account.test.mjs` gives as 404 px: an email, Weekly,
// 5-hour and Weekly · Sonnet with pace marks, and the end of its login.
const claude = (overrides = {}) =>
  reading({
    loginEndsAt: NOW + 23 * DAY,
    windows: [
      win("7d", 0.41, NOW + 4 * DAY),
      win("5h", 0.62, NOW + 2 * HOUR),
      win("7d:sonnet", 0.18, NOW + 4 * DAY, { label: "Weekly · Sonnet" }),
    ],
    ...overrides,
  });

// The account `tests/account.test.mjs` gives as 194 px.
const signedOut = () =>
  claude({ status: "signed-out", loginEndsAt: NOW - 3 * DAY });

function drawAccount(t, reading, props) {
  return drawForm(t, "account", {
    props: { form: "account", account: MAXI, ...props },
    size: { width: 380, height: 640 },
    readings: [reading],
    accounts: [maxiAccount],
  });
}

function drawDetail(t, readings, props) {
  return drawForm(t, "detail", {
    props: { form: "detail", ...props },
    size: { width: 380, height: 640 },
    readings,
    accounts: [],
  });
}

function rootHeight(lines, id) {
  const line = withId(lines, id);
  assert.ok(line, `${id} missing\n${show(lines)}`);
  return measure(line, "h");
}

test("the account view as a popup is as tall as its opener asked: 404 px", (t) => {
  const lines = drawAccount(t, claude(), { overlay: "overlay-1" });
  if (!lines) return;
  assert.equal(rootHeight(lines, "account-view"), 404, show(lines));
});

test("the account view of an account that must sign in again is 194 px", (t) => {
  const lines = drawAccount(t, signedOut(), { overlay: "overlay-1" });
  if (!lines) return;
  assert.equal(rootHeight(lines, "account-view"), 194, show(lines));
});

test("the account view as a pane carries no height of its own", (t) => {
  const lines = drawAccount(t, claude(), {});
  if (!lines) return;
  assert.ok(Number.isNaN(rootHeight(lines, "account-view")), show(lines));
});

test("the detail view of one account as a popup is 229 px", (t) => {
  const lines = drawDetail(t, [reading()], { overlay: "overlay-1" });
  if (!lines) return;
  // 46 + 49 + 39 + 36 + 57 + 2
  assert.equal(rootHeight(lines, "detail-view"), 229, show(lines));
});

// A layout with the strip's block, hidden: the footer draws Show in status
// bar under the notifications switch.
const withStrip = {
  id: "root",
  type: "column",
  children: [
    {
      id: "status-row",
      type: "row",
      children: [
        { id: "status", type: "block", content: { mod: "workspace-status" } },
        {
          id: "headroom-strip",
          type: "block",
          hidden: true,
          content: { mod: "headroom", props: { form: "strip" } },
        },
      ],
    },
  ],
};

test("the detail view of one account with Show in status bar is 257 px", (t) => {
  const lines = drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 640 },
    readings: [reading()],
    accounts: [],
    layout: withStrip,
  });
  if (!lines) return;
  // 229 + 10 + 18
  assert.equal(rootHeight(lines, "detail-view"), 257, show(lines));
});

test("the detail view's opener asks for Show in status bar's line: 257 px", (t) => {
  const result = drawActing(
    t,
    "detail",
    { readings: [reading()], layout: withStrip },
    "form.open(view);",
  );
  if (!result) return;
  const [name, spec] = result.calls[0] ?? [];
  assert.equal(name, "openOverlay", JSON.stringify(result.calls));
  assert.equal(spec.height, 257);
});

test("the detail view of twenty accounts as a popup stops at 640 px", (t) => {
  const readings = Array.from({ length: 20 }, (_, k) =>
    reading({ id: `claude:acct-${k}:org-${k}`, label: `maxi ${k}` }),
  );
  const lines = drawDetail(t, readings, { overlay: "overlay-1" });
  if (!lines) return;
  assert.equal(rootHeight(lines, "detail-view"), 640, show(lines));
});

test("the detail view as a pane carries no height of its own", (t) => {
  const lines = drawDetail(t, [reading()], {});
  if (!lines) return;
  assert.ok(Number.isNaN(rootHeight(lines, "detail-view")), show(lines));
});
