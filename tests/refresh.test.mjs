import { test } from "node:test";
import assert from "node:assert/strict";
import { NOW } from "./helpers/fakes.mjs";
import {
  LOGIN_TTL_MS,
  MINUTE,
  TOKEN_URL,
  USAGE_URL,
  VAULT,
  assertNoToken,
  bearerOf,
  login,
  readingOf,
  setup,
  tokenOk,
  tokenRequests,
  usageOk,
  usageRequests,
  vaultAccounts,
} from "./helpers/acme.mjs";

const ID = "acme:acct-1:org-1";

test("an access token expiring within 5 minutes is refreshed before the read", async () => {
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + 4 * MINUTE })],
    token: () => tokenOk(host, 1),
  });
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [TOKEN_URL, USAGE_URL],
  );
  assert.deepEqual(JSON.parse(tokenRequests(host)[0].body), {
    refresh_token: "refresh-secret-1",
  });
  assert.equal(bearerOf(usageRequests(host)[0]), "access-secret-1-new");
  assert.equal(readingOf(host, ID).status, "ok");
  assertNoToken(host);
});

test("an access token expiring in 6 minutes is read without a refresh", async () => {
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + 6 * MINUTE })],
    token: () => tokenOk(host, 1),
  });
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USAGE_URL],
  );
  assert.equal(bearerOf(usageRequests(host)[0]), "access-secret-1");
  assert.equal(readingOf(host, ID).status, "ok");
  assertNoToken(host);
});

test("a 401 refreshes once and reads once more with the new token", async () => {
  const { host, store } = setup({
    usage: (request) =>
      bearerOf(request) === "access-secret-1" ? { status: 401 } : usageOk(),
    token: () => tokenOk(host, 1),
  });
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USAGE_URL, TOKEN_URL, USAGE_URL],
  );
  assert.deepEqual(usageRequests(host).map(bearerOf), [
    "access-secret-1",
    "access-secret-1-new",
  ]);
  assert.equal(readingOf(host, ID).status, "ok");
  assertNoToken(host);
});

test("a second 401 on a first read is an auth error, not a loop", async () => {
  const { host, store } = setup({
    usage: () => ({ status: 401 }),
    token: () => tokenOk(host, 1),
  });
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USAGE_URL, TOKEN_URL, USAGE_URL],
  );
  const reading = readingOf(host, ID);
  assert.equal(reading.status, "error");
  assert.equal(reading.error, "auth");
  assert.deepEqual(reading.windows, []);
  assertNoToken(host);
});

test("a second 401 after a good read is a stale reading with kind auth", async () => {
  let reads = 0;
  const { host, store } = setup({
    usage: () => (++reads === 1 ? usageOk() : { status: 401 }),
    token: () => tokenOk(host, 1),
  });
  await store.start();
  await store.refresh();
  host.clock.now += 30 * 1000;
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USAGE_URL, USAGE_URL, TOKEN_URL, USAGE_URL],
  );
  const reading = readingOf(host, ID);
  assert.equal(reading.status, "stale");
  assert.equal(reading.error, "auth");
  assert.equal(reading.fetchedAt, NOW);
  assertNoToken(host);
});

test("a refresh the provider rejects signs the account out and keeps its login", async () => {
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + 2 * MINUTE })],
    token: () => ({ status: 400 }),
  });
  const before = host.files[VAULT];
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [TOKEN_URL],
  );
  assert.deepEqual(readingOf(host, ID), {
    id: ID,
    provider: "acme",
    label: "user1",
    plan: "Pro",
    status: "signed-out",
    fetchedAt: NOW,
    loginEndsAt: NOW - MINUTE + LOGIN_TTL_MS,
    windows: [],
  });
  assert.equal(host.files[VAULT], before);
  assert.equal(vaultAccounts(host)[0].refreshToken, "refresh-secret-1");
  assertNoToken(host);
});

test("a 401 whose refresh is rejected signs the account out", async () => {
  const { host, store } = setup({
    usage: () => ({ status: 401 }),
    token: () => ({ status: 400 }),
  });
  const before = host.files[VAULT];
  await store.start();
  await store.refresh();
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USAGE_URL, TOKEN_URL],
  );
  assert.equal(readingOf(host, ID).status, "signed-out");
  assert.equal(host.files[VAULT], before);
  host.clock.now += 10 * MINUTE;
  await store.tick();
  await store.refresh(ID);
  assert.equal(host.requests.length, 2);
  assertNoToken(host);
});

test("the rotated tokens are in the vault before the request that carries the new access token", async () => {
  let stored = null;
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + MINUTE })],
    token: () => tokenOk(host, 1),
    usage: () => {
      stored = vaultAccounts(host)[0];
      return usageOk();
    },
  });
  await store.start();
  await store.refresh();
  assert.equal(bearerOf(usageRequests(host)[0]), "access-secret-1-new");
  assert.equal(stored.accessToken, "access-secret-1-new");
  assert.equal(stored.refreshToken, "refresh-secret-1-new");
  assert.equal(stored.expiresAt, NOW + 60 * MINUTE);
  assert.equal(vaultAccounts(host)[0].refreshToken, "refresh-secret-1-new");
  assertNoToken(host);
});

test("when the vault cannot save the new tokens they are used from memory", async () => {
  let reads = 0;
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + MINUTE })],
    token: () => tokenOk(host, 1),
    usage: () => (++reads === 2 ? { status: 401 } : usageOk()),
  });
  await store.start();
  host.writeText = async () => {
    throw new Error("disk full");
  };
  await store.refresh();
  assert.equal(bearerOf(usageRequests(host)[0]), "access-secret-1-new");
  assert.equal(readingOf(host, ID).status, "ok");
  host.clock.now += 30 * 1000;
  await store.refresh();
  // The 401 refreshes with the rotated refresh token kept in memory.
  assert.deepEqual(JSON.parse(tokenRequests(host)[1].body), {
    refresh_token: "refresh-secret-1-new",
  });
  assertNoToken(host);
});
