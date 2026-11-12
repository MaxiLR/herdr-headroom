import { test } from "node:test";
import assert from "node:assert/strict";
import { NOW, win } from "./helpers/fakes.mjs";
import {
  LOGIN_TTL_MS,
  MINUTE,
  WINDOWS,
  assertNoToken,
  login,
  readingOf,
  setup,
  setupSigningIn,
  usageOk,
  usageRequests,
} from "./helpers/acme.mjs";

const ID = "acme:acct-1:org-1";
const LOGIN_ENDS_AT = NOW - MINUTE + LOGIN_TTL_MS;

test("a failed read keeps the previous windows as a stale reading", async () => {
  let reads = 0;
  const { host, store } = setup({
    usage: () => {
      reads += 1;
      if (reads === 1) return usageOk();
      if (reads === 2) throw new TypeError("network down");
      return { status: 500 };
    },
  });
  await store.start();
  await store.refresh();
  host.clock.now += 5 * MINUTE;
  await store.tick();
  assert.deepEqual(readingOf(host, ID), {
    id: ID,
    provider: "acme",
    label: "user1",
    plan: "Pro",
    status: "stale",
    error: "network",
    fetchedAt: NOW,
    loginEndsAt: LOGIN_ENDS_AT,
    windows: WINDOWS,
  });
  host.clock.now += 5 * MINUTE;
  await store.tick();
  const again = readingOf(host, ID);
  assert.equal(again.status, "stale");
  assert.equal(again.error, "unexpected");
  assert.equal(again.fetchedAt, NOW);
  assert.deepEqual(again.windows, WINDOWS);
  assertNoToken(host);
});

test("a failed first read is an error with no windows", async () => {
  const { host, store } = setup({ usage: () => ({ status: 500 }) });
  await store.start();
  await store.tick();
  assert.deepEqual(readingOf(host, ID), {
    id: ID,
    provider: "acme",
    label: "user1",
    plan: "Pro",
    status: "error",
    error: "unexpected",
    fetchedAt: null,
    loginEndsAt: LOGIN_ENDS_AT,
    windows: [],
  });
  assertNoToken(host);
});

test("a signed-out account exposes no windows", async () => {
  let reads = 0;
  const { host, store } = setup({
    usage: () => (++reads === 1 ? usageOk() : { status: 401 }),
    token: () => ({ status: 400 }),
  });
  await store.start();
  await store.refresh();
  host.clock.now += 5 * MINUTE;
  await store.tick();
  assert.deepEqual(readingOf(host, ID), {
    id: ID,
    provider: "acme",
    label: "user1",
    plan: "Pro",
    status: "signed-out",
    fetchedAt: NOW + 5 * MINUTE,
    loginEndsAt: LOGIN_ENDS_AT,
    windows: [],
  });
  assertNoToken(host);
});

test("tick reads an account never read, then not at 4 minutes but at 5", async () => {
  const { host, store } = setup();
  await store.start();
  await store.tick();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 4 * MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 2);
  assert.equal(readingOf(host, ID).fetchedAt, NOW + 5 * MINUTE);
  assertNoToken(host);
});

test("tick reads again once a window's reset time has passed", async () => {
  const windows = [
    win("7d", 0.41, NOW + 4 * 24 * 60 * MINUTE),
    win("5h", 0.98, NOW + 2 * MINUTE),
  ];
  const { host, store } = setup({ usage: () => usageOk(windows) });
  await store.start();
  await store.tick();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 2 * MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 2);
  // That reset is now before the last attempt.
  host.clock.now += MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 2);
  assertNoToken(host);
});

test("an account published as signed out stays signed out and is not read", async () => {
  const { host, store } = setup();
  host.state["headroom.readings"] = {
    version: 1,
    accounts: [
      {
        id: ID,
        provider: "acme",
        label: "user1",
        plan: "Pro",
        status: "signed-out",
        fetchedAt: NOW - 60 * MINUTE,
        loginEndsAt: LOGIN_ENDS_AT,
        windows: [],
      },
    ],
  };
  await store.start();
  await store.tick();
  host.clock.now += 10 * MINUTE;
  await store.tick();
  await store.refresh();
  assert.deepEqual(host.requests, []);
  assert.equal(readingOf(host, ID).status, "signed-out");
  assertNoToken(host);
});

test("a second manual refresh within 30 seconds makes no request, one after does", async () => {
  const { host, store } = setup();
  await store.start();
  await store.refresh();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 29999;
  await store.refresh();
  await store.refresh(ID);
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 1;
  await store.refresh(ID);
  assert.equal(usageRequests(host).length, 2);
  assertNoToken(host);
});

test("a signed-out account is read again once connect replaces its login", async () => {
  const fresh = login(1, {
    accessToken: "access-secret-9",
    refreshToken: "refresh-secret-9",
    signedInAt: NOW,
  });
  const { host, store } = setupSigningIn({
    accounts: [login(1, { expiresAt: NOW + MINUTE })],
    token: () => ({ status: 400 }),
    logins: [
      {
        ok: true,
        credentials: {
          accessToken: fresh.accessToken,
          refreshToken: fresh.refreshToken,
          expiresAt: fresh.expiresAt,
          signedInAt: fresh.signedInAt,
          identity: fresh.identity,
        },
      },
    ],
  });
  await store.start();
  await store.tick();
  assert.equal(readingOf(host, ID).status, "signed-out");
  assert.deepEqual(await store.connect("acme", {}), { ok: true, id: ID });
  assert.deepEqual(
    usageRequests(host).map((request) => request.headers.Authorization),
    ["Bearer access-secret-9"],
  );
  const reading = readingOf(host, ID);
  assert.equal(reading.status, "ok");
  assert.deepEqual(reading.windows, WINDOWS);
  assert.equal(reading.loginEndsAt, NOW + LOGIN_TTL_MS);
  host.clock.now += 5 * MINUTE;
  await store.tick();
  assert.equal(usageRequests(host).length, 2);
  assertNoToken(host);
});
