import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, drawSource, texts, withId } from "./helpers/draw.mjs";
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

const WORDS = ["Rename", "Move up", "Move down", "Sign in again", "Remove"];

function draw(t, fixture = {}) {
  return drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 640 },
    now: THURSDAY,
    readings: READINGS,
    accounts: ACCOUNTS,
    ...fixture,
  });
}

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

// The menu's items as drawn: one line each.
const items = (lines) =>
  lines.filter((line) => line.includes(':role[Str("menu_item")]'));

const disabled = (line) => /:disabled\[Bool\(true\)\]/.test(line);

test("every account's section carries its account menu control", (t) => {
  const lines = draw(t);
  if (!lines) return;
  for (const index of [0, 1, 2]) {
    const id = `menu-${index}`;
    const control = withId(lines, id) ?? "";
    assert.match(control, /:role\[Str\("button"\)\]/, `${id}\n${show(lines)}`);
    assert.match(control, /:accessibility_label\[Str\("Account menu"\)\]/);
    assert.ok(
      inside(lines, `account-${index}`).some((line) => line === control),
      `${id} is not in its section\n${show(lines)}`,
    );
  }
  // Closed, no menu is drawn.
  assert.equal(items(lines).length, 0, show(lines));
  for (const word of ["Rename", "Move up", "Move down", "Remove"]) {
    assert.ok(!texts(lines).includes(word), `${word}\n${show(lines)}`);
  }
});

test("the menu open on the second of three accounts offers all five, each enabled", (t) => {
  const lines = draw(t, { ui: { menu: { open: TERAC, active: -1 } } });
  if (!lines) return;
  const drawn = items(inside(lines, "account-1"));
  assert.equal(drawn.length, 5, show(lines));
  assert.deepEqual(
    texts(inside(lines, "account-1")).filter((text) => WORDS.includes(text)),
    WORDS,
  );
  for (const line of drawn) {
    assert.ok(!disabled(line), line);
    assert.match(line, /:on_click/);
  }
  assert.equal(items(inside(lines, "account-0")).length, 0, show(lines));
  assert.equal(items(inside(lines, "account-2")).length, 0, show(lines));
});

test("the menu open on the first account cannot move it up", (t) => {
  const lines = draw(t, { ui: { menu: { open: MAXI, active: -1 } } });
  if (!lines) return;
  const drawn = items(inside(lines, "account-0"));
  assert.equal(drawn.length, 5, show(lines));
  const up = drawn.find((line) => line.includes('Str("Move up")'));
  const down = drawn.find((line) => line.includes('Str("Move down")'));
  assert.ok(up && down, show(lines));
  assert.ok(disabled(up), up);
  assert.ok(!disabled(down), down);
});

test("a rename in progress puts an input in place of the label", (t) => {
  const lines = draw(t, { ui: { menu: { renaming: TERAC } } });
  if (!lines) return;
  const section = inside(lines, "account-1");
  assert.ok(
    section.some((line) => /^\s*Input /.test(line)),
    show(lines),
  );
  assert.ok(!texts(section).includes("maxi · Terac"), show(lines));
  // The other accounts keep their labels.
  assert.ok(texts(inside(lines, "account-0")).includes("maxi"), show(lines));
  assert.ok(
    !inside(lines, "account-0").some((line) => /^\s*Input /.test(line)),
  );
});

// Runs `steps` against the detail view of the three accounts with a store and
// host that record every call, then draws it. Gives `{ calls, lines }`:
// `calls` is `[name, ...args]` for each store or host call, in order.
function act(t, { ui = {}, steps }) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";
import * as detail from "./ui/detail.js";
import * as menu from "./ui/menu.js";

const calls = [];
const record =
  (name) =>
  async (...args) => {
    calls.push([name, ...args]);
    return { ok: true };
  };

export default class Act extends View {
  init(_props, cx) {
    this.view = {
      form: "detail",
      props: { form: "detail", overlay: "overlay-1" },
      size: { width: 380, height: 640 },
      now: ${THURSDAY},
      theme: theme(),
      readings: ${JSON.stringify(READINGS)},
      notify: true,
      ui: ${JSON.stringify(ui)},
      store: {
        accounts: () => ${JSON.stringify(ACCOUNTS)},
        refresh: record("refresh"),
        rename: record("rename"),
        move: record("move"),
        remove: record("remove"),
      },
      host: {
        openOverlay: (spec) => {
          calls.push(["openOverlay", spec]);
          return "overlay-2";
        },
        closeOverlay: () => undefined,
        setShared: () => undefined,
      },
    };
    const view = this.view;
    detail.init?.(view, cx);
    ${steps}
  }

  render(cx) {
    this.view.theme = theme();
    return div()
      .id("act")
      .child(div().id("calls").child(JSON.stringify(calls)))
      .child(detail.render(this.view, cx));
  }
}
`,
  );
  if (!lines) return null;
  return { calls: JSON.parse(texts(inside(lines, "calls"))[0]), lines };
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

test("Remove asks first with Herdr's confirm dialog and removes nothing yet", (t) => {
  const result = act(t, {
    ui: { menu: { open: TERAC, active: -1 } },
    steps: `menu.choose(view, ${JSON.stringify(TERAC)}, "remove", cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["openOverlay", CONFIRM]]);
  // The menu closes.
  assert.equal(items(result.lines).length, 0, show(result.lines));
});

test("a confirmed remove removes the waiting account once", (t) => {
  const result = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(TERAC)}, "remove", cx);
    detail.command("remove", view, cx);
    detail.command("remove", view, cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [
    ["openOverlay", CONFIRM],
    ["remove", TERAC],
  ]);
});

test("a remove command with no account waiting removes nothing", (t) => {
  const result = act(t, {
    steps: `detail.command("remove", view, cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("Move up and Move down move the account by one", (t) => {
  const result = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(TERAC)}, "up", cx);
    menu.choose(view, ${JSON.stringify(TERAC)}, "down", cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [
    ["move", TERAC, -1],
    ["move", TERAC, 1],
  ]);
});

test("the first account is not moved up", (t) => {
  const result = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(MAXI)}, "up", cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
});

test("Sign in again opens the connect dialog with the provider chosen", (t) => {
  const result = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(MAXILR)}, "signin", cx);`,
  });
  if (!result) return;
  assert.equal(result.calls.length, 1, JSON.stringify(result.calls));
  const [name, spec] = result.calls[0];
  assert.equal(name, "openOverlay");
  assert.equal(spec.mod, "headroom");
  assert.deepEqual(spec.props, {
    connect: { provider: "codex", account: MAXILR },
  });
});

test("Rename puts an input in place of the label; Enter renames to its text", (t) => {
  const result = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(TERAC)}, "rename", cx);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
  const section = inside(result.lines, "account-1");
  assert.ok(
    section.some((line) => /^\s*Input /.test(line)),
    show(result.lines),
  );
  assert.ok(!texts(section).includes("maxi · Terac"), show(result.lines));

  const entered = act(t, {
    steps: `menu.choose(view, ${JSON.stringify(TERAC)}, "rename", cx);
    menu.submitRename(view);`,
  });
  assert.deepEqual(entered.calls, [["rename", TERAC, "maxi · Terac"]]);
  assert.ok(
    texts(inside(entered.lines, "account-1")).includes("maxi · Terac"),
    show(entered.lines),
  );
});

test("Esc leaves a rename as it was", (t) => {
  const result = act(t, {
    ui: { menu: { renaming: TERAC } },
    steps: `menu.cancelRename(view);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, []);
  const section = inside(result.lines, "account-1");
  assert.ok(!section.some((line) => /^\s*Input /.test(line)));
  assert.ok(texts(section).includes("maxi · Terac"), show(result.lines));
});

test("a rename preloaded as data holds the label: Enter renames to it", (t) => {
  const result = act(t, {
    ui: { menu: { renaming: TERAC } },
    steps: `menu.submitRename(view);`,
  });
  if (!result) return;
  assert.deepEqual(result.calls, [["rename", TERAC, "maxi · Terac"]]);
});
