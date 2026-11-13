import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, drawSource, texts, withId } from "./helpers/draw.mjs";
import { reading, win } from "./helpers/fakes.mjs";

test("the detail view draws each account and Connect account", (t) => {
  const lines = drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 400 },
    readings: [reading()],
  });
  if (!lines) return;
  const drawn = texts(lines);
  const all = drawn.join(" ");
  assert.ok(drawn.includes("Limits"), lines.join("\n"));
  assert.ok(drawn.includes("maxi"), lines.join("\n"));
  assert.match(all, /41%/);
  assert.match(all, /62%/);
  assert.ok(drawn.includes("Connect account"), lines.join("\n"));
  assert.match(withId(lines, "connect-account") ?? "", /:on_click/);
});

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Thursday 12 November 2026, 14:30 here; resets and logins in local time.
const THURSDAY = new Date(2026, 10, 12, 14, 30).getTime();
const MONDAY_2030 = new Date(2026, 10, 16, 20, 30).getTime(); // in 4d 6h
const TODAY_1618 = new Date(2026, 10, 12, 16, 18).getTime(); // in 1h 48m
const SATURDAY_1830 = new Date(2026, 10, 14, 18, 30).getTime(); // in 2d 4h
const TODAY_1701 = new Date(2026, 10, 12, 17, 1).getTime(); // in 2h 31m
const TUESDAY_1630 = new Date(2026, 10, 17, 16, 30).getTime(); // in 5d 2h
const DEC_5 = new Date(2026, 11, 5, 12, 0).getTime();
const DEC_9 = new Date(2026, 11, 9, 12, 0).getTime();

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
    signedInAt: THURSDAY - 30 * DAY,
  },
  {
    id: TERAC,
    provider: "claude",
    label: "maxi · Terac",
    email: "maxi@terac.example",
    organization: "Terac",
    plan: "Team",
    signedInAt: THURSDAY - 20 * DAY,
  },
  {
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    email: "maxilr@example.com",
    organization: null,
    plan: null,
    signedInAt: THURSDAY - 10 * DAY,
  },
];

// The draft's three accounts; maxi's windows given out of order.
function maxi(overrides = {}) {
  return reading({
    id: MAXI,
    fetchedAt: THURSDAY - 2 * MINUTE,
    loginEndsAt: DEC_5,
    windows: [
      win("5h", 0.62, TODAY_1618),
      win("7d:sonnet", 0.18, MONDAY_2030, { label: "Weekly · Sonnet" }),
      win("7d", 0.41, MONDAY_2030),
    ],
    ...overrides,
  });
}

function terac(overrides = {}) {
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

function maxilr(overrides = {}) {
  return reading({
    id: MAXILR,
    provider: "codex",
    label: "maxilr",
    plan: null,
    fetchedAt: THURSDAY - 2 * MINUTE,
    windows: [win("7d", 0.23, TUESDAY_1630)],
    ...overrides,
  });
}

function draw(t, { width = 380, ...fixture } = {}) {
  return drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width, height: 640 },
    now: THURSDAY,
    accounts: ACCOUNTS,
    ...fixture,
  });
}

const show = (lines) => lines.join("\n");

// Every drawn text joined by spaces, so texts drawn apart read as one.
const sentence = (lines) => texts(lines).join(" ");

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

const ids = (lines) =>
  lines
    .map((line) => line.match(/:id\[Str\("([^"]*)"\)\]/)?.[1])
    .filter(Boolean);

// The notifications switch's line.
const notifySwitch = (lines) =>
  lines.find((line) => line.trim().startsWith('Switch "notify"'));

// Where in the drawing `text` is drawn, or the element with `id` when `text`
// is `{ id }`.
function at(lines, text) {
  if (typeof text === "object") {
    return lines.findIndex((line) =>
      line.includes(`:id[Str(${JSON.stringify(text.id)})]`),
    );
  }
  return lines.findIndex(
    (line) => line.trim() === `text ${JSON.stringify(text)}`,
  );
}

test("three accounts at 380 px: every window with its numbers, reset and clock time", (t) => {
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Limits"), show(lines));
  assert.ok(drawn.includes("Read 2m ago"), show(lines));

  assert.deepEqual(texts(inside(lines, "account-0")), [
    "maxi",
    "Max",
    "maxi@example.com",
    "Weekly",
    "41%",
    "resets in 4d 6h",
    "Mon 20:30",
    "5-hour",
    "62%",
    "resets in 1h 48m",
    "16:18",
    "Weekly · Sonnet",
    "18%",
    "resets in 4d 6h",
    "Mon 20:30",
    "Login ends Dec 5",
  ]);
  const second = sentence(inside(lines, "account-1"));
  assert.match(second, /^maxi · Terac Team maxi@terac\.example · Terac /);
  assert.match(second, /Weekly 78% resets in 2d 4h Sat 18:30/);
  assert.match(second, /5-hour 91% resets in 2h 31m 17:01/);
  assert.match(second, /Login ends Dec 9$/);
  assert.deepEqual(texts(inside(lines, "account-2")), [
    "maxilr",
    "maxilr@example.com",
    "Weekly",
    "23%",
    "resets in 5d 2h",
    "Tue 16:30",
  ]);

  // Each window's bar: full for weekly windows, thin for the 5-hour one,
  // each with its pace mark.
  assert.match(withId(lines, "account-0-window-0") ?? "", /\.h\[Number\(6/);
  assert.match(withId(lines, "account-0-window-1") ?? "", /\.h\[Number\(3/);
  assert.match(withId(lines, "account-0-window-2") ?? "", /\.h\[Number\(6/);
  for (const id of [
    "account-0-window-0-pace",
    "account-0-window-1-pace",
    "account-0-window-2-pace",
    "account-1-window-1-pace",
    "account-2-window-0-pace",
  ]) {
    assert.ok(withId(lines, id), `${id} missing\n${show(lines)}`);
  }
  assert.equal(withId(lines, "account-0-window-3"), undefined);
  // The bar is under its line.
  assert.ok(
    at(lines, { id: "account-0-window-0" }) > at(lines, "Mon 20:30"),
    show(lines),
  );
});

test("the header's refresh control reads every account and names itself", (t) => {
  const lines = draw(t, { readings: [maxi()] });
  if (!lines) return;
  const control = withId(lines, "refresh") ?? "";
  assert.match(control, /:role\[Str\("button"\)\]/, show(lines));
  assert.match(control, /:accessibility_label\[Str\("Refresh"\)\]/);
  assert.match(control, /:on_click/);
  assert.match(
    inside(lines, "refresh").join("\n"),
    /svg "mods\/headroom\/icons\/refresh\.svg"/,
  );
});

test("while reading, the refresh control is Herdr's spinner", (t) => {
  const lines = draw(t, {
    readings: [maxi()],
    ui: { detail: { refreshing: true } },
  });
  if (!lines) return;
  const drawn = inside(lines, "refresh").join("\n");
  assert.match(drawn, /spinner\.svg/, show(lines));
  assert.match(drawn, /:spin\[/);
  assert.doesNotMatch(drawn, /refresh\.svg/);
  assert.match(
    withId(lines, "refresh") ?? "",
    /:accessibility_label\[Str\("Refresh"\)\]/,
  );
});

test("a weekly-only account draws one full bar and no 5-hour line", (t) => {
  const lines = draw(t, { readings: [maxilr()] });
  if (!lines) return;
  assert.ok(withId(lines, "account-0-window-0"), show(lines));
  assert.equal(withId(lines, "account-0-window-1"), undefined);
  assert.ok(!texts(lines).includes("5-hour"), show(lines));
  assert.match(sentence(lines), /Weekly 23% resets in 5d 2h Tue 16:30/);
});

test("at 300 px the clock times are dropped", (t) => {
  const lines = draw(t, { width: 300, readings: [maxi(), terac()] });
  if (!lines) return;
  const all = sentence(lines);
  assert.match(all, /Weekly 41% resets in 4d 6h 5-hour/, show(lines));
  assert.match(all, /resets in 1h 48m/);
  assert.doesNotMatch(all, /Mon 20:30|16:18|Sat 18:30|17:01/, show(lines));
});

test("at 560 px each window is one line: name, bar, percentage, reset, clock", (t) => {
  const lines = draw(t, { width: 560, readings: [maxi()] });
  if (!lines) return;
  const name = at(lines, "Weekly");
  const bar = at(lines, { id: "account-0-window-0" });
  const percent = at(lines, "41%");
  assert.ok(name >= 0 && bar > name && percent > bar, show(lines));
  assert.ok(at(lines, "resets in 4d 6h") > percent, show(lines));
  assert.ok(at(lines, "Mon 20:30") > at(lines, "resets in 4d 6h"));
  assert.ok(at(lines, "16:18") > 0, show(lines));
});

test("the notifications switch is on when notifications are", (t) => {
  const lines = draw(t, { readings: [maxi()], notify: true });
  if (!lines) return;
  assert.ok(
    texts(lines).includes("Notify at 90% and at the limit"),
    show(lines),
  );
  const control = notifySwitch(lines) ?? "";
  assert.match(control, /:checked\[Bool\(true\)\]/, show(lines));
  assert.match(control, /:on_change\(fn\)/, show(lines));
  assert.doesNotMatch(control, /:on_click/, show(lines));
  assert.match(
    control,
    /:accessibility_label\[Str\("Notify at 90% and at the limit"\)\]/,
  );
});

test("the notifications switch is drawn off when notifications are off", (t) => {
  const lines = draw(t, { readings: [maxi()], notify: false });
  if (!lines) return;
  assert.match(
    notifySwitch(lines) ?? "",
    /:checked\[Bool\(false\)\]/,
    show(lines),
  );
  assert.match(notifySwitch(lines) ?? "", /:on_change\(fn\)/, show(lines));
  assert.doesNotMatch(notifySwitch(lines) ?? "", /:on_click/, show(lines));
});

test("sign in again: the control, when the login ended, no windows", (t) => {
  const lines = draw(t, {
    readings: [
      maxi({
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Sign in again"), show(lines));
  assert.ok(drawn.includes("Login ended Nov 9"), show(lines));
  assert.ok(drawn.includes("maxi@example.com"), show(lines));
  // The footer's own words hold a %; the account holds none.
  assert.doesNotMatch(
    sentence(inside(lines, "account-0")),
    /%|resets/,
    show(lines),
  );
  assert.ok(!ids(lines).some((id) => id.includes("-window-")), show(lines));
  const control = withId(lines, "account-0-sign-in") ?? "";
  assert.match(control, /:role\[Str\("button"\)\]/, show(lines));
  assert.match(control, /:on_click/);
});

test("a failed read dims the bars, drops pace marks and says its age", (t) => {
  const lines = draw(t, {
    readings: [
      maxi({
        status: "stale",
        fetchedAt: THURSDAY - 12 * MINUTE,
        error: "network",
      }),
    ],
  });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("12m old · network"), show(lines));
  assert.ok(drawn.includes("41%"), show(lines));
  assert.ok(!ids(lines).some((id) => id.endsWith("-pace")), show(lines));
  for (const id of [
    "account-0-window-0",
    "account-0-window-1",
    "account-0-window-2",
  ]) {
    assert.match(withId(lines, id) ?? "", /\.opacity\[Number\(0\.4\)\]/, id);
  }
});

test("at its limit the percentage is the words At limit", (t) => {
  const lines = draw(t, {
    readings: [
      maxi({
        windows: [
          win("7d", 0.81, MONDAY_2030),
          win("5h", 0.97, TODAY_1618, { atLimit: true }),
        ],
      }),
    ],
  });
  if (!lines) return;
  const all = sentence(lines);
  assert.match(all, /5-hour At limit resets in 1h 48m 16:18/, show(lines));
  assert.match(all, /Weekly 81% resets in 4d 6h/);
  assert.doesNotMatch(all, /97%/);
});

test("a window that has not started reads 0% and not started, no pace mark", (t) => {
  const lines = draw(t, {
    readings: [
      maxi({
        windows: [win("7d", 0.05, MONDAY_2030), win("5h", 0, null)],
      }),
    ],
  });
  if (!lines) return;
  assert.match(sentence(lines), /5-hour 0% not started/, show(lines));
  assert.ok(withId(lines, "account-0-window-1"), show(lines));
  assert.equal(withId(lines, "account-0-window-1-pace"), undefined);
  assert.ok(withId(lines, "account-0-window-0-pace"), show(lines));
});

test("a first read draws the account's header lines only", (t) => {
  const lines = draw(t, {
    readings: [
      maxi({
        status: "stale",
        fetchedAt: null,
        loginEndsAt: null,
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  assert.deepEqual(texts(inside(lines, "account-0")), [
    "maxi",
    "Max",
    "maxi@example.com",
  ]);
  assert.ok(!sentence(lines).includes("Read "), show(lines));
});

test("a login ending within 3 days is still said as its date", (t) => {
  const lines = draw(t, {
    readings: [maxi({ loginEndsAt: new Date(2026, 10, 14, 9, 0).getTime() })],
  });
  if (!lines) return;
  assert.ok(texts(lines).includes("Login ends Nov 14"), show(lines));
});

test("with no accounts: the header, No accounts yet and the footer", (t) => {
  const lines = draw(t, { readings: [], accounts: [] });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Limits"), show(lines));
  assert.ok(drawn.includes("No accounts yet"), show(lines));
  assert.ok(!sentence(lines).includes("Read "), show(lines));
  assert.ok(notifySwitch(lines), show(lines));
  assert.match(withId(lines, "connect-account") ?? "", /:on_click/);
  assert.equal(withId(lines, "account-0"), undefined);
});

test("a Claude account's first read, its login end known, draws its header lines only", (t) => {
  // A first read of a Claude account carries the end of its login.
  const lines = draw(t, {
    readings: [
      maxi({
        status: "stale",
        fetchedAt: null,
        loginEndsAt: new Date(2026, 10, 14, 9, 0).getTime(),
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  assert.deepEqual(texts(inside(lines, "account-0")), [
    "maxi",
    "Max",
    "maxi@example.com",
  ]);
});

test("each account's up and down arrows: buttons named Move up and Move down", (t) => {
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  const within = inside(lines, "account-1").join("\n");
  for (const [id, name] of [
    ["account-1-up", "Move up"],
    ["account-1-down", "Move down"],
  ]) {
    const control = withId(lines, id) ?? "";
    assert.ok(within.includes(control) && control !== "", show(lines));
    assert.match(control, /:role\[Str\("button"\)\]/, show(lines));
    assert.match(control, /:on_click\(fn\)/);
    assert.match(control, new RegExp(`:tooltip\\[Str\\("${name}"\\)\\]`));
    assert.match(
      control,
      new RegExp(`:accessibility_label\\[Str\\("${name}"\\)\\]`),
    );
  }
  assert.match(
    inside(lines, "account-1-up").join("\n"),
    /svg "mods\/headroom\/icons\/arrow-up\.svg"/,
    show(lines),
  );
  assert.match(
    inside(lines, "account-1-down").join("\n"),
    /svg "mods\/headroom\/icons\/arrow-down\.svg"/,
    show(lines),
  );
});

test("the first account's up and the last account's down are dimmed", (t) => {
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  const dimmed = /\.opacity\[Number\(0\.35\)\]/;
  assert.match(withId(lines, "account-0-up") ?? "", dimmed, show(lines));
  assert.match(withId(lines, "account-2-down") ?? "", dimmed, show(lines));
  assert.doesNotMatch(withId(lines, "account-1-up") ?? "", dimmed);
  assert.ok(withId(lines, "account-1-up"), show(lines));
});

test("with one account there are no arrows", (t) => {
  const lines = draw(t, { readings: [maxi()] });
  if (!lines) return;
  assert.ok(withId(lines, "account-0"), show(lines));
  assert.ok(
    !ids(lines).some((id) => id.endsWith("-up") || id.endsWith("-down")),
    show(lines),
  );
});

test("a signed-out account's Sign in again comes before its arrows", (t) => {
  const lines = draw(t, {
    readings: [
      maxi(),
      terac({
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  const signIn = at(lines, { id: "account-1-sign-in" });
  assert.ok(signIn >= 0, show(lines));
  assert.ok(at(lines, { id: "account-1-up" }) > signIn, show(lines));
});

test("the detail view has no account menu: the arrows, refresh, the switch and Connect account stay", (t) => {
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  assert.ok(!ids(lines).some((id) => id.startsWith("menu-")), show(lines));
  assert.ok(
    !lines.some((line) => line.includes('Str("Account menu")')),
    show(lines),
  );
  assert.ok(!lines.some((line) => /^\s*Popover\b/.test(line)), show(lines));
  for (const word of ["Rename", "Move up", "Move down", "Remove"]) {
    assert.ok(!texts(lines).includes(word), `${word}\n${show(lines)}`);
  }
  for (const id of [
    "account-0-up",
    "account-0-down",
    "account-2-up",
    "account-2-down",
    "refresh",
    "connect-account",
  ]) {
    assert.ok(withId(lines, id), `${id}\n${show(lines)}`);
  }
  assert.ok(notifySwitch(lines), show(lines));
  assert.ok(texts(lines).includes("Connect account"), show(lines));
});

// The theme's hover ground, as Herdr prints it.
function hoverColour(t) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";

export default class Colours extends View {
  render() {
    return div().child(JSON.stringify({ hover: theme().hover }));
  }
}
`,
  );
  return lines ? JSON.parse(texts(lines)[0]).hover : null;
}

test("each account opens its account view on a click, with the hover ground and a pointer", (t) => {
  const hover = hoverColour(t);
  if (hover === null) return;
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  for (const id of ["account-0", "account-1", "account-2"]) {
    const line = withId(lines, id) ?? "";
    assert.match(line, /:on_click\(fn\)/, `${id}\n${show(lines)}`);
    assert.ok(
      line.includes(`:hover(.bg[Str(${JSON.stringify(hover)})])`),
      `${id}\n${show(lines)}`,
    );
    assert.match(line, /\.cursor_pointer/, `${id}\n${show(lines)}`);
  }
});

test("each account is a button a screen reader names by its label and its windows", (t) => {
  const lines = drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 640 },
    readings: [
      reading(),
      reading({
        id: "claude:acct-maxi:org-terac",
        label: "maxi · Terac",
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  for (const [id, words] of [
    [
      "account-0",
      "maxi, Weekly 41% used, resets in 4d 6h, 5-hour 62% used, resets in 1h 48m",
    ],
    ["account-1", "maxi · Terac, Sign in again, Login ended Nov 9"],
  ]) {
    const line = withId(lines, id) ?? "";
    assert.match(line, /:role\[Str\("button"\)\]/, `${id}\n${show(lines)}`);
    assert.ok(
      line.includes(`:accessibility_label[Str(${JSON.stringify(words)})]`),
      `${id}\n${line}`,
    );
  }
});

test("inside a clickable account the arrows, dimmed ones too, and Sign in again keep their own click", (t) => {
  const lines = draw(t, {
    readings: [
      maxi(),
      terac({
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
        windows: [],
      }),
      maxilr(),
    ],
  });
  if (!lines) return;
  for (const [account, controls] of [
    ["account-0", ["account-0-up", "account-0-down"]],
    ["account-1", ["account-1-up", "account-1-down", "account-1-sign-in"]],
    ["account-2", ["account-2-up", "account-2-down"]],
  ]) {
    assert.match(withId(lines, account) ?? "", /:on_click\(fn\)/, account);
    const within = inside(lines, account);
    for (const id of controls) {
      const control = within.find((line) =>
        line.includes(`:id[Str(${JSON.stringify(id)})]`),
      );
      assert.ok(control, `${id} not inside ${account}\n${show(lines)}`);
      assert.match(control, /:on_click\(fn\)/, `${id}\n${show(lines)}`);
    }
  }
});

test("with no accounts only Connect account, the refresh control and the switch are clickable", (t) => {
  const lines = draw(t, { readings: [], accounts: [] });
  if (!lines) return;
  const clickable = lines.filter((line) =>
    /:on_click\(fn\)|:on_change\(fn\)/.test(line),
  );
  assert.equal(clickable.length, 3, show(clickable));
  assert.ok(
    clickable.some((line) => line.includes(':id[Str("connect-account")]')),
    show(clickable),
  );
  assert.ok(
    clickable.some((line) => line.includes(':id[Str("refresh")]')),
    show(clickable),
  );
  assert.ok(
    clickable.some((line) => line.trim().startsWith('Switch "notify"')),
    show(clickable),
  );
});

// A dimmed arrow is disabled, so its own click never runs to stop the click;
// it keeps the press from reaching the account instead.
test("a dimmed arrow keeps a press from reaching its account", (t) => {
  const lines = draw(t, { readings: [maxi(), terac(), maxilr()] });
  if (!lines) return;
  for (const id of ["account-0-up", "account-2-down"]) {
    const control = withId(lines, id) ?? "";
    assert.match(control, /:disabled\[Bool\(true\)\]/, `${id}\n${show(lines)}`);
    assert.match(control, /:on_mouse_down_left\(fn\)/, `${id}\n${show(lines)}`);
  }
});
