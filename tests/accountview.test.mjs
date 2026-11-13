import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here; resets in local time.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();
const MONDAY_2030 = new Date(2026, 10, 16, 20, 30).getTime(); // in 4d 6h
const TODAY_1618 = new Date(2026, 10, 12, 16, 18).getTime(); // in 1h 48m
const SATURDAY_1830 = new Date(2026, 10, 14, 18, 30).getTime(); // in 2d 4h
const TODAY_1701 = new Date(2026, 10, 12, 17, 1).getTime(); // in 2h 31m
const TUESDAY_1630 = new Date(2026, 10, 17, 16, 30).getTime(); // in 5d 2h

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

const maxi = reading({
  id: MAXI,
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("5h", 0.62, TODAY_1618), win("7d", 0.41, MONDAY_2030)],
});
// The 5-hour window first, so the view's order is seen.
const terac = reading({
  id: TERAC,
  label: "maxi · Terac",
  plan: "Team",
  fetchedAt: THURSDAY - 3 * MINUTE,
  windows: [win("5h", 0.91, TODAY_1701), win("7d", 0.78, SATURDAY_1830)],
});
const maxilr = reading({
  id: MAXILR,
  provider: "codex",
  label: "maxilr",
  plan: null,
  fetchedAt: THURSDAY - 2 * MINUTE,
  windows: [win("7d", 0.23, TUESDAY_1630)],
});

const show = (lines) => lines.join("\n");

function draw(t, fixture = {}) {
  return drawForm(t, "account", {
    props: { form: "account", account: TERAC, overlay: "overlay-1" },
    size: { width: 380, height: 480 },
    now: THURSDAY,
    readings: [maxi, terac, maxilr],
    accounts: ACCOUNTS,
    ...fixture,
  });
}

test("the account view draws its one account: header, every window, the way to the detail view", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const drawn = texts(lines);
  for (const text of [
    "maxi · Terac",
    "Team",
    "Weekly",
    "5-hour",
    "78%",
    "91%",
    "resets in 2d 4h",
    "Sat 18:30",
    "Accounts and settings",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${show(lines)}`);
  }
  // Nothing of the other accounts.
  for (const text of ["maxi", "maxilr", "41%", "23%"]) {
    assert.ok(!drawn.includes(text), `${text}\n${show(lines)}`);
  }
});

test("the weekly window comes before the 5-hour one, each with its bar", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.indexOf("Weekly") < drawn.indexOf("5-hour"), show(lines));
  for (const id of ["window-0", "window-0-fill", "window-1", "window-1-fill"]) {
    assert.ok(withId(lines, id), `${id}\n${show(lines)}`);
  }
  assert.equal(withId(lines, "window-2"), undefined, show(lines));
});

test("the header's mark names the provider", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const marks = lines.filter((line) =>
    line.includes(':accessibility_label[Str("Claude")]'),
  );
  assert.equal(marks.length, 1, show(lines));
});

test("Accounts and settings is a button with a click", (t) => {
  const lines = draw(t);
  if (!lines) return;
  const row = withId(lines, "open-detail") ?? "";
  assert.match(row, /:role\[Str\("button"\)\]/, show(lines));
  assert.match(row, /:on_click\(fn\)/, row);
});

test("an account that is not connected closes its view once and draws no label", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: "claude:gone:x", overlay: "overlay-1" },
    now: THURSDAY,
    readings: [maxi, terac],
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
  const drawn = texts(result.lines);
  for (const text of ["maxi", "maxi · Terac", "Accounts and settings"]) {
    assert.ok(!drawn.includes(text), `${text}\n${show(result.lines)}`);
  }
});

test("a connected account's view asks nothing of the host", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: TERAC, overlay: "overlay-1" },
    now: THURSDAY,
    readings: [maxi, terac],
    accounts: ACCOUNTS,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("an account that goes away after the view opened closes it once", (t) => {
  const result = drawActing(
    t,
    "account",
    {
      props: { form: "account", account: TERAC, overlay: "overlay-1" },
      now: THURSDAY,
      readings: [maxi, terac],
    },
    "view.readings = [view.readings[0]];",
  );
  if (!result) return;
  assert.deepEqual(result.calls, [["closeOverlay", "overlay-1"]]);
});

test("a copy that is not an overlay draws nothing for an account not connected", (t) => {
  const result = drawActing(t, "account", {
    props: { form: "account", account: "claude:gone:x" },
    readings: [maxi],
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
  assert.deepEqual(texts(result.lines), [], show(result.lines));
});

test("a reading with no windows draws its label and the way to the detail view", (t) => {
  const lines = draw(t, { readings: [{ ...terac, windows: [] }] });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("maxi · Terac"), show(lines));
  assert.ok(drawn.includes("Accounts and settings"), show(lines));
  assert.equal(withId(lines, "window-0"), undefined, show(lines));
});

// The whole view: the draft's readings, in local time.
const DEC_5 = new Date(2026, 11, 5, 12, 0).getTime();
const DEC_9 = new Date(2026, 11, 9, 12, 0).getTime();
const NOV_9 = new Date(2026, 10, 9, 15, 0).getTime();
const NOV_14 = new Date(2026, 10, 14, 9, 0).getTime(); // in 1d 18h 30m
const TODAY_1508 = new Date(2026, 10, 12, 15, 8).getTime(); // in 38m
const TODAY_1812 = new Date(2026, 10, 12, 18, 12).getTime(); // in 3h 42m
const TODAY_1636 = new Date(2026, 10, 12, 16, 36).getTime(); // in 2h 6m
const SPARK = "GPT-5.3-Codex-Spark";
const PACE_LINE = "The line on a bar marks how much of its time has passed.";

// maxi with its per-model window, given first, and the end of its login.
function maxiWhole(overrides = {}) {
  return reading({
    id: MAXI,
    fetchedAt: THURSDAY - 2 * MINUTE,
    loginEndsAt: DEC_5,
    windows: [
      win("7d:sonnet", 0.18, MONDAY_2030, { label: "Weekly · Sonnet" }),
      win("5h", 0.62, TODAY_1618),
      win("7d", 0.41, MONDAY_2030),
    ],
    ...overrides,
  });
}

function teracWhole(overrides = {}) {
  return reading({
    id: TERAC,
    label: "maxi · Terac",
    plan: "Team",
    fetchedAt: THURSDAY - 3 * MINUTE,
    loginEndsAt: DEC_9,
    windows: [win("7d", 0.78, SATURDAY_1830), win("5h", 0.91, TODAY_1701)],
    ...overrides,
  });
}

// maxilr with its Spark limits, given before its general windows.
function maxilrWhole(overrides = {}) {
  return reading({
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    plan: "Pro",
    fetchedAt: THURSDAY - 2 * MINUTE,
    windows: [
      win("extra:gpt-5-3-codex-spark:5h", 0.64, TODAY_1636, {
        label: `${SPARK} · 5-hour`,
        durationMs: 5 * HOUR,
      }),
      win("extra:gpt-5-3-codex-spark:7d", 0.3, TUESDAY_1630, {
        label: `${SPARK} · Weekly`,
        durationMs: 7 * DAY,
      }),
      win("7d", 0.23, TUESDAY_1630),
      win("5h", 0.12, TODAY_1812),
    ],
    ...overrides,
  });
}

function drawAccount(t, id, readings, { width = 380, ui } = {}) {
  return drawForm(t, "account", {
    props: { form: "account", account: id, overlay: "overlay-1" },
    size: { width, height: 640 },
    now: THURSDAY,
    readings,
    accounts: ACCOUNTS,
    ...(ui ? { ui } : {}),
  });
}

// Every drawn text joined by spaces, so texts drawn apart read as one.
const sentence = (lines) => texts(lines).join(" ");

const ids = (lines) =>
  lines
    .map((line) => line.match(/:id\[Str\("([^"]*)"\)\]/)?.[1])
    .filter(Boolean);

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

test("one account among three draws only its own label, email and windows", (t) => {
  const lines = drawAccount(t, MAXI, [
    teracWhole(),
    maxiWhole(),
    maxilrWhole(),
  ]);
  if (!lines) return;
  const drawn = texts(lines);
  for (const text of [
    "maxi",
    "Max",
    "maxi@example.com",
    "41%",
    "62%",
    "18%",
    "Login ends Dec 5",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${show(lines)}`);
  }
  for (const text of [
    "maxi · Terac",
    "maxi@terac.example",
    "Terac",
    "maxilr",
    "maxilr@example.com",
    "78%",
    "91%",
    "23%",
    "Login ends Dec 9",
  ]) {
    assert.ok(!drawn.includes(text), `${text}\n${show(lines)}`);
  }
});

test("the header holds the label, the plan, this account's age and the refresh control; the email and organization under it", (t) => {
  const lines = drawAccount(t, TERAC, [maxiWhole(), teracWhole()]);
  if (!lines) return;
  assert.match(
    sentence(lines),
    /^maxi · Terac Team Read 3m ago maxi@terac\.example · Terac Weekly /,
    show(lines),
  );
  const control = withId(lines, "refresh") ?? "";
  assert.match(control, /:role\[Str\("button"\)\]/, show(lines));
  assert.match(control, /:accessibility_label\[Str\("Refresh"\)\]/);
  assert.match(control, /:on_click/);
  assert.match(
    inside(lines, "refresh").join("\n"),
    /svg "mods\/headroom\/icons\/refresh\.svg"/,
    show(lines),
  );
});

test("a per-model window comes after the general ones, with its name, numbers and clock time", (t) => {
  const lines = drawAccount(t, MAXI, [maxiWhole()]);
  if (!lines) return;
  assert.match(
    sentence(lines),
    new RegExp(
      [
        "Weekly 41% · resets in 4d 6h Mon 20:30",
        "5-hour 62% · resets in 1h 48m 16:18",
        "Weekly · Sonnet 18% · resets in 4d 6h Mon 20:30",
      ].join(" "),
    ),
    show(lines),
  );
  for (const id of ["window-0", "window-1", "window-2"]) {
    assert.ok(withId(lines, `${id}-pace`), `${id}-pace\n${show(lines)}`);
  }
  assert.match(withId(lines, "window-1") ?? "", /\.h\[Number\(3/);
  assert.match(withId(lines, "window-2") ?? "", /\.h\[Number\(6/);
});

test("a Codex account's additional limits come after its general windows", (t) => {
  const lines = drawAccount(t, MAXILR, [maxilrWhole()]);
  if (!lines) return;
  assert.match(
    sentence(lines),
    new RegExp(
      [
        "Weekly 23% · resets in 5d 2h Tue 16:30",
        "5-hour 12% · resets in 3h 42m 18:12",
        `${SPARK} · 5-hour 64% · resets in 2h 6m 16:36`,
        `${SPARK} · Weekly 30% · resets in 5d 2h Tue 16:30`,
      ].join(" "),
    ),
    show(lines),
  );
});

test("the age is this account's even when another account was read later", (t) => {
  const lines = drawAccount(t, MAXI, [
    maxiWhole(),
    teracWhole({ fetchedAt: THURSDAY }),
  ]);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Read 2m ago"), show(lines));
  assert.ok(!drawn.includes("Read just now"), show(lines));
});

test("at its limit the percentage is the words At limit, with the reset and its clock time", (t) => {
  const lines = drawAccount(t, TERAC, [
    teracWhole({
      windows: [
        win("7d", 1, SATURDAY_1830),
        win("5h", 0.97, TODAY_1508, { atLimit: true }),
      ],
    }),
  ]);
  if (!lines) return;
  const all = sentence(lines);
  assert.match(all, /5-hour At limit · resets in 38m 15:08/, show(lines));
  assert.match(all, /Weekly At limit · resets in 2d 4h Sat 18:30/);
  assert.doesNotMatch(all, /100%|97%/, show(lines));
});

test("a login in its last 3 days says how many days are left", (t) => {
  const lines = drawAccount(t, TERAC, [teracWhole({ loginEndsAt: NOV_14 })]);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Login ends in 2 days"), show(lines));
  assert.ok(!drawn.includes("Login ends Nov 14"), show(lines));
});

test("a failed read says its age and reason, dims its bars and keeps only the percentages", (t) => {
  const lines = drawAccount(t, TERAC, [
    teracWhole({
      status: "stale",
      fetchedAt: THURSDAY - 12 * MINUTE,
      error: "network",
    }),
  ]);
  if (!lines) return;
  const drawn = texts(lines);
  const all = sentence(lines);
  assert.ok(drawn.includes("12m old · network"), show(lines));
  assert.ok(drawn.includes("78%"), show(lines));
  assert.ok(drawn.includes("91%"), show(lines));
  assert.doesNotMatch(all, /resets|Sat 18:30|17:01|Read /, show(lines));
  assert.ok(!ids(lines).some((id) => id.endsWith("-pace")), show(lines));
  for (const id of ["window-0", "window-1"]) {
    assert.match(withId(lines, id) ?? "", /\.opacity\[Number\(0\.4\)\]/, id);
  }
  assert.ok(!drawn.includes(PACE_LINE), show(lines));
  assert.equal(withId(lines, "pace-key"), undefined, show(lines));
  assert.ok(drawn.includes("Login ends Dec 9"), show(lines));
});

test("an account that must sign in again draws its label and when its login ended, no windows", (t) => {
  const lines = drawAccount(t, TERAC, [
    teracWhole({ status: "signed-out", loginEndsAt: NOV_9 }),
  ]);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("maxi · Terac"), show(lines));
  assert.ok(drawn.includes("Login ended Nov 9"), show(lines));
  const all = sentence(lines);
  assert.doesNotMatch(all, /%|Read |Weekly|5-hour/, show(lines));
  assert.ok(!ids(lines).some((id) => id.startsWith("window-")), show(lines));
});

test("a first read draws the mark, the label, the email and one pair of empty tracks; the control turns", (t) => {
  const lines = drawAccount(t, TERAC, [
    teracWhole({ status: "stale", fetchedAt: null, windows: [] }),
  ]);
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("maxi · Terac"), show(lines));
  assert.ok(drawn.includes("maxi@terac.example"), show(lines));
  assert.ok(!drawn.includes("Team"), show(lines));
  assert.doesNotMatch(sentence(lines), /Read |Login/, show(lines));
  assert.ok(withId(lines, "first-full"), show(lines));
  assert.ok(withId(lines, "first-short"), show(lines));
  assert.match(
    inside(lines, "refresh").join("\n"),
    /svg "mods\/workspace-chrome\/spinner\.svg"/,
    show(lines),
  );
});

test("the line about the pace mark is drawn with a pace mark", (t) => {
  const lines = drawAccount(t, MAXI, [maxiWhole()]);
  if (!lines) return;
  assert.ok(texts(lines).includes(PACE_LINE), show(lines));
  assert.ok(withId(lines, "pace-key"), show(lines));
  // It comes after the windows and before the login line.
  const drawn = texts(lines);
  assert.ok(drawn.indexOf(PACE_LINE) > drawn.indexOf("18%"), show(lines));
  assert.ok(
    drawn.indexOf(PACE_LINE) < drawn.indexOf("Login ends Dec 5"),
    show(lines),
  );
});

for (const [name, overrides] of [
  ["a failed read", { status: "stale", error: "network" }],
  ["a first read", { status: "stale", fetchedAt: null, windows: [] }],
  ["an account that must sign in again", { status: "signed-out" }],
  [
    "windows that have not started",
    { windows: [win("7d", 0, null), win("5h", 0, null)] },
  ],
]) {
  test(`no line about the pace mark for ${name}`, (t) => {
    const lines = drawAccount(t, MAXI, [maxiWhole(overrides)]);
    if (!lines) return;
    assert.ok(!texts(lines).includes(PACE_LINE), show(lines));
    assert.equal(withId(lines, "pace-key"), undefined, show(lines));
  });
}

test("a window that has not started reads 0% · not started, with no clock time", (t) => {
  const lines = drawAccount(t, MAXI, [
    maxiWhole({ windows: [win("7d", 0.05, MONDAY_2030), win("5h", 0, null)] }),
  ]);
  if (!lines) return;
  assert.match(
    sentence(lines),
    /Weekly 5% · resets in 4d 6h Mon 20:30 5-hour 0% · not started The line on a bar marks how much of its time has passed\. Login/,
    show(lines),
  );
  assert.equal(withId(lines, "window-1-pace"), undefined, show(lines));
});

test("at 300 px nothing is dropped, clock times included", (t) => {
  const wide = drawAccount(t, MAXI, [maxiWhole()]);
  if (!wide) return;
  const narrow = drawAccount(t, MAXI, [maxiWhole()], { width: 300 });
  assert.deepEqual(texts(narrow), texts(wide));
  assert.ok(texts(narrow).includes("Mon 20:30"), show(narrow));
  assert.ok(texts(narrow).includes("16:18"), show(narrow));
});

test("the refresh control reads this account only", (t) => {
  const result = drawActing(
    t,
    "account",
    {
      props: { form: "account", account: TERAC, overlay: "overlay-1" },
      now: THURSDAY,
      readings: [maxiWhole(), teracWhole(), maxilrWhole()],
      accounts: ACCOUNTS,
    },
    "form.refresh(view, cx);",
  );
  if (!result) return;
  assert.deepEqual(result.calls, [["refresh", TERAC]]);
});

test("while reading, the refresh control is Herdr's spinner", (t) => {
  const lines = drawAccount(t, TERAC, [teracWhole()], {
    ui: { account: { refreshing: true } },
  });
  if (!lines) return;
  const drawn = inside(lines, "refresh").join("\n");
  assert.match(
    drawn,
    /svg "mods\/workspace-chrome\/spinner\.svg"/,
    show(lines),
  );
  assert.doesNotMatch(drawn, /refresh\.svg/);
  assert.ok(texts(lines).includes("Read 3m ago"), show(lines));
});
