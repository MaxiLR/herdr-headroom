import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
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

// The folder a tool the scripts need is in.
function toolDir(name) {
  const found = spawnSync("/bin/sh", ["-c", `command -v ${name}`], {
    encoding: "utf8",
  });
  const path = found.stdout.trim();
  assert.ok(path, `${name} must be installed to run the command tests`);
  return path.slice(0, path.lastIndexOf("/"));
}
const toolPath = [toolDir("jq"), toolDir("git"), "/usr/bin", "/bin"].join(":");

// A fresh temporary folder holding the Herdr home and HOME.
function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), "headroom-command-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const box = {
    root,
    herdr: join(root, "herdr-app"),
    home: join(root, "home"),
  };
  mkdirSync(box.herdr);
  mkdirSync(box.home);
  return box;
}

// Runs a program with HOME and the Herdr home in the sandbox, and no git
// configuration but its own.
function exec(box, file, args = [], { cwd = box.root, env = {} } = {}) {
  const result = spawnSync(file, args, {
    encoding: "utf8",
    cwd,
    env: {
      HERDR_APP_HOME: box.herdr,
      HOME: box.home,
      PATH: toolPath,
      TZ: "UTC",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
      ...env,
    },
  });
  assert.equal(result.error, undefined, String(result.error));
  return { ...result, output: result.stdout + result.stderr };
}

function git(box, dir, ...args) {
  const result = exec(box, "git", ["-C", dir, ...args]);
  assert.equal(result.status, 0, result.output);
  return result.stdout.trim();
}

function binDir(box) {
  return join(box.home, ".local", "bin");
}

function command(box) {
  return join(binDir(box), "headroom");
}

function installed(box) {
  return join(box.herdr, "mods", "headroom");
}

function backups(box) {
  const dir = join(box.herdr, "backups");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

// Every file under dir with its content, keyed by relative path; folders end
// in "/" so an empty folder counts too.
function snapshot(dir) {
  const files = {};
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
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

// A copy of this checkout's scripts/ and mods/headroom/. The default name has
// a space and a quote: a path the command has to carry whole.
function checkout(box, name = "check out's") {
  const dir = join(box.root, name);
  for (const part of [["scripts"], ["mods", "headroom"]]) {
    cpSync(join(moduleDir, ...part), join(dir, ...part), { recursive: true });
  }
  return dir;
}

function install(box, dir, args = [], options) {
  const result = exec(box, join(dir, "scripts", "install.sh"), args, options);
  assert.equal(result.status, 0, result.output);
  return result;
}

function commit(box, dir, file, text) {
  writeFileSync(join(dir, "mods", "headroom", file), text);
  git(box, dir, "add", "-A");
  git(box, dir, "commit", "-q", "-m", `add ${file}`);
}

// An origin repository holding the checkout's files, and a clone of it with
// the mod installed from the clone.
function cloned(box) {
  const origin = checkout(box, "origin");
  git(box, origin, "init", "-q", "-b", "main");
  git(box, origin, "add", "-A");
  git(box, origin, "commit", "-q", "-m", "first");
  const clone = join(box.root, "check out's");
  git(box, box.root, "clone", "-q", origin, clone);
  install(box, clone);
  return { origin, clone };
}

test("an install writes ~/.local/bin/headroom, executable, and names the step", (t) => {
  const box = sandbox(t);

  const result = exec(box, script);

  assert.equal(result.status, 0, result.output);
  assert.ok(statSync(command(box)).mode & 0o100, "the command is executable");
  assert.match(result.output, /headroom command/i);
  assert.ok(result.output.includes(command(box)), result.output);
  // Nothing else appears in HOME: no rc file, no other folder.
  assert.deepEqual(Object.keys(snapshot(box.home)), [
    ".local/",
    ".local/bin/",
    ".local/bin/headroom",
  ]);
  // The command reaches this checkout's scripts/headroom.
  const ran = exec(box, command(box), [], { cwd: box.home });
  assert.equal(ran.status, 2, ran.output);
  assert.match(ran.output, /usage: headroom update/);
});

test("headroom update, from any directory, pulls the checkout and installs what it pulled", (t) => {
  const box = sandbox(t);
  const { origin, clone } = cloned(box);
  commit(box, origin, "newer.js", "// a newer version\n");

  const result = exec(box, command(box), ["update"], { cwd: box.home });

  assert.equal(result.status, 0, result.output);
  assert.equal(
    git(box, clone, "rev-parse", "HEAD"),
    git(box, origin, "rev-parse", "HEAD"),
  );
  assert.equal(
    readFileSync(join(installed(box), "newer.js"), "utf8"),
    "// a newer version\n",
  );
  assert.equal(backups(box).length, 1, "the previous install is backed up");
});

test("headroom update with nothing to pull installs the checkout again", (t) => {
  const box = sandbox(t);
  cloned(box);

  const result = exec(box, command(box), ["update"], { cwd: box.home });

  assert.equal(result.status, 0, result.output);
  assert.equal(backups(box).length, 1, result.output);
  assert.match(result.output, /no file differs/i);
});

test("a pull that cannot fast-forward installs nothing and exits 1", (t) => {
  const box = sandbox(t);
  const { origin, clone } = cloned(box);
  commit(box, origin, "theirs.js", "// on the remote\n");
  commit(box, clone, "ours.js", "// only here\n");
  const before = snapshot(box.herdr);

  const result = exec(box, command(box), ["update"], { cwd: box.home });

  assert.equal(result.status, 1, result.output);
  assert.deepEqual(snapshot(box.herdr), before);
  assert.match(result.output, /fast-forward/i, "git's reason is shown");
  assert.match(result.output, /nothing was installed/i);
});

test("without HOME the mod is installed and the step says no command is written", (t) => {
  const box = sandbox(t);

  const result = exec(box, script, [], { env: { HOME: undefined } });

  assert.equal(result.status, 0, result.output);
  assert.ok(existsSync(join(installed(box), "mod.json")), result.output);
  assert.match(result.output, /HOME is not set/);
  assert.deepEqual(snapshot(box.home), {});
});

test("headroom with anything but update prints the usage, exits 2 and changes nothing", (t) => {
  const box = sandbox(t);
  install(box, checkout(box));
  const before = snapshot(box.herdr);

  for (const args of [[], ["upgrade"], ["update", "--layout"]]) {
    const result = exec(box, command(box), args, { cwd: box.home });

    assert.equal(result.status, 2, `${args.join(" ")}: ${result.output}`);
    assert.match(result.output, /usage: headroom update/);
    assert.deepEqual(snapshot(box.herdr), before);
  }
});

test("a headroom file the installer did not write is left byte for byte, said, and the mod is installed", (t) => {
  const box = sandbox(t);
  const mine = "#!/bin/sh\necho mine\n";
  mkdirSync(binDir(box), { recursive: true });
  writeFileSync(command(box), mine);

  const result = exec(box, script);

  assert.equal(result.status, 0, result.output);
  assert.equal(readFileSync(command(box), "utf8"), mine);
  assert.match(result.output, /left as it is/i);
  assert.ok(existsSync(join(installed(box), "mod.json")), result.output);
});

test("--dry-run writes no command and names the one it would write", (t) => {
  const box = sandbox(t);
  const before = snapshot(box.home);

  const result = exec(box, script, ["--dry-run"]);

  assert.equal(result.status, 0, result.output);
  assert.deepEqual(snapshot(box.home), before);
  assert.match(result.output, /would write/i);
  assert.ok(result.output.includes(command(box)), result.output);
});

test("the command says when its checkout is gone, names the fix and exits 1", (t) => {
  const box = sandbox(t);
  const dir = checkout(box);
  install(box, dir);
  rmSync(dir, { recursive: true });
  const before = snapshot(box.herdr);

  const result = exec(box, command(box), ["update"], { cwd: box.home });

  assert.equal(result.status, 1, result.output);
  assert.ok(result.output.includes(dir), result.output);
  assert.match(result.output, /scripts\/install\.sh/);
  assert.deepEqual(snapshot(box.herdr), before);
});

test("an install from another checkout points the command at that one", (t) => {
  const box = sandbox(t);
  const first = checkout(box, "first");
  const second = checkout(box, "second");
  install(box, first);
  install(box, second);
  rmSync(first, { recursive: true });

  const result = exec(box, command(box), [], { cwd: box.home });

  assert.equal(result.status, 2, result.output);
  assert.match(result.output, /usage: headroom update/);
});

test("the step says when ~/.local/bin is not on PATH, and only then", (t) => {
  const off = sandbox(t);
  const on = sandbox(t);
  const notOnPath = /\.local\/bin is not on PATH/;

  const without = exec(off, script);
  const withIt = exec(on, script, [], {
    env: { PATH: `${binDir(on)}:${toolPath}` },
  });

  assert.equal(without.status, 0, without.output);
  assert.match(without.output, notOnPath);
  assert.equal(withIt.status, 0, withIt.output);
  assert.doesNotMatch(withIt.output, notOnPath);
  assert.ok(existsSync(command(on)), withIt.output);
});
