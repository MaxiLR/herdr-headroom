import { test } from "node:test";
import assert from "node:assert/strict";
import { NOW, win } from "./helpers/fakes.mjs";
import {
  MINUTE,
  WINDOWS,
  assertNoToken,
  bearerOf,
  deferred,
  login,
  readingOf,
  settle,
  setup,
  tokenOk,
  tokenRequests,
  usageOk,
  usageRequests,
  vaultAccounts,
} from "./helpers/acme.mjs";

const ID1 = "acme:acct-1:org-1";
const ID2 = "acme:acct-2:org-2";

test("two reads at once of an account with an expiring token make one refresh and one read", async () => {
  const answer = deferred();
  const { host, store } = setup({
    accounts: [login(1, { expiresAt: NOW + MINUTE })],
    token: async () => {
      await answer.promise;
      return tokenOk(host, 1);
    },
  });
  await store.start();
  const first = store.tick();
  const second = store.refresh(ID1);
  await settle();
  answer.resolve();
  await Promise.all([first, second]);
  assert.equal(tokenRequests(host).length, 1);
  assert.equal(usageRequests(host).length, 1);
  assert.equal(readingOf(host, ID1).status, "ok");
  assertNoToken(host);
});

test("a read of one account does not wait for another's", async () => {
  const never = deferred();
  const { host, store } = setup({
    accounts: [login(1), login(2)],
    usage: (request) =>
      bearerOf(request) === "access-secret-1" ? never.promise : usageOk(),
  });
  await store.start();
  store.refresh(ID1);
  await store.refresh(ID2);
  assert.equal(readingOf(host, ID2).status, "ok");
  assert.equal(readingOf(host, ID2).fetchedAt, NOW);
  assert.equal(readingOf(host, ID1).fetchedAt, null);
  assertNoToken(host);
});

test("two accounts refreshed at once both keep their rotated tokens in the vault", async () => {
  const { host, store } = setup({
    accounts: [
      login(1, { expiresAt: NOW + MINUTE }),
      login(2, { expiresAt: NOW + MINUTE }),
    ],
    token: (request) =>
      tokenOk(host, JSON.parse(request.body).refresh_token.at(-1)),
  });
  await store.start();
  await store.refresh();
  assert.deepEqual(
    vaultAccounts(host).map((account) => [
      account.id,
      account.accessToken,
      account.refreshToken,
    ]),
    [
      [ID1, "access-secret-1-new", "refresh-secret-1-new"],
      [ID2, "access-secret-2-new", "refresh-secret-2-new"],
    ],
  );
  assertNoToken(host);
});

test(
  "an operation unfinished for more than 2 minutes does not block the next",
  { timeout: 5000 },
  async () => {
    let reads = 0;
    const { host, store } = setup({
      usage: () => (++reads === 1 ? deferred().promise : usageOk()),
    });
    await store.start();
    store.refresh(ID1);
    await settle();
    assert.equal(usageRequests(host).length, 1);
    host.clock.now += 2 * MINUTE;
    store.refresh(ID1);
    await settle();
    assert.equal(usageRequests(host).length, 1);
    host.clock.now += 1;
    await store.refresh(ID1);
    assert.equal(usageRequests(host).length, 2);
    assert.equal(readingOf(host, ID1).status, "ok");
    assert.equal(readingOf(host, ID1).fetchedAt, NOW + 2 * MINUTE + 1);
    assertNoToken(host);
  },
);

test(
  "an abandoned operation that ends late does not overwrite the newer reading",
  { timeout: 5000 },
  async () => {
    const late = deferred();
    const older = [win("5h", 0.1, NOW + 60 * MINUTE)];
    let reads = 0;
    const { host, store } = setup({
      usage: () => (++reads === 1 ? late.promise : usageOk()),
    });
    await store.start();
    const abandoned = store.refresh(ID1);
    await settle();
    host.clock.now += 3 * MINUTE;
    await store.refresh(ID1);
    late.resolve(usageOk(older));
    await abandoned;
    await settle();
    const reading = readingOf(host, ID1);
    assert.equal(reading.fetchedAt, NOW + 3 * MINUTE);
    assert.deepEqual(reading.windows, WINDOWS);
    assertNoToken(host);
  },
);
