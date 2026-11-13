import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountHeight,
  openAccount,
  openRemove,
  removeQuestion,
} from "../mods/headroom/logic/account.js";
import { NOW, fakeHost, reading, win } from "./helpers/fakes.mjs";

test("opening an account asks Herdr for a 380 px popup of that account alone", () => {
  const host = fakeHost();
  openAccount(
    { host, readings: [reading()], store: { accounts: () => [] } },
    reading().id,
  );
  assert.equal(host.overlays.length, 1);
  const [spec] = host.overlays;
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "popup");
  assert.equal(spec.width, 380);
  assert.deepEqual(spec.props, {
    form: "account",
    account: "claude:acct-maxi:org-maxi",
  });
  assert.ok(Number.isInteger(spec.height), `height ${spec.height}`);
  assert.ok(spec.height > 0 && spec.height <= 640, `height ${spec.height}`);
});

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LOGIN_END = NOW + 23 * DAY;
const SPARK = "GPT-5.3-Codex-Spark";

const maxiAccount = {
  id: "claude:acct-maxi:org-maxi",
  provider: "claude",
  label: "maxi",
  email: "maxi@example.com",
  organization: null,
  plan: "Max",
};
const codexAccount = {
  id: "codex:acct-maxilr",
  provider: "codex",
  label: "maxilr",
  email: "maxilr@example.com",
  organization: null,
  plan: "Pro",
};

// maxi: Weekly, 5-hour and Weekly · Sonnet, each with a pace mark, and the
// end of its login.
const claude = (overrides = {}) =>
  reading({
    loginEndsAt: LOGIN_END,
    windows: [
      win("7d", 0.41, NOW + 4 * DAY),
      win("5h", 0.62, NOW + 2 * HOUR),
      win("7d:sonnet", 0.18, NOW + 4 * DAY, { label: "Weekly · Sonnet" }),
    ],
    ...overrides,
  });

const codex = () =>
  reading({
    id: codexAccount.id,
    provider: "codex",
    label: "maxilr",
    plan: "Pro",
    windows: [
      win("extra:spark:7d", 0.3, NOW + 5 * DAY, {
        label: `${SPARK} · Weekly`,
        durationMs: 7 * DAY,
      }),
      win("extra:spark:5h", 0.64, NOW + 2 * HOUR, {
        label: `${SPARK} · 5-hour`,
        durationMs: 5 * HOUR,
      }),
      win("7d", 0.23, NOW + 5 * DAY),
      win("5h", 0.12, NOW + 3 * HOUR),
    ],
  });

test("a Claude account with an email, three windows, pace marks and a login end is 404 px", () => {
  // 38 + 17 + (61 + 58 + 61) + 30 + 28 + 15 + 55 + 39 + 2
  assert.equal(accountHeight(claude(), maxiAccount), 404);
});

test("a Codex account with two additional limits and no login end is 434 px", () => {
  // 38 + 17 + (61 + 58 + 58 + 61) + 30 + 15 + 55 + 39 + 2
  assert.equal(accountHeight(codex(), codexAccount), 434);
});

test("a failed read keeps its bars and login line, without the pace line: 313 px", () => {
  const failed = claude({
    status: "stale",
    error: "network",
    fetchedAt: NOW - 12 * MINUTE,
    windows: [win("7d", 0.78, NOW + 2 * DAY), win("5h", 0.91, NOW + HOUR)],
  });
  // 38 + 17 + (61 + 58) + 28 + 15 + 55 + 39 + 2
  assert.equal(accountHeight(failed, maxiAccount), 313);
});

test("an account that must sign in again is its header and its login line: 194 px", () => {
  const signedOut = claude({
    status: "signed-out",
    loginEndsAt: NOW - 3 * DAY,
  });
  // 38 + 17 + 28 + 15 + 55 + 39 + 2
  assert.equal(accountHeight(signedOut, maxiAccount), 194);
});

test("a first read is its header and one pair of empty tracks: 197 px", () => {
  const first = claude({ status: "stale", fetchedAt: null, windows: [] });
  // 38 + 17 + (16 + 6 + 6 + 3) + 15 + 55 + 39 + 2
  assert.equal(accountHeight(first, maxiAccount), 197);
});

test("windows that have not started draw no pace mark and no pace line", () => {
  const idle = claude({
    loginEndsAt: null,
    windows: [win("7d", 0, null), win("5h", 0, null)],
  });
  // 38 + 17 + (61 + 58) + 15 + 55 + 39 + 2
  assert.equal(accountHeight(idle, maxiAccount), 285);
});

test("an account with no email or organization has no line under its header", () => {
  const bare = { ...maxiAccount, email: null, organization: null };
  assert.equal(accountHeight(claude(), bare), 404 - 17);
  assert.equal(accountHeight(claude(), undefined), 404 - 17);
});

test("twenty windows stop at the most a popup takes", () => {
  const windows = Array.from({ length: 20 }, (_, k) =>
    win(`7d:model${k}`, 0.1, NOW + DAY, { label: `Weekly · Model ${k}` }),
  );
  assert.equal(accountHeight(claude({ windows }), maxiAccount), 640);
});

test("openAccount asks for the account's exact height", () => {
  const host = fakeHost();
  openAccount(
    {
      host,
      readings: [codex(), claude()],
      store: { accounts: () => [codexAccount, maxiAccount] },
    },
    maxiAccount.id,
  );
  assert.equal(host.overlays[0].height, 404);
});

test("the question before removing names the account and what is lost", () => {
  assert.deepEqual(removeQuestion("maxi · Terac"), {
    title: "Remove maxi · Terac?",
    detail: "Its stored login is deleted from this computer.",
  });
  assert.deepEqual(removeQuestion("maxilr"), {
    title: "Remove maxilr?",
    detail: "Its stored login is deleted from this computer.",
  });
});

test("openRemove asks with the mod's own 380 px dialog, not Herdr's confirm", () => {
  const host = fakeHost();
  openRemove({ host }, "claude:acct-maxi:org-terac");
  assert.deepEqual(host.overlays, [
    {
      mod: "headroom",
      kind: "dialog",
      width: 380,
      props: { remove: "claude:acct-maxi:org-terac" },
    },
  ]);
  assert.ok(!host.overlays.some((spec) => spec.mod === "confirm"));
});
