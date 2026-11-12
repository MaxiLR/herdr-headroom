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
