import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as claude from "../mods/headroom/providers/claude.js";
import { providers } from "../mods/headroom/providers/index.js";
import { NOW, fakeHost } from "./helpers/fakes.mjs";

const USAGE = "https://api.anthropic.com/api/oauth/usage";
const TOKEN = "sk-ant-oat01-secret-access";
const WEEK = 604800000;
const FIVE_HOURS = 18000000;

const credentials = {
  accessToken: TOKEN,
  refreshToken: "sk-ant-ort01-secret-refresh",
  expiresAt: NOW + 3600000,
  signedInAt: NOW,
  identity: {
    accountId: "acct-1",
    organizationId: "org-1",
    email: "maxi@example.com",
    organization: "Maxi's Org",
    plan: null,
  },
};

const fixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/claude/${name}.json`, import.meta.url)),
  );

// Reads with every request answered 200 with the fixture `name`.
async function readFixture(name) {
  const host = fakeHost({
    respond: () => ({ status: 200, body: fixture(name) }),
  });
  const result = await claude.read(credentials, {
    fetch: host.fetch,
    now: host.now,
  });
  return { host, result };
}

const weekly = (usedFraction, resetsAt, atLimit = false) => ({
  id: "7d",
  label: "Weekly",
  durationMs: WEEK,
  usedFraction,
  resetsAt,
  atLimit,
});
const fiveHour = (usedFraction, resetsAt, atLimit = false) => ({
  id: "5h",
  label: "5-hour",
  durationMs: FIVE_HOURS,
  usedFraction,
  resetsAt,
  atLimit,
});

test("the module names itself and is registered next to codex", () => {
  assert.equal(claude.id, "claude");
  assert.equal(claude.name, "Claude");
  assert.equal(claude.loginTtlMs, 2592000000);
  assert.equal(providers.claude, claude);
  assert.equal(providers.codex.id, "codex");
});

test("the request carries the bearer token and the beta header, nothing else", async () => {
  const { host } = await readFixture("both");
  assert.deepEqual(host.requests, [
    {
      url: USAGE,
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      body: undefined,
    },
  ]);
});

test("both buckets give the weekly then the 5-hour window", async () => {
  const { result } = await readFixture("both");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      weekly(0.41, Date.UTC(2026, 10, 16, 15, 0)),
      fiveHour(0.62, Date.UTC(2026, 10, 12, 10, 48)),
    ],
  });
});

test("a 5-hour window that has not started resets at null; null buckets give nothing", async () => {
  const { result } = await readFixture("not-started");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [weekly(0, Date.UTC(2026, 10, 19, 6, 0)), fiveHour(0, null)],
  });
});

test("per-model weekly buckets follow, clamped and marked at their limit", async () => {
  const { result } = await readFixture("per-model");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      weekly(0.375, Date.UTC(2026, 10, 17, 8, 0)),
      fiveHour(1, Date.UTC(2026, 10, 12, 11, 0), true),
      {
        id: "7d:opus",
        label: "Weekly · Opus",
        durationMs: WEEK,
        usedFraction: 0.125,
        resetsAt: Date.UTC(2026, 10, 18, 0, 0),
        atLimit: false,
      },
      {
        id: "7d:sonnet",
        label: "Weekly · Sonnet",
        durationMs: WEEK,
        usedFraction: 1,
        resetsAt: Date.UTC(2026, 10, 14, 20, 30),
        atLimit: true,
      },
    ],
  });
});

test("limits entries fill the 5-hour window and add scoped weekly windows", async () => {
  const { result } = await readFixture("limits");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      weekly(0.2, Date.UTC(2026, 10, 17, 8, 0)),
      fiveHour(0.15, Date.UTC(2026, 10, 12, 12, 0)),
      {
        id: "7d:sonnet",
        label: "Weekly · Sonnet",
        durationMs: WEEK,
        usedFraction: 0.3,
        resetsAt: Date.UTC(2026, 10, 17, 8, 0),
        atLimit: false,
      },
      {
        id: "7d:fable-2-5",
        label: "Weekly · Fable 2.5",
        durationMs: WEEK,
        usedFraction: 1,
        resetsAt: Date.UTC(2026, 10, 15, 0, 0),
        atLimit: true,
      },
      {
        id: "7d:opus",
        label: "Weekly · Opus",
        durationMs: WEEK,
        usedFraction: 0.6,
        resetsAt: null,
        atLimit: false,
      },
    ],
  });
});

test("a weekly_all entry gives the weekly window when seven_day is null", async () => {
  const { result } = await readFixture("limits-fallback");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      weekly(0.7, Date.UTC(2026, 10, 18, 8, 0)),
      fiveHour(0.1, Date.UTC(2026, 10, 12, 11, 30)),
    ],
  });
});

test("unknown keys, seven_day_oauth_apps among them, are ignored", async () => {
  const { result } = await readFixture("unknown-key");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      weekly(0.5, Date.UTC(2026, 10, 16, 15, 0)),
      fiveHour(0.25, Date.UTC(2026, 10, 12, 13, 15)),
    ],
  });
});

test("a null bucket gives no window", async () => {
  const { result } = await readFixture("null-bucket");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [weekly(0.55, Date.UTC(2026, 10, 16, 15, 0))],
  });
});

async function readAnswered(respond) {
  const host = fakeHost({ respond });
  const result = await claude.read(credentials, {
    fetch: host.fetch,
    now: host.now,
  });
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  return result;
}

test("a 401 is auth", async () => {
  const result = await readAnswered(() => ({
    status: 401,
    body: { error: { message: `invalid token ${TOKEN}` } },
  }));
  assert.deepEqual(result, { ok: false, kind: "auth" });
});

test("a rejected fetch is network", async () => {
  const result = await readAnswered(() => {
    throw new Error(`connect failed for Bearer ${TOKEN}`);
  });
  assert.deepEqual(result, { ok: false, kind: "network" });
});

test("a 500 whose body carries the token is unexpected, without the token", async () => {
  const result = await readAnswered(() => ({
    status: 500,
    body: `upstream echoed Authorization: Bearer ${TOKEN}`,
  }));
  assert.deepEqual(result, { ok: false, kind: "unexpected" });
});

test("a body that is not an object is unexpected", async () => {
  for (const body of ["[]", "null", '"usage"', "not json"]) {
    const result = await readAnswered(() => ({ status: 200, body }));
    assert.deepEqual(result, { ok: false, kind: "unexpected" }, body);
  }
});
