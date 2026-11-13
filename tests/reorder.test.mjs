// The detail view's arrows: which way each account can move, and a move
// changing the stored order and the published one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { arrowsOf, moveAccount } from "../mods/headroom/logic/detail.js";
import {
  VAULT,
  login,
  readings,
  setup,
  vaultAccounts,
} from "./helpers/acme.mjs";

const FIRST = "acme:acct-1:org-1";
const SECOND = "acme:acct-2:org-2";
const THIRD = "acme:acct-3:org-3";

async function three() {
  const { host, store } = setup({ accounts: [login(1), login(2), login(3)] });
  await store.start();
  return { host, view: { readings: readings(host), store } };
}

const vaultOrder = (host) => vaultAccounts(host).map((account) => account.id);
const publishedOrder = (host) => readings(host).map((reading) => reading.id);

test("the second account's up arrow moves it first, stored and published", async () => {
  const { host, view } = await three();
  await moveAccount(view, SECOND, -1);
  assert.deepEqual(vaultOrder(host), [SECOND, FIRST, THIRD]);
  assert.deepEqual(publishedOrder(host), [SECOND, FIRST, THIRD]);
});

test("the second account's down arrow moves it last, stored and published", async () => {
  const { host, view } = await three();
  await moveAccount(view, SECOND, 1);
  assert.deepEqual(vaultOrder(host), [FIRST, THIRD, SECOND]);
  assert.deepEqual(publishedOrder(host), [FIRST, THIRD, SECOND]);
});

test("the first account's up and the last account's down change nothing", async () => {
  const { host, view } = await three();
  const before = host.files[VAULT];
  await moveAccount(view, FIRST, -1);
  await moveAccount(view, THIRD, 1);
  assert.equal(host.files[VAULT], before);
  assert.deepEqual(publishedOrder(host), [FIRST, SECOND, THIRD]);
});

test("arrowsOf: the first cannot go up, the last cannot go down", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(arrowsOf(list, "a"), { up: false, down: true });
  assert.deepEqual(arrowsOf(list, "b"), { up: true, down: true });
  assert.deepEqual(arrowsOf(list, "c"), { up: true, down: false });
});

test("arrowsOf: one account has no arrows, nor an unknown one", () => {
  assert.equal(arrowsOf([{ id: "a" }], "a"), null);
  assert.equal(arrowsOf([{ id: "a" }, { id: "b" }], "z"), null);
});
