import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createStore } from "../mods/headroom/logic/store.js";
import { createVault } from "../mods/headroom/logic/vault.js";
import * as codex from "../mods/headroom/providers/codex.js";
import { NOW, fakeHost, loginIo } from "./helpers/fakes.mjs";

const HOME = "/home/test/.config/herdr-app";
const FOLDER = `${HOME}/headroom`;
const VAULT = `${FOLDER}/vault.json`;

const MAXI = {
  accountId: "acct-maxi",
  organizationId: "org-maxi",
  email: "maxi@example.com",
  organization: null,
  plan: "Max",
};
const TERAC = {
  accountId: "acct-maxi",
  organizationId: "org-terac",
  email: "maxi@example.com",
  organization: "Terac",
  plan: "Team",
};
const MAXI_ID = "acme:acct-maxi:org-maxi";
const TERAC_ID = "acme:acct-maxi:org-terac";

// The `n`th sign-in, as the identity `identity`.
const signIn = (n, identity = MAXI) => ({
  ok: true,
  credentials: {
    accessToken: `access-secret-${n}`,
    refreshToken: `refresh-secret-${n}`,
    expiresAt: NOW + 3600000 + n,
    signedInAt: NOW + n,
    identity,
  },
});

// A provider whose sign-ins answer `logins` in turn and whose reads find no
// windows.
function acme(logins) {
  return {
    acme: {
      id: "acme",
      name: "Acme",
      loginTtlMs: null,
      login: async () => logins.shift() ?? { ok: false, kind: "cancelled" },
      read: async () => ({ ok: true, windows: [], plan: null }),
    },
  };
}

// A program answering as on a machine where every file is 0600.
const privateExec = (command) =>
  command === "stat"
    ? { code: 0, stdout: "600\n", stderr: "" }
    : { code: 0, stdout: "", stderr: "" };

const published = (host) => host.state["headroom.readings"].accounts;

const run = promisify(execFile);

// A fake host whose programs and files are real, under `home`; a write
// replaces the file atomically, as Herdr's does, which leaves it 0644.
function realHost(home, options = {}) {
  const host = fakeHost({
    home,
    platform: process.platform === "darwin" ? "macos" : "linux",
    ...options,
  });
  host.exec = async (command, args) => {
    host.commands.push([command, args]);
    try {
      const { stdout, stderr } = await run(command, args);
      return { code: 0, stdout, stderr };
    } catch (error) {
      return {
        code: typeof error.code === "number" ? error.code : 1,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? "",
      };
    }
  };
  host.readText = async (path) => {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  };
  host.writeText = async (path, text, expected) => {
    if ((await host.readText(path)) !== expected) {
      throw new Error(`stale snapshot: ${path}`);
    }
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, text, { mode: 0o644 });
    await rename(temporary, path);
    return null;
  };
  return host;
}

const modeOf = async (path) => (await stat(path)).mode & 0o777;

async function temporaryHome(t) {
  const home = await mkdtemp(join(tmpdir(), "headroom-vault-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  return home;
}

test("on a real file system the vault is 0700 and 0600 and brings the account back", async (t) => {
  const home = await temporaryHome(t);
  const host = realHost(home);
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  assert.deepEqual(await store.connect("acme", {}), { ok: true, id: MAXI_ID });
  assert.equal(await modeOf(join(home, "headroom")), 0o700);
  assert.equal(await modeOf(join(home, "headroom", "vault.json")), 0o600);

  assert.deepEqual(await store.rename(MAXI_ID, "Home"), { ok: true });
  assert.equal(await modeOf(join(home, "headroom", "vault.json")), 0o600);

  const again = createStore(realHost(home), { providers: acme([]) });
  await again.start();
  assert.deepEqual(again.accounts(), [
    {
      id: MAXI_ID,
      provider: "acme",
      label: "Home",
      email: "maxi@example.com",
      organization: null,
      plan: "Max",
      signedInAt: NOW + 1,
    },
  ]);
});

test("starting the store with no vault file creates nothing", async (t) => {
  const home = await temporaryHome(t);
  const host = realHost(home);
  const store = createStore(host, { providers: acme([]) });
  await store.start();
  assert.deepEqual(await readdir(home), []);
  assert.deepEqual(host.commands, []);
  assert.deepEqual(store.accounts(), []);
});

test("the first save makes the folder and an empty 0600 file before any token", async () => {
  const host = fakeHost({ exec: privateExec });
  const writes = [];
  const write = host.writeText;
  host.writeText = async (path, text, expected) => {
    writes.push([path, text, expected, host.commands.length]);
    return write(path, text, expected);
  };
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  assert.deepEqual(await store.connect("acme", {}), { ok: true, id: MAXI_ID });
  assert.deepEqual(host.commands, [
    ["mkdir", ["-p", FOLDER]],
    ["chmod", ["700", FOLDER]],
    ["chmod", ["600", VAULT]],
    ["stat", ["-f", "%Lp", VAULT]],
    ["stat", ["-f", "%Lp", VAULT]],
  ]);
  assert.deepEqual(
    writes.map(([path, text, expected, after]) => [
      path,
      text === "",
      expected,
      after,
    ]),
    [
      [VAULT, true, null, 2],
      [VAULT, false, "", 4],
    ],
  );
  const saved = JSON.parse(host.files[VAULT]);
  assert.deepEqual(saved, {
    version: 1,
    accounts: [
      {
        id: MAXI_ID,
        provider: "acme",
        label: "maxi",
        position: 0,
        accessToken: "access-secret-1",
        refreshToken: "refresh-secret-1",
        expiresAt: NOW + 3600001,
        signedInAt: NOW + 1,
        identity: MAXI,
      },
    ],
  });
});

test("on Linux the mode is read with stat -c", async () => {
  const host = fakeHost({ platform: "linux", exec: privateExec });
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  await store.connect("acme", {});
  assert.deepEqual(
    host.commands.filter(([command]) => command === "stat"),
    [
      ["stat", ["-c", "%a", VAULT]],
      ["stat", ["-c", "%a", VAULT]],
    ],
  );
});

test("a mode reset by a later save is repaired with chmod 600", async () => {
  let mode = "600";
  const host = fakeHost({
    exec: (command, args) => {
      if (command === "chmod" && args[0] === "600") mode = "600";
      return command === "stat"
        ? { code: 0, stdout: `${mode}\n`, stderr: "" }
        : { code: 0, stdout: "", stderr: "" };
    },
  });
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  await store.connect("acme", {});
  mode = "644";
  host.commands.length = 0;
  assert.deepEqual(await store.rename(MAXI_ID, "Home"), { ok: true });
  assert.deepEqual(host.commands, [
    ["stat", ["-f", "%Lp", VAULT]],
    ["chmod", ["600", VAULT]],
    ["stat", ["-f", "%Lp", VAULT]],
  ]);
});

test("connecting an identity twice keeps one account with the new login and the old label and position", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC), signIn(3)]),
  });
  await store.start();
  await store.connect("acme", {});
  await store.connect("acme", {});
  assert.deepEqual(await store.rename(MAXI_ID, "Home"), { ok: true });
  assert.deepEqual(await store.connect("acme", {}), { ok: true, id: MAXI_ID });

  const accounts = await createVault(host).load();
  assert.deepEqual(accounts, [
    {
      id: MAXI_ID,
      provider: "acme",
      label: "Home",
      position: 0,
      accessToken: "access-secret-3",
      refreshToken: "refresh-secret-3",
      expiresAt: NOW + 3600003,
      signedInAt: NOW + 3,
      identity: MAXI,
    },
    {
      id: TERAC_ID,
      provider: "acme",
      label: "maxi · Terac",
      position: 1,
      accessToken: "access-secret-2",
      refreshToken: "refresh-secret-2",
      expiresAt: NOW + 3600002,
      signedInAt: NOW + 2,
      identity: TERAC,
    },
  ]);
  assert.equal(host.files[VAULT].includes("access-secret-1"), false);
  assert.deepEqual(
    published(host).map((reading) => [reading.id, reading.label]),
    [
      [MAXI_ID, "Home"],
      [TERAC_ID, "maxi · Terac"],
    ],
  );
});

test("remove deletes the account's tokens and its reading", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC)]),
  });
  await store.start();
  await store.connect("acme", {});
  await store.connect("acme", {});
  assert.deepEqual(await store.remove(MAXI_ID), { ok: true });
  const text = host.files[VAULT];
  assert.equal(text.includes("access-secret-1"), false);
  assert.equal(text.includes("refresh-secret-1"), false);
  assert.equal(text.includes("access-secret-2"), true);
  assert.deepEqual(
    published(host).map((reading) => reading.id),
    [TERAC_ID],
  );
  assert.deepEqual(
    store.accounts().map((item) => [item.id, item.label]),
    [[TERAC_ID, "maxi · Terac"]],
  );
  const [only] = await createVault(host).load();
  assert.equal(only.position, 0);
});

test("rename and move publish the readings in order with their labels", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC)]),
  });
  await store.start();
  await store.connect("acme", {});
  await store.connect("acme", {});
  assert.deepEqual(await store.move(TERAC_ID, -1), { ok: true });
  assert.deepEqual(await store.rename(MAXI_ID, "  Home "), { ok: true });
  assert.deepEqual(
    published(host).map((reading) => [reading.id, reading.label]),
    [
      [TERAC_ID, "maxi · Terac"],
      [MAXI_ID, "Home"],
    ],
  );
  assert.deepEqual(
    store.accounts().map((item) => [item.id, item.label]),
    [
      [TERAC_ID, "maxi · Terac"],
      [MAXI_ID, "Home"],
    ],
  );
});

test("start brings the accounts back in position order", async () => {
  const host = fakeHost({ exec: privateExec });
  const stored = (id, label, position, identity) => ({
    id,
    provider: "acme",
    label,
    position,
    accessToken: "a",
    refreshToken: "r",
    expiresAt: NOW,
    signedInAt: NOW,
    identity,
  });
  host.files[VAULT] = JSON.stringify({
    version: 1,
    accounts: [
      stored(MAXI_ID, "maxi", 1, MAXI),
      stored(TERAC_ID, "Work", 0, TERAC),
    ],
  });
  const store = createStore(host, { providers: acme([]) });
  await store.start();
  assert.deepEqual(
    store.accounts().map((item) => [item.id, item.label]),
    [
      [TERAC_ID, "Work"],
      [MAXI_ID, "maxi"],
    ],
  );
  assert.deepEqual(
    published(host).map((reading) => [reading.id, reading.label]),
    [
      [TERAC_ID, "Work"],
      [MAXI_ID, "maxi"],
    ],
  );
});

test("a file that is not a vault gives no accounts and creates nothing", async () => {
  for (const text of ["not json", '{"version":2,"accounts":[]}', "[]"]) {
    const host = fakeHost({ exec: privateExec });
    host.files[VAULT] = text;
    assert.deepEqual(await createVault(host).load(), []);
    assert.deepEqual(host.files, { [VAULT]: text });
    assert.deepEqual(host.commands, []);
  }
  const empty = fakeHost();
  assert.deepEqual(await createVault(empty).load(), []);
  assert.deepEqual(empty.files, {});
});

test("a failed write leaves the previous vault whole", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC)]),
  });
  await store.start();
  await store.connect("acme", {});
  const before = host.files[VAULT];
  host.writeText = async (path, text) => {
    throw new Error(`disk full writing ${path}: ${text}`);
  };
  assert.deepEqual(await store.rename(MAXI_ID, "Home"), {
    ok: false,
    kind: "vault",
  });
  assert.deepEqual(await store.connect("acme", {}), {
    ok: false,
    kind: "vault",
  });
  assert.equal(host.files[VAULT], before);
  assert.deepEqual(await createVault(host).load(), [
    {
      id: MAXI_ID,
      provider: "acme",
      label: "maxi",
      position: 0,
      accessToken: "access-secret-1",
      refreshToken: "refresh-secret-1",
      expiresAt: NOW + 3600001,
      signedInAt: NOW + 1,
      identity: MAXI,
    },
  ]);
  assert.deepEqual(
    store.accounts().map((item) => [item.id, item.label]),
    [[MAXI_ID, "maxi"]],
  );
});

test("a stale snapshot is read again and written once more", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  await store.connect("acme", {});
  // Another copy of the mod wrote the file meanwhile.
  host.files[VAULT] = host.files[VAULT].replace('"maxi"', '"Elsewhere"');
  assert.deepEqual(await store.rename(MAXI_ID, "Home"), { ok: true });
  const [only] = await createVault(host).load();
  assert.equal(only.label, "Home");
});

test("a file that cannot be made 0600 keeps no token", async () => {
  const host = fakeHost({
    exec: (command) =>
      command === "stat"
        ? { code: 0, stdout: "644\n", stderr: "" }
        : { code: 0, stdout: "", stderr: "" },
  });
  const store = createStore(host, { providers: acme([signIn(1)]) });
  await store.start();
  assert.deepEqual(await store.connect("acme", {}), {
    ok: false,
    kind: "vault",
  });
  const text = host.files[VAULT] ?? "";
  assert.equal(text.includes("access-secret-1"), false);
  assert.equal(text.includes("refresh-secret-1"), false);
  assert.deepEqual(store.accounts(), []);
  assert.deepEqual(published(host), []);
});

test("a file that loses 0600 on a later save is left with no token", async () => {
  let refuse = false;
  const host = fakeHost({
    exec: (command) =>
      command === "stat"
        ? { code: 0, stdout: refuse ? "644\n" : "600\n", stderr: "" }
        : { code: 0, stdout: "", stderr: "" },
  });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC)]),
  });
  await store.start();
  await store.connect("acme", {});
  refuse = true;
  assert.deepEqual(await store.connect("acme", {}), {
    ok: false,
    kind: "vault",
  });
  assert.equal(host.files[VAULT], "");
  assert.deepEqual(
    store.accounts().map((item) => item.id),
    [MAXI_ID],
  );
});

test("changes to the vault run one at a time", async () => {
  const host = fakeHost({ exec: privateExec });
  const store = createStore(host, {
    providers: acme([signIn(1), signIn(2, TERAC)]),
  });
  await store.start();
  await store.connect("acme", {});
  await store.connect("acme", {});
  let writing = 0;
  let most = 0;
  const write = host.writeText;
  host.writeText = async (path, text, expected) => {
    writing += 1;
    most = Math.max(most, writing);
    await new Promise((resolve) => setTimeout(resolve, 5));
    try {
      return await write(path, text, expected);
    } finally {
      writing -= 1;
    }
  };
  const results = await Promise.all([
    store.rename(MAXI_ID, "Home"),
    store.move(TERAC_ID, -1),
  ]);
  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
  assert.equal(most, 1);
  assert.deepEqual(
    (await createVault(host).load()).map((item) => [item.id, item.label]),
    [
      [TERAC_ID, "maxi · Terac"],
      [MAXI_ID, "Home"],
    ],
  );
});

// --- No token leaks, for every failure, through Codex's real adapter.

const USERCODE = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const POLL = "https://auth.openai.com/api/accounts/deviceauth/token";
const EXCHANGE = "https://auth.openai.com/oauth/token";
const USAGE = "https://chatgpt.com/backend-api/wham/usage";

const jwt = (claims) =>
  [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify(claims)).toString("base64url"),
    "signature",
  ].join(".");

const ACCESS = jwt({
  "https://api.openai.com/auth": {
    chatgpt_account_id: "acct-1",
    chatgpt_plan_type: "plus",
  },
  "https://api.openai.com/profile": { email: "maxi@example.com" },
});
const ID_TOKEN = jwt({ sub: "user-1" });
const SECRETS = [ACCESS, ID_TOKEN, "refresh-secret-1"];
const LEAKY = `${ACCESS} ${ID_TOKEN} refresh-secret-1`;

function openai({ exchange, usage }) {
  return (request) => {
    switch (request.url) {
      case USERCODE:
        return {
          status: 200,
          body: { device_auth_id: "d", user_code: "C", interval: "5" },
        };
      case POLL:
        return {
          status: 200,
          body: { authorization_code: "code", code_verifier: "verifier" },
        };
      case EXCHANGE:
        return exchange
          ? exchange()
          : {
              status: 200,
              body: {
                access_token: ACCESS,
                refresh_token: "refresh-secret-1",
                id_token: ID_TOKEN,
                expires_in: 3600,
              },
            };
      case USAGE:
        return usage
          ? usage()
          : { status: 200, body: { plan_type: "plus", rate_limit: {} } };
      default:
        return { status: 404 };
    }
  };
}

const FIXTURES = {
  "a refused vault": {
    exec: (command) =>
      command === "stat"
        ? { code: 0, stdout: "644\n", stderr: "" }
        : { code: 0, stdout: "", stderr: "" },
  },
  "a failed write": {
    exec: privateExec,
    prepare(host) {
      host.writeText = async (path, text) => {
        throw new Error(`cannot write ${path}: ${text}`);
      };
    },
  },
  "a failed sign-in": {
    exec: privateExec,
    exchange: () => ({ status: 500, body: { error: LEAKY } }),
  },
  "a read answering 401": {
    exec: privateExec,
    usage: () => ({ status: 401, body: { error: LEAKY } }),
  },
  "a read answering 500": {
    exec: privateExec,
    usage: () => ({ status: 500, body: LEAKY }),
  },
  "a rejected fetch": {
    exec: privateExec,
    usage: () => {
      throw new TypeError(`network down: ${LEAKY}`);
    },
  },
};

for (const [name, fixture] of Object.entries(FIXTURES)) {
  test(`no token leaks on ${name}`, async (t) => {
    const logged = [];
    for (const level of ["log", "info", "warn", "error", "debug"]) {
      t.mock.method(console, level, (...args) => logged.push(args));
    }
    const host = fakeHost({
      exec: fixture.exec,
      respond: openai(fixture),
    });
    fixture.prepare?.(host);
    const store = createStore(host, { providers: { codex } });
    const said = [];
    const attempt = async (job) => {
      try {
        said.push(await job());
      } catch (error) {
        said.push(String(error), error?.stack ?? "");
      }
    };
    await attempt(() => store.start());
    await attempt(() => store.connect("codex", loginIo(host)));
    const [first] = store.accounts();
    if (first) {
      await attempt(() => store.refresh());
      await attempt(() => store.rename(first.id, "Home"));
      await attempt(() => store.move(first.id, 1));
      await attempt(() => store.remove(first.id));
    }
    const seen = {
      shared: JSON.stringify(host.sets),
      notified: JSON.stringify(host.toasts),
      programs: JSON.stringify(host.commands),
      said: JSON.stringify(said),
      logged: logged.map((args) => args.map(String).join(" ")).join("\n"),
    };
    for (const [where, text] of Object.entries(seen)) {
      for (const secret of SECRETS) {
        assert.equal(
          text.includes(secret),
          false,
          `a token reached ${where} on ${name}`,
        );
      }
    }
  });
}
