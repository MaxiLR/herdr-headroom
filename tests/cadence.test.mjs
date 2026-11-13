// How often `tick` reads an account: every 5 minutes while it is idle, at its
// provider's active interval while its numbers move, an agent works or a
// window nears its limit, and 5 minutes after a failed read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "../mods/headroom/logic/store.js";
import { NOW, fakeHost, win } from "./helpers/fakes.mjs";
import {
  ACTIVE_EVERY_MS,
  MINUTE,
  VAULT,
  assertNoToken,
  setup,
  usageOk,
  usageRequests,
} from "./helpers/acme.mjs";

const FAR = NOW + 4 * 24 * 60 * MINUTE;

// Weekly at 41 % and 5-hour at `short`, both resetting in four days.
const windowsAt = (short, overrides) => [
  win("7d", 0.41, FAR),
  win("5h", short, FAR, overrides),
];

// A store whose usage endpoint answers `answers` in turn, the last one for
// every read after.
function scripted(answers) {
  let reads = 0;
  return setup({
    usage: () => answers[Math.min(reads++, answers.length - 1)],
  });
}

// How many reads were made once `minutes` more have passed and `tick` ran.
async function readsAfter(host, store, minutes) {
  host.clock.now += minutes * MINUTE;
  await store.tick();
  return usageRequests(host).length;
}

test("an account whose numbers moved is read at its active interval until they stop", async () => {
  const { host, store } = scripted([
    usageOk(windowsAt(0.2)),
    usageOk(windowsAt(0.23)),
    usageOk(windowsAt(0.23)),
  ]);
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  // Not moving yet: 5 minutes.
  assert.equal(await readsAfter(host, store, 4), 1);
  assert.equal(await readsAfter(host, store, 1), 2);
  // 20 % became 23 %: 2 minutes.
  assert.equal(await readsAfter(host, store, 1), 2);
  assert.equal(await readsAfter(host, store, 1), 3);
  // 23 % stayed 23 %: 5 minutes again.
  assert.equal(await readsAfter(host, store, 4), 3);
  assert.equal(await readsAfter(host, store, 1), 4);
  assertNoToken(host);
});

test("a window that started counts as moved", async () => {
  const { host, store } = scripted([
    usageOk([win("7d", 0.41, FAR), win("5h", 0, null)]),
    usageOk([win("7d", 0.41, FAR), win("5h", 0, NOW + 5 * 60 * MINUTE)]),
  ]);
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 5), 2);
  assert.equal(await readsAfter(host, store, 2), 3);
});

test("a reset time that drifts by milliseconds does not count as moved", async () => {
  let reads = 0;
  const { host, store } = setup({
    usage: () => {
      reads += 1;
      return usageOk([
        win("7d", 0.41, FAR + reads * 532),
        win("5h", 0.2, FAR + reads * 532),
      ]);
    },
  });
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 5), 2);
  assert.equal(await readsAfter(host, store, 4), 2);
  assert.equal(await readsAfter(host, store, 1), 3);
});

test("while an agent works an account is read at its active interval", async () => {
  const { host, store } = setup();
  host.busy = true;
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 1), 1);
  assert.equal(await readsAfter(host, store, 1), 2);
  // The agent stopped, the numbers did not move: 5 minutes.
  host.busy = false;
  assert.equal(await readsAfter(host, store, 4), 2);
  assert.equal(await readsAfter(host, store, 1), 3);
  assertNoToken(host);
});

test("an account with a window from 75% is read at its active interval", async () => {
  const { host, store } = setup({ usage: () => usageOk(windowsAt(0.75)) });
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 1), 1);
  assert.equal(await readsAfter(host, store, 1), 2);
  assert.equal(await readsAfter(host, store, 2), 3);
});

test("an account at 74% that does not move is read every 5 minutes", async () => {
  const { host, store } = setup({ usage: () => usageOk(windowsAt(0.74)) });
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 4), 1);
  assert.equal(await readsAfter(host, store, 1), 2);
});

test("an account at its limit is read every 5 minutes: nothing moves before the reset", async () => {
  for (const windows of [windowsAt(1), windowsAt(0.97, { atLimit: true })]) {
    const { host, store } = setup({ usage: () => usageOk(windows) });
    await store.start();
    assert.equal(await readsAfter(host, store, 0), 1);
    assert.equal(await readsAfter(host, store, 4), 1);
    assert.equal(await readsAfter(host, store, 1), 2);
  }
});

test("after a failed read the next is 5 minutes later, even while an agent works", async () => {
  const { host, store } = scripted([usageOk(), { status: 429 }, usageOk()]);
  host.busy = true;
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 2), 2);
  // That read failed.
  assert.equal(await readsAfter(host, store, 2), 2);
  assert.equal(await readsAfter(host, store, 2), 2);
  assert.equal(await readsAfter(host, store, 1), 3);
  // It worked again: back to 2 minutes.
  assert.equal(await readsAfter(host, store, 2), 4);
  assertNoToken(host);
});

test("after a failed read a window near its limit does not bring the next read forward", async () => {
  const { host, store } = scripted([
    usageOk(windowsAt(0.8)),
    { status: 500 },
    usageOk(windowsAt(0.8)),
  ]);
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 2), 2);
  // That read failed.
  assert.equal(await readsAfter(host, store, 4), 2);
  assert.equal(await readsAfter(host, store, 1), 3);
});

test("after a failed read a reset that passes does not bring the next read forward", async () => {
  const windows = [win("7d", 0.41, FAR), win("5h", 0.5, NOW + 7 * MINUTE)];
  const { host, store } = scripted([
    usageOk(windows),
    { status: 429 },
    usageOk(windows),
  ]);
  await store.start();
  assert.equal(await readsAfter(host, store, 0), 1);
  assert.equal(await readsAfter(host, store, 5), 2);
  // That read failed; the 5-hour window resets 2 minutes later.
  assert.equal(await readsAfter(host, store, 3), 2);
  assert.equal(await readsAfter(host, store, 2), 3);
});

test("a tick a couple of seconds early still reads, one 6 seconds early does not", async () => {
  const { host, store } = setup();
  const readsAt = async (ms) => {
    host.clock.now += ms;
    await store.tick();
    return usageRequests(host).length;
  };
  await store.start();
  await store.tick();
  assert.equal(await readsAt(5 * MINUTE - 6000), 1);
  assert.equal(await readsAt(4000), 2);
  host.busy = true;
  assert.equal(await readsAt(ACTIVE_EVERY_MS - 6000), 2);
  assert.equal(await readsAt(4000), 3);
});

const CLAUDE_USAGE = "https://api.anthropic.com/api/oauth/usage";
const CODEX_USAGE = "https://chatgpt.com/backend-api/wham/usage";

const fixture = (path) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${path}.json`, import.meta.url)));

// The stored login of an account at `provider`.
const stored = (provider, position) => ({
  id: `${provider}:acct-1:org-1`,
  provider,
  label: provider,
  position,
  accessToken: `access-secret-${provider}`,
  refreshToken: `refresh-secret-${provider}`,
  expiresAt: NOW + 60 * MINUTE,
  signedInAt: NOW - MINUTE,
  identity: {
    accountId: "acct-1",
    organizationId: "org-1",
    email: "maxi@example.com",
    organization: null,
    plan: null,
  },
});

test("a provider with no active interval is read every 5 minutes, also while an agent works", async () => {
  const host = fakeHost();
  host.busy = true;
  host.files[VAULT] = JSON.stringify({
    version: 1,
    accounts: [stored("plain", 0)],
  });
  let reads = 0;
  const plain = {
    id: "plain",
    name: "Plain",
    loginTtlMs: null,
    async read() {
      reads += 1;
      return { ok: true, windows: windowsAt(0.2), plan: null };
    },
  };
  const store = createStore(host, { providers: { plain } });
  await store.start();
  await store.tick();
  assert.equal(reads, 1);
  host.clock.now += 4 * MINUTE;
  await store.tick();
  assert.equal(reads, 1);
  host.clock.now += MINUTE;
  await store.tick();
  assert.equal(reads, 2);
});

test("while an agent works Codex is read every minute and Claude every two", async () => {
  const host = fakeHost({
    respond(request) {
      if (request.url === CLAUDE_USAGE) {
        return { status: 200, body: fixture("claude/both") };
      }
      if (request.url === CODEX_USAGE) {
        return { status: 200, body: fixture("codex/five-hour-weekly") };
      }
      return { status: 404 };
    },
  });
  host.busy = true;
  host.files[VAULT] = JSON.stringify({
    version: 1,
    accounts: [stored("claude", 0), stored("codex", 1)],
  });
  const store = createStore(host);
  const reads = () =>
    [CLAUDE_USAGE, CODEX_USAGE].map(
      (url) => host.requests.filter((request) => request.url === url).length,
    );
  await store.start();
  await store.tick();
  assert.deepEqual(reads(), [1, 1]);
  for (const expected of [
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
  ]) {
    host.clock.now += MINUTE;
    await store.tick();
    assert.deepEqual(reads(), expected);
  }
  assertNoToken(host);
});
