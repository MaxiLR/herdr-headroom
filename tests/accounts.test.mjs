import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountId,
  defaultLabel,
  move,
  remove,
  rename,
  upsert,
} from "../mods/headroom/logic/accounts.js";

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
const PLUS = {
  accountId: "acct-plus",
  organizationId: "acct-plus",
  email: "maxi@example.com",
  organization: null,
  plan: "Plus",
};
const ANA = {
  accountId: "acct-ana",
  organizationId: "org-ana",
  email: "ana@example.com",
  organization: null,
  plan: "Pro",
};

function account(id, label, position, identity, n = 1) {
  return {
    id,
    provider: "claude",
    label,
    position,
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    expiresAt: 1000 + n,
    signedInAt: 100 + n,
    identity,
  };
}

const three = () => [
  account("claude:acct-maxi:org-maxi", "maxi", 0, MAXI, 1),
  account("claude:acct-maxi:org-terac", "maxi · Terac", 1, TERAC, 2),
  account("claude:acct-ana:org-ana", "ana", 2, ANA, 3),
];

const order = (accounts) =>
  accounts.map((item) => [item.id, item.label, item.position]);

test("an account's id is its provider, account and organization", () => {
  assert.equal(accountId("claude", MAXI), "claude:acct-maxi:org-maxi");
  assert.equal(accountId("claude", TERAC), "claude:acct-maxi:org-terac");
  assert.equal(accountId("codex", PLUS), "codex:acct-plus:acct-plus");
});

test("the default label is the email's name, then its organization", () => {
  assert.equal(defaultLabel(MAXI, []), "maxi");
  assert.equal(defaultLabel(TERAC, ["maxi"]), "maxi · Terac");
  assert.equal(defaultLabel(TERAC, ["ana"]), "maxi");
});

test("the default label takes the plan when there is no organization", () => {
  assert.equal(defaultLabel(PLUS, ["maxi"]), "maxi · Plus");
});

test("a new account goes last", () => {
  const [maxi, terac] = three();
  const next = upsert([maxi], terac);
  assert.deepEqual(order(next), [
    ["claude:acct-maxi:org-maxi", "maxi", 0],
    ["claude:acct-maxi:org-terac", "maxi · Terac", 1],
  ]);
});

test("an account connected again keeps its label and position and takes the new login", () => {
  const accounts = three();
  accounts[0].label = "Home";
  const again = account(
    "claude:acct-maxi:org-maxi",
    "maxi",
    3,
    { ...MAXI, plan: "Max 20x" },
    9,
  );
  const next = upsert(accounts, again);
  assert.deepEqual(next, [
    {
      id: "claude:acct-maxi:org-maxi",
      provider: "claude",
      label: "Home",
      position: 0,
      accessToken: "access-9",
      refreshToken: "refresh-9",
      expiresAt: 1009,
      signedInAt: 109,
      identity: { ...MAXI, plan: "Max 20x" },
    },
    accounts[1],
    accounts[2],
  ]);
  assert.equal(accounts[0].accessToken, "access-1");
});

test("rename trims the label", () => {
  const next = rename(three(), "claude:acct-ana:org-ana", "  Work  ");
  assert.deepEqual(order(next), [
    ["claude:acct-maxi:org-maxi", "maxi", 0],
    ["claude:acct-maxi:org-terac", "maxi · Terac", 1],
    ["claude:acct-ana:org-ana", "Work", 2],
  ]);
});

test("an empty label goes back to the default", () => {
  const renamed = rename(three(), "claude:acct-maxi:org-terac", "Work");
  const next = rename(renamed, "claude:acct-maxi:org-terac", "   ");
  assert.equal(next[1].label, "maxi · Terac");
  const ana = rename(three(), "claude:acct-ana:org-ana", "");
  assert.equal(ana[2].label, "ana");
});

test("move goes up and down by one", () => {
  const up = move(three(), "claude:acct-ana:org-ana", -1);
  assert.deepEqual(order(up), [
    ["claude:acct-maxi:org-maxi", "maxi", 0],
    ["claude:acct-ana:org-ana", "ana", 1],
    ["claude:acct-maxi:org-terac", "maxi · Terac", 2],
  ]);
  const down = move(three(), "claude:acct-maxi:org-maxi", 1);
  assert.deepEqual(order(down), [
    ["claude:acct-maxi:org-terac", "maxi · Terac", 0],
    ["claude:acct-maxi:org-maxi", "maxi", 1],
    ["claude:acct-ana:org-ana", "ana", 2],
  ]);
});

test("move does nothing at an edge", () => {
  const top = move(three(), "claude:acct-maxi:org-maxi", -1);
  const bottom = move(three(), "claude:acct-ana:org-ana", 1);
  const unchanged = [
    ["claude:acct-maxi:org-maxi", "maxi", 0],
    ["claude:acct-maxi:org-terac", "maxi · Terac", 1],
    ["claude:acct-ana:org-ana", "ana", 2],
  ];
  assert.deepEqual(order(top), unchanged);
  assert.deepEqual(order(bottom), unchanged);
});

test("remove takes the account out and closes the positions", () => {
  const next = remove(three(), "claude:acct-maxi:org-maxi");
  assert.deepEqual(order(next), [
    ["claude:acct-maxi:org-terac", "maxi · Terac", 0],
    ["claude:acct-ana:org-ana", "ana", 1],
  ]);
});

test("positions are 0..n-1 in order whatever was given", () => {
  const scrambled = three().map((item, at) => ({
    ...item,
    position: [7, 2, 4][at],
  }));
  const next = upsert(scrambled, account("codex:x:x", "x", 0, PLUS, 4));
  assert.deepEqual(order(next), [
    ["claude:acct-maxi:org-terac", "maxi · Terac", 0],
    ["claude:acct-ana:org-ana", "ana", 1],
    ["claude:acct-maxi:org-maxi", "maxi", 2],
    ["codex:x:x", "x", 3],
  ]);
});
