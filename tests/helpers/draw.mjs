// Draws the mod, or one of its ui modules, with `herdr-app check --print-spec`
// and reads what it describes. A mod may import only from inside its own
// folder, so each drawing is a copy of the mod with its own `main.js`.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NOW } from "./fakes.mjs";

const mod = fileURLToPath(new URL("../../mods/headroom", import.meta.url));

// The printed lines of a copy of the mod whose `main.js` is `mainSource`, or
// null (the test skipped) when `herdr-app` is not on PATH. The copy runs with
// an empty Herdr home of its own.
export function drawSource(t, mainSource) {
  const root = mkdtempSync(join(tmpdir(), "headroom-draw-"));
  try {
    const dir = join(root, "headroom");
    const home = join(root, "home");
    mkdirSync(home);
    cpSync(mod, dir, { recursive: true });
    writeFileSync(join(dir, "main.js"), mainSource);
    const result = spawnSync("herdr-app", ["check", dir, "--print-spec"], {
      encoding: "utf8",
      env: { ...process.env, HERDR_APP_HOME: home },
    });
    if (result.error?.code === "ENOENT") {
      t.skip("herdr-app is not on PATH");
      return null;
    }
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    return result.stdout.split("\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// Draws `ui/<form>.js`: its `init` (when it has one), then its `render`, with
// a view built from `fixture` (JSON only): `{ props, size, now, readings,
// notify, accounts, ui, layout }`.
export function drawForm(t, form, fixture = {}) {
  return drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";
import * as form from "./ui/${form}.js";

const fixture = ${JSON.stringify(fixture)};
const nothing = () => undefined;
const resolved = async () => ({ ok: true });

export default class Draw extends View {
  init(_props, cx) {
    const store = new Proxy(
      { accounts: () => fixture.accounts ?? [] },
      {
        get: (target, key) =>
          key in target ? target[key] : key === "then" ? undefined : resolved,
      },
    );
    const host = {
      now: () => fixture.now ?? ${NOW},
      random: nothing,
      fetch: nothing,
      platform: "macos",
      home: "",
      exec: nothing,
      readText: nothing,
      writeText: nothing,
      shared: nothing,
      setShared: nothing,
      notify: nothing,
      layout: () => fixture.layout ?? null,
      resize: nothing,
      openOverlay: nothing,
      closeOverlay: nothing,
      openUrl: nothing,
    };
    this.view = {
      form: ${JSON.stringify(form)},
      props: fixture.props ?? {},
      size: fixture.size ?? null,
      now: fixture.now ?? ${NOW},
      theme: theme(),
      readings: fixture.readings ?? [],
      notify: fixture.notify ?? true,
      ui: fixture.ui ?? {},
      store,
      host,
    };
    if (form.init) form.init(this.view, cx);
  }

  render(cx) {
    this.view.theme = theme();
    return div().id("draw").size_full().child(form.render(this.view, cx));
  }
}
`,
  );
}

// Every drawn text, in order.
export function texts(lines) {
  return lines
    .map((line) => line.match(/^\s*text "(.*)"$/)?.[1])
    .filter((text) => text !== undefined)
    .map((text) => {
      try {
        return JSON.parse(`"${text}"`);
      } catch {
        return text;
      }
    });
}

// The line of the element with `id`, or undefined.
export function withId(lines, id) {
  return lines.find((line) => line.includes(`:id[Str(${JSON.stringify(id)})]`));
}

// Draws `ui/<form>.js` as `drawForm` does, but its store and host record what
// is asked of them. `steps` is JavaScript run in the view's `init` after the
// form's own, with `view`, `cx` and `form` in scope. Gives `{ calls, lines }`,
// or null (the test skipped) when `herdr-app` is not on PATH: `calls` is
// `[name, ...args]` for each call to the store's `refresh`, `rename`, `move`
// and `remove` (each resolves `{ ok: true }`) and to the host's
// `openOverlay` (it returns "overlay-2"), `closeOverlay`, `setShared`,
// `resize` and `openUrl` (it resolves true), in order, read after the form's `render` has run;
// `lines` are the form's own drawn lines.
export function drawActing(t, form, fixture = {}, steps = "") {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";
import * as form from "./ui/${form}.js";

const fixture = ${JSON.stringify(fixture)};
const calls = [];
const nothing = () => undefined;
const record =
  (name, answer) =>
  (...args) => {
    calls.push([name, ...args]);
    return answer;
  };
const recordAsync =
  (name) =>
  async (...args) => {
    calls.push([name, ...args]);
    return { ok: true };
  };

export default class Acting extends View {
  init(_props, cx) {
    const store = {
      accounts: () => fixture.accounts ?? [],
      refresh: recordAsync("refresh"),
      rename: recordAsync("rename"),
      move: recordAsync("move"),
      remove: recordAsync("remove"),
    };
    const host = {
      now: () => fixture.now ?? ${NOW},
      random: nothing,
      fetch: nothing,
      platform: "macos",
      home: "",
      exec: nothing,
      readText: nothing,
      writeText: nothing,
      shared: nothing,
      setShared: record("setShared", null),
      notify: nothing,
      layout: () => fixture.layout ?? null,
      resize: record("resize", null),
      openOverlay: record("openOverlay", "overlay-2"),
      closeOverlay: record("closeOverlay", null),
      openUrl: async (...args) => record("openUrl", true)(...args),
    };
    this.view = {
      form: ${JSON.stringify(form)},
      props: fixture.props ?? {},
      size: fixture.size ?? null,
      now: fixture.now ?? ${NOW},
      theme: theme(),
      readings: fixture.readings ?? [],
      notify: fixture.notify ?? true,
      ui: fixture.ui ?? {},
      store,
      host,
    };
    const view = this.view;
    form.init?.(view, cx);
    ${steps}
  }

  render(cx) {
    this.view.theme = theme();
    const drawn = form.render(this.view, cx);
    return div()
      .id("acting")
      .child(div().id("acting-calls").child(JSON.stringify(calls)))
      .child(div().id("drawn").size_full().child(drawn));
  }
}
`,
  );
  if (!lines) return null;
  const at = lines.findIndex((line) =>
    line.includes(':id[Str("acting-calls")]'),
  );
  const [recorded] = texts(lines.slice(at + 1, at + 2));
  return {
    calls: JSON.parse(recorded),
    lines: lines.filter((_, i) => i !== at && i !== at + 1),
  };
}

// Draws `ui/<form>.js` as `drawActing` does, then clicks the element with
// `id`: the form is drawn once with every element's id and click handler
// noted, and the handler of the element with `id` runs with an empty event.
// Gives `drawActing`'s `{ calls, lines }`, so `calls` holds what the click
// asked of the store and the host, or null (the test skipped) when
// `herdr-app` is not on PATH. The drawing fails when no element with `id`
// has a click.
export function drawClicking(t, form, fixture, id) {
  return drawActing(
    t,
    form,
    fixture,
    `const kit = Object.getPrototypeOf(div());
    const setId = kit.id;
    const setClick = kit.on_click;
    const ids = new Map();
    const clicks = new Map();
    kit.id = function (value) {
      ids.set(this, value);
      return setId.call(this, value);
    };
    kit.on_click = function (handler) {
      clicks.set(this, handler);
      return setClick.call(this, handler);
    };
    try {
      form.render(view, cx);
    } finally {
      kit.id = setId;
      kit.on_click = setClick;
    }
    const clicked = [...clicks].find(([el]) => ids.get(el) === ${JSON.stringify(id)});
    if (clicked === undefined) throw new Error("no click on " + ${JSON.stringify(id)});
    clicked[1]({}, cx);`,
  );
}

// The theme's colour `key` (`border`, `chrome`, …) as Herdr prints it, or
// null (the test skipped) when `herdr-app` is not on PATH.
export function themeColour(t, key) {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { theme } from "herdr";

export default class Colours extends View {
  render() {
    return div().child(JSON.stringify(theme()[${JSON.stringify(key)}]));
  }
}
`,
  );
  return lines ? JSON.parse(texts(lines)[0]) : null;
}
