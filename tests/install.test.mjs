import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = fileURLToPath(new URL("..", import.meta.url));
const script = join(moduleDir, "scripts", "install.sh");
const repoMod = join(moduleDir, "mods", "headroom");
// Herdr writes these two into any mod folder it checks; they are never copied.
const generated = new Set(["gpui-kit.d.ts", "jsconfig.json"]);

const jqDir = (() => {
  const found = spawnSync("/bin/sh", ["-c", "command -v jq"], {
    encoding: "utf8",
  });
  const path = found.stdout.trim();
  assert.ok(path, "jq must be installed to run the installer tests");
  return path.slice(0, path.lastIndexOf("/"));
})();

// A fresh temporary folder holding the Herdr home, HOME and a bin folder.
function sandbox(t, { home = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "headroom-install-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const box = {
    root,
    herdr: join(root, "herdr-app"),
    home: join(root, "home"),
    bin: join(root, "bin"),
  };
  mkdirSync(box.home);
  mkdirSync(box.bin);
  if (home) mkdirSync(box.herdr);
  return box;
}

function run(box, args = [], { scriptPath = script, env = {} } = {}) {
  const result = spawnSync(scriptPath, args, {
    encoding: "utf8",
    env: {
      HERDR_APP_HOME: box.herdr,
      HOME: box.home,
      PATH: [box.bin, jqDir, "/usr/bin", "/bin"].join(":"),
      TZ: "UTC",
      ...env,
    },
  });
  assert.equal(result.error, undefined, String(result.error));
  return { ...result, output: result.stdout + result.stderr };
}

function fakeHerdr(box, status, said = "") {
  const log = join(box.root, "herdr-app.args");
  const fake = join(box.bin, "herdr-app");
  writeFileSync(
    fake,
    `#!/bin/sh\nprintf '%s\\n' "$@" >"${log}"\nprintf '%s\\n' '${said}' >&2\nexit ${status}\n`,
  );
  chmodSync(fake, 0o755);
  return log;
}

// Every file under dir with its content, keyed by relative path; folders end
// in "/" so an empty folder counts too.
function snapshot(dir, { skipGenerated = false } = {}) {
  const files = {};
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      if (skipGenerated && generated.has(name)) continue;
      const path = rel ? `${rel}/${name}` : name;
      if (statSync(join(dir, path)).isDirectory()) {
        files[`${path}/`] = "";
        walk(path);
      } else {
        files[path] = readFileSync(join(dir, path)).toString("base64");
      }
    }
  };
  walk("");
  return files;
}

function installed(box) {
  return join(box.herdr, "mods", "headroom");
}

function backups(box) {
  const dir = join(box.herdr, "backups");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

function layoutPath(box, name) {
  return join(box.herdr, "layouts", `${name}.json`);
}

// A layout shaped like Herdr's own main.json: a sidebar column that cannot be
// resized, holding the brand, the lists and the footer, beside the work column
// of tabs, the body and Herdr's 28 px status block. Only the children of
// sidebar-lists share a draggable boundary.
function mainLayout() {
  return {
    id: "root",
    type: "row",
    titlebar: "none",
    children: [
      {
        id: "sidebar",
        type: "column",
        size: { px: 268 },
        resizable: false,
        background: "chrome",
        children: [
          {
            id: "brand",
            type: "block",
            size: { px: 46 },
            content: { mod: "workspace-chrome" },
          },
          {
            id: "sidebar-lists",
            type: "column",
            children: [
              {
                id: "spaces",
                type: "block",
                size: { weight: 1 },
                min: 90,
                content: { mod: "spaces" },
              },
              {
                id: "agents",
                type: "block",
                size: { weight: 1 },
                min: 90,
                content: { mod: "agents" },
              },
            ],
          },
          {
            id: "sidebar-footer",
            type: "block",
            size: { px: 69 },
            content: { mod: "workspace-chrome" },
          },
        ],
      },
      {
        id: "work",
        type: "column",
        resizable: false,
        children: [
          {
            id: "tabs",
            type: "block",
            size: { px: 42 },
            content: { mod: "tabs" },
          },
          {
            id: "work-body",
            type: "row",
            children: [
              { id: "main", type: "block", content: { tab: "active" } },
            ],
          },
          {
            id: "status",
            type: "block",
            size: { px: 28 },
            content: { mod: "workspace-status" },
          },
        ],
      },
    ],
  };
}

// The same layout with the headroom block last in sidebar-lists and the status
// block in a row of its height, the hidden strip after it, written out by hand.
function headroomLayout() {
  return {
    id: "root",
    type: "row",
    titlebar: "none",
    children: [
      {
        id: "sidebar",
        type: "column",
        size: { px: 268 },
        resizable: false,
        background: "chrome",
        children: [
          {
            id: "brand",
            type: "block",
            size: { px: 46 },
            content: { mod: "workspace-chrome" },
          },
          {
            id: "sidebar-lists",
            type: "column",
            children: [
              {
                id: "spaces",
                type: "block",
                size: { weight: 1 },
                min: 90,
                content: { mod: "spaces" },
              },
              {
                id: "agents",
                type: "block",
                size: { weight: 1 },
                min: 90,
                content: { mod: "agents" },
              },
              limitsBlock(),
            ],
          },
          {
            id: "sidebar-footer",
            type: "block",
            size: { px: 69 },
            content: { mod: "workspace-chrome" },
          },
        ],
      },
      {
        id: "work",
        type: "column",
        resizable: false,
        children: [
          {
            id: "tabs",
            type: "block",
            size: { px: 42 },
            content: { mod: "tabs" },
          },
          {
            id: "work-body",
            type: "row",
            children: [
              { id: "main", type: "block", content: { tab: "active" } },
            ],
          },
          {
            id: "status-row",
            type: "row",
            size: { px: 28 },
            children: [
              {
                id: "status",
                type: "block",
                size: { weight: 3 },
                content: { mod: "workspace-status" },
              },
              {
                id: "headroom-strip",
                type: "block",
                hidden: true,
                size: { weight: 2 },
                min: 120,
                max: 720,
                content: {
                  mod: "headroom",
                  props: { form: "strip", fit: "headroom-strip" },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

// The Limits block the installer adds, written out by hand: sized by the mod
// (props.fit), starting at one account with one bar.
function limitsBlock() {
  return {
    id: "headroom",
    type: "block",
    size: { px: 111 },
    min: 90,
    content: { mod: "headroom", props: { fit: "headroom" } },
  };
}

function writeMain(box, layout = mainLayout()) {
  const text =
    typeof layout === "string"
      ? layout
      : JSON.stringify(layout, null, 2) + "\n";
  mkdirSync(join(box.herdr, "layouts"), { recursive: true });
  writeFileSync(layoutPath(box, "main"), text);
  return text;
}

// The vault beside mods/: secret, so mode 0600.
function writeVault(box) {
  const dir = join(box.herdr, "headroom");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "vault.json");
  const bytes = Buffer.from(
    '{"v":1,"blob":"c2VjcmV0\\u0000"}\n\u00ff',
    "latin1",
  );
  writeFileSync(path, bytes);
  chmodSync(path, 0o600);
  return { path, bytes };
}

function assertVault(vault) {
  assert.deepEqual(readFileSync(vault.path), vault.bytes);
  assert.equal(statSync(vault.path).mode & 0o777, 0o600);
}

test("the installer is executable", () => {
  const mode = statSync(script).mode & 0o777;
  assert.equal(mode, 0o755, `install.sh has mode ${mode.toString(8)}`);
});

test("a first install copies the mod and makes no backup", (t) => {
  const box = sandbox(t);

  const result = run(box);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(
    snapshot(installed(box)),
    snapshot(repoMod, { skipGenerated: true }),
  );
  assert.deepEqual(backups(box), [], "nothing to back up makes no folder");
  assert.deepEqual(readdirSync(join(box.herdr, "mods")), ["headroom"]);
});

test("gpui-kit.d.ts and jsconfig.json are not copied, at any depth", (t) => {
  const box = sandbox(t);
  // A copy of the module, so the checkout's mod folder is never touched.
  const copy = join(box.root, "module");
  mkdirSync(join(copy, "scripts"), { recursive: true });
  cpSync(script, join(copy, "scripts", "install.sh"));
  cpSync(repoMod, join(copy, "mods", "headroom"), { recursive: true });
  for (const dir of ["", "ui"]) {
    mkdirSync(join(copy, "mods", "headroom", dir), { recursive: true });
    writeFileSync(join(copy, "mods", "headroom", dir, "gpui-kit.d.ts"), "");
    writeFileSync(join(copy, "mods", "headroom", dir, "jsconfig.json"), "{}");
  }

  const result = run(box, [], {
    scriptPath: join(copy, "scripts", "install.sh"),
  });

  assert.equal(result.status, 0, result.output);
  const files = snapshot(installed(box));
  assert.deepEqual(
    files,
    snapshot(join(copy, "mods", "headroom"), { skipGenerated: true }),
  );
  for (const path of Object.keys(files)) {
    const name = path.split("/").pop();
    assert.ok(!generated.has(name), `${path} was copied`);
  }
  assert.deepEqual(backups(box), []);
});

test("a reinstall backs up the previous install outside mods/ and restores the mod", (t) => {
  const box = sandbox(t);
  assert.equal(run(box).status, 0);

  writeFileSync(
    join(installed(box), "main.js"),
    "// changed in the Herdr home\n",
  );
  writeFileSync(join(installed(box), "stray.js"), "// stray\n");
  const previous = snapshot(installed(box));

  const result = run(box);

  assert.equal(result.status, 0, result.output);
  const made = backups(box);
  assert.equal(made.length, 1, `backups: ${made}`);
  assert.match(made[0], /^headroom-\d{8}-\d{6}(-\d+)?$/);
  const backup = join(box.herdr, "backups", made[0]);
  assert.ok(result.output.includes(backup), "the backup path is printed");
  assert.deepEqual(snapshot(backup), previous);
  assert.deepEqual(readdirSync(join(box.herdr, "mods")), ["headroom"]);
  assert.deepEqual(
    snapshot(installed(box)),
    snapshot(repoMod, { skipGenerated: true }),
  );

  const third = run(box);
  assert.equal(third.status, 0, third.output);
  assert.equal(backups(box).length, 2, `backups: ${backups(box)}`);
});

test("a backup whose name is taken gets a number added", (t) => {
  const box = sandbox(t);
  assert.equal(run(box).status, 0);

  // Take every name the next few seconds could produce, so the install has to
  // pick another one.
  const stamp = (date) => {
    const p = (n) => String(n).padStart(2, "0");
    return (
      `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
      `-${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`
    );
  };
  const now = Date.now();
  const taken = [];
  for (let s = -1; s <= 10; s += 1) {
    const name = `headroom-${stamp(new Date(now + s * 1000))}`;
    mkdirSync(join(box.herdr, "backups", name), { recursive: true });
    writeFileSync(join(box.herdr, "backups", name, "sentinel"), name);
    taken.push(name);
  }

  const result = run(box);

  assert.equal(result.status, 0, result.output);
  for (const name of taken) {
    assert.deepEqual(readdirSync(join(box.herdr, "backups", name)), [
      "sentinel",
    ]);
  }
  const fresh = backups(box).filter((name) => !taken.includes(name));
  assert.equal(fresh.length, 1, `backups: ${backups(box)}`);
  assert.match(fresh[0], /^headroom-\d{8}-\d{6}-\d+$/);
  assert.ok(existsSync(join(box.herdr, "backups", fresh[0], "main.js")));
});

test("a missing Herdr home is refused and not created", (t) => {
  const box = sandbox(t, { home: false });

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 1, result.output);
  assert.match(result.stderr, /install Herdr and start it once/i);
  assert.equal(existsSync(box.herdr), false);
  assert.deepEqual(readdirSync(box.root).sort(), ["bin", "home"]);
  assert.deepEqual(readdirSync(box.home), []);
});

test("the Herdr home defaults to ~/.config/herdr-app", (t) => {
  const box = sandbox(t, { home: false });
  const herdr = join(box.home, ".config", "herdr-app");
  mkdirSync(herdr, { recursive: true });

  const result = run(box, [], { env: { HERDR_APP_HOME: "" } });

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(
    snapshot(join(herdr, "mods", "headroom")),
    snapshot(repoMod, { skipGenerated: true }),
  );
});

test("--dry-run on a first install changes nothing and names each step", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const before = snapshot(box.herdr);

  const result = run(box, ["--dry-run"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.match(result.output, /back up/i);
  assert.match(result.output, /first install/i);
  assert.match(result.output, /copy/i);
  assert.ok(result.output.includes(installed(box)), result.output);
  assert.match(result.output, /check/i);
  assert.match(result.output, /nothing was changed/i);
});

test("--dry-run on a reinstall changes nothing and lists the files that would change", (t) => {
  const box = sandbox(t);
  mkdirSync(installed(box), { recursive: true });
  writeFileSync(join(installed(box), "main.js"), "// older install\n");
  writeFileSync(join(installed(box), "old.js"), "// gone from the repo\n");
  const before = snapshot(box.herdr);

  const result = run(box, ["--dry-run"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.match(result.output, /back up/i);
  assert.ok(result.output.includes(join(box.herdr, "backups")), result.output);
  assert.match(result.output, /changed\s+main\.js/);
  assert.match(result.output, /added\s+mod\.json/);
  assert.match(result.output, /removed\s+old\.js/);
});

test("--dry-run with --layout changes nothing and names the layout", (t) => {
  const box = sandbox(t);
  writeMain(box);
  fakeHerdr(box, 0);
  const before = snapshot(box.herdr);

  const result = run(box, ["--dry-run", "--layout"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.ok(
    result.output.includes(layoutPath(box, "herdr-headroom")),
    result.output,
  );
  assert.equal(existsSync(join(box.root, "herdr-app.args")), false);
});

// Every node of a layout tree, the root first.
function nodes(layout) {
  return [layout, ...(layout.children ?? []).flatMap(nodes)];
}

test("--layout writes herdr-headroom.json: main.json with Limits last in sidebar-lists, sized by the mod", (t) => {
  const box = sandbox(t);
  const main = writeMain(box);

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 0, result.output);
  const text = readFileSync(layoutPath(box, "herdr-headroom"), "utf8");
  const written = JSON.parse(text);
  assert.deepEqual(written, headroomLayout());
  const sidebar = written.children[0];
  assert.deepEqual(
    sidebar.children.map((node) => node.id),
    ["brand", "sidebar-lists", "sidebar-footer"],
  );
  const lists = sidebar.children[1];
  assert.deepEqual(
    lists.children.map((node) => node.id),
    ["spaces", "agents", "headroom"],
  );
  assert.deepEqual(lists.children[2], {
    id: "headroom",
    type: "block",
    size: { px: 111 },
    min: 90,
    content: { mod: "headroom", props: { fit: "headroom" } },
  });
  const work = written.children[1];
  assert.deepEqual(
    work.children.map((node) => node.id),
    ["tabs", "work-body", "status-row"],
  );
  const row = work.children[2];
  assert.equal(row.type, "row");
  assert.deepEqual(row.size, { px: 28 });
  assert.equal("resizable" in row, false, "the boundary keeps its default");
  assert.deepEqual(
    row.children.map((node) => node.id),
    ["status", "headroom-strip"],
  );
  const [status, strip] = row.children;
  assert.deepEqual(status.content, { mod: "workspace-status" });
  assert.deepEqual(status.size, { weight: 3 });
  assert.equal(strip.hidden, true);
  assert.deepEqual(strip.size, { weight: 2 });
  assert.equal(strip.min, 120);
  assert.equal(strip.max, 720);
  assert.deepEqual(strip.content, {
    mod: "headroom",
    props: { form: "strip", fit: "headroom-strip" },
  });
  assert.equal(
    nodes(written).filter((node) => node.content?.mod === "headroom").length,
    2,
  );
  assert.equal(readFileSync(layoutPath(box, "main"), "utf8"), main);
  const said = result.output
    .split("\n")
    .find((line) => line.includes("Add the layout"));
  assert.ok(said, result.output);
  assert.match(said, /headroom last in sidebar-lists/);
  assert.match(said, /headroom-strip/);
  assert.match(said, /beside status/);
  assert.ok(
    result.output.includes("herdr-app do layout.switch --name herdr-headroom"),
    result.output,
  );
  assert.deepEqual(readdirSync(join(box.herdr, "layouts")).sort(), [
    "herdr-headroom.json",
    "main.json",
  ]);
  assert.deepEqual(
    snapshot(installed(box)),
    snapshot(repoMod, { skipGenerated: true }),
  );
});

for (const [args, name] of [
  [["--layout"], "herdr-headroom"],
  [["--layout", "work"], "work"],
]) {
  test(`the printed switch command, run in a shell, names ${name} as one argument`, (t) => {
    const box = sandbox(t);
    writeMain(box);
    const log = fakeHerdr(box, 0);

    const result = run(box, args);

    assert.equal(result.status, 0, result.output);
    const printed = result.output
      .split("\n")
      .find((line) => line.includes("herdr-app do layout.switch"));
    assert.ok(printed, result.output);
    const command = printed.slice(printed.indexOf("herdr-app do"));
    const switched = spawnSync("/bin/sh", ["-c", command], {
      encoding: "utf8",
      env: { PATH: [box.bin, "/usr/bin", "/bin"].join(":") },
    });
    assert.equal(switched.status, 0, switched.stderr);
    assert.deepEqual(readFileSync(log, "utf8").trimEnd().split("\n"), [
      "do",
      "layout.switch",
      "--name",
      name,
    ]);
  });
}

for (const name of ["work", "my_layout-2"]) {
  test(`--layout ${name} writes a layout of that name`, (t) => {
    const box = sandbox(t);
    const main = writeMain(box);

    const result = run(box, ["--layout", name]);

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(
      JSON.parse(readFileSync(layoutPath(box, name), "utf8")),
      headroomLayout(),
    );
    assert.equal(existsSync(layoutPath(box, "herdr-headroom")), false);
    assert.equal(readFileSync(layoutPath(box, "main"), "utf8"), main);
    assert.ok(
      result.output.includes(`herdr-app do layout.switch --name ${name}`),
      result.output,
    );
  });
}

// Herdr switches only to a layout whose name is letters, digits, - and _.
for (const name of ["Herdr Headroom", "a/b", ""]) {
  for (const args of [
    ["--layout", name],
    ["--dry-run", "--layout", name],
  ]) {
    test(`${JSON.stringify(args)} is refused as a usage error and changes nothing`, (t) => {
      const box = sandbox(t);
      writeMain(box);
      assert.equal(run(box).status, 0, "a previous install");
      const before = snapshot(box.herdr);

      const result = run(box, args);

      assert.equal(result.status, 2, result.output);
      assert.match(result.stderr, /usage/i);
      assert.ok(
        result.stderr.includes("letters, digits, - or _"),
        result.stderr,
      );
      assert.deepEqual(readdirSync(join(box.herdr, "layouts")), ["main.json"]);
      assert.deepEqual(snapshot(box.herdr), before);
      assert.deepEqual(backups(box), []);
    });
  }
}

test("a refused name writes no layout on a first install either", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const before = snapshot(box.herdr);

  const result = run(box, ["--layout", "Herdr Headroom"]);

  assert.equal(result.status, 2, result.output);
  assert.ok(result.stderr.includes("letters, digits, - or _"), result.stderr);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.equal(existsSync(installed(box)), false);
});

test("a Herdr Headroom.json an earlier version wrote is left as it is", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const old = '{"id":"root","type":"row","children":[]}\n';
  writeFileSync(layoutPath(box, "Herdr Headroom"), old);

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 0, result.output);
  assert.equal(readFileSync(layoutPath(box, "Herdr Headroom"), "utf8"), old);
  assert.deepEqual(readdirSync(join(box.herdr, "layouts")).sort(), [
    "Herdr Headroom.json",
    "herdr-headroom.json",
    "main.json",
  ]);
});

test("--layout followed by another option uses the default name", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const before = snapshot(box.herdr);

  const result = run(box, ["--layout", "--dry-run"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.ok(
    result.output.includes(layoutPath(box, "herdr-headroom")),
    result.output,
  );
});

test("an existing layout is left byte for byte and the output says so", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const mine = '{"id":"root","type":"row","children":[]}';
  writeFileSync(layoutPath(box, "herdr-headroom"), mine);

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 0, result.output);
  assert.equal(readFileSync(layoutPath(box, "herdr-headroom"), "utf8"), mine);
  assert.match(result.output, /already exists/i);
  assert.ok(
    result.output.includes(layoutPath(box, "herdr-headroom")),
    result.output,
  );
  assert.deepEqual(
    snapshot(installed(box)),
    snapshot(repoMod, { skipGenerated: true }),
  );
});

test("a sidebar-lists with children but no sidebar-footer after it gets a layout", (t) => {
  const box = sandbox(t);
  const main = {
    id: "root",
    type: "row",
    children: [
      {
        id: "sidebar-lists",
        type: "column",
        children: [{ id: "spaces", type: "block", content: { mod: "spaces" } }],
      },
      { id: "main", type: "block", content: { mod: "terminal" } },
    ],
  };
  writeMain(box, main);

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(
    JSON.parse(readFileSync(layoutPath(box, "herdr-headroom"), "utf8")),
    {
      id: "root",
      type: "row",
      children: [
        {
          id: "sidebar-lists",
          type: "column",
          children: [
            { id: "spaces", type: "block", content: { mod: "spaces" } },
            limitsBlock(),
          ],
        },
        { id: "main", type: "block", content: { mod: "terminal" } },
      ],
    },
  );
});

test("a main.json without a status block gets the layout without the strip and says so", (t) => {
  const box = sandbox(t);
  const main = mainLayout();
  main.children[1].children.pop();
  const text = writeMain(box, main);
  // Herdr's layout with Limits and without the status block, by hand.
  const expected = headroomLayout();
  expected.children[1].children.pop();

  const result = run(box, ["--layout"]);

  assert.equal(result.status, 0, result.output);
  const written = JSON.parse(
    readFileSync(layoutPath(box, "herdr-headroom"), "utf8"),
  );
  assert.deepEqual(written, expected);
  assert.deepEqual(
    nodes(written)
      .filter((node) => node.content?.mod === "headroom")
      .map((node) => node.id),
    ["headroom"],
  );
  assert.equal(
    nodes(written).some((node) => node.id === "headroom-strip"),
    false,
  );
  const warned = result.output
    .split("\n")
    .find((line) => line.startsWith("!") && line.includes("Add the layout"));
  assert.ok(warned, result.output);
  assert.match(warned, /no status block/);
  assert.match(warned, /headroom last in sidebar-lists/);
  assert.equal(readFileSync(layoutPath(box, "main"), "utf8"), text);
  assert.ok(
    result.output.includes("herdr-app do layout.switch --name herdr-headroom"),
    result.output,
  );
});

test("--dry-run --layout with a status block changes nothing and names the strip", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const before = snapshot(box.herdr);

  const result = run(box, ["--dry-run", "--layout"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  const said = result.output
    .split("\n")
    .find((line) => line.includes("Add the layout"));
  assert.ok(said, result.output);
  assert.match(said, /would write/);
  assert.match(said, /headroom-strip/);
});

test("a main.json with a headroom-strip node but no status block still says there is no status block", (t) => {
  const box = sandbox(t);
  const main = mainLayout();
  main.children[1].children.pop();
  const lists = nodes(main).find((node) => node.id === "sidebar-lists");
  lists.children.push({
    id: "headroom-strip",
    type: "block",
    content: { mod: "spaces" },
  });
  writeMain(box, main);

  const result = run(box, ["--dry-run", "--layout"]);

  assert.equal(result.status, 0, result.output);
  const said = result.output
    .split("\n")
    .find((line) => line.includes("Add the layout"));
  assert.ok(said, result.output);
  assert.ok(said.startsWith("!"), said);
  assert.match(said, /would write/);
  assert.match(said, /no status block/);
  assert.doesNotMatch(said, /beside status/);
});

test("an existing layout of that name is untouched when main.json has a status block", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const mine = Buffer.from('{"id":"root","children":[]}\n\u00ff', "latin1");
  writeFileSync(layoutPath(box, "work"), mine);

  const result = run(box, ["--layout", "work"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(readFileSync(layoutPath(box, "work")), mine);
  assert.match(result.output, /already exists/i);
  assert.equal(existsSync(layoutPath(box, "herdr-headroom")), false);
});

for (const [what, main, said] of [
  [
    "has no sidebar-lists node",
    {
      id: "root",
      type: "row",
      children: [
        {
          id: "sidebar",
          type: "column",
          children: [{ id: "sidebar-footer", type: "block" }],
        },
        { id: "main", type: "block" },
      ],
    },
    /sidebar-lists/,
  ],
  [
    "has a sidebar-lists without children",
    {
      id: "root",
      type: "row",
      children: [
        {
          id: "sidebar",
          type: "column",
          children: [
            { id: "sidebar-lists", type: "column", children: [] },
            { id: "sidebar-footer", type: "block" },
          ],
        },
      ],
    },
    /sidebar-lists/,
  ],
  [
    "has a sidebar-lists with no children array",
    {
      id: "root",
      type: "row",
      children: [{ id: "sidebar-lists", type: "block" }],
    },
    /sidebar-lists/,
  ],
  ["is not valid JSON", '{"id": "root", ', /not valid JSON/i],
  ["is missing", null, /main\.json/],
]) {
  test(`a main.json that ${what} writes no layout and still installs the mod`, (t) => {
    const box = sandbox(t);
    let text = null;
    if (main !== null) text = writeMain(box, main);

    const result = run(box, ["--layout"]);

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, said);
    assert.match(result.output, /no layout/i);
    assert.equal(existsSync(layoutPath(box, "herdr-headroom")), false);
    if (text !== null) {
      assert.equal(readFileSync(layoutPath(box, "main"), "utf8"), text);
    }
    assert.deepEqual(
      snapshot(installed(box)),
      snapshot(repoMod, { skipGenerated: true }),
    );
  });
}

test("the vault is never touched nor backed up", (t) => {
  const box = sandbox(t);
  writeMain(box);
  const vault = writeVault(box);

  assert.equal(run(box).status, 0);
  assertVault(vault);

  const reinstall = run(box);
  assert.equal(reinstall.status, 0, reinstall.output);
  assertVault(vault);

  const layout = run(box, ["--layout"]);
  assert.equal(layout.status, 0, layout.output);
  assertVault(vault);

  assert.equal(backups(box).length, 2, `backups: ${backups(box)}`);
  const backedUp = Object.values(snapshot(join(box.herdr, "backups")));
  assert.ok(
    !backedUp.includes(vault.bytes.toString("base64")),
    "the vault's bytes are in a backup",
  );
  assert.deepEqual(readdirSync(join(box.herdr, "headroom")), ["vault.json"]);
});

test("herdr-app check runs on the installed mod", (t) => {
  const box = sandbox(t);
  const log = fakeHerdr(box, 0);

  const result = run(box);

  assert.equal(result.status, 0, result.output);
  assert.equal(readFileSync(log, "utf8"), `check\n${installed(box)}\n`);
  assert.match(result.output, /check passed/i);
});

test("a failing herdr-app check fails the install and shows what it said", (t) => {
  const box = sandbox(t);
  fakeHerdr(box, 1, "main.js: render is not a function");

  const result = run(box);

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /render is not a function/);
});

test("without herdr-app the check is skipped", (t) => {
  const box = sandbox(t);

  const result = run(box);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /herdr-app/);
  assert.match(result.output, /skipped/i);
});

test("without a terminal or with NO_COLOR the output has no colors", (t) => {
  const box = sandbox(t);

  const plain = run(box);
  const noColor = run(box, [], { env: { NO_COLOR: "1" } });

  assert.equal(plain.status, 0, plain.output);
  assert.equal(noColor.status, 0, noColor.output);
  assert.doesNotMatch(plain.output, /\x1b\[/);
  assert.doesNotMatch(noColor.output, /\x1b\[/);
});

for (const args of [["--force"], ["extra"], ["--layout", "a", "b"]]) {
  test(`${args.join(" ")} exits 2 with the usage`, (t) => {
    const box = sandbox(t);

    const result = run(box, args);

    assert.equal(result.status, 2, result.output);
    assert.match(result.stderr, /usage/i);
    assert.equal(existsSync(installed(box)), false);
  });
}
