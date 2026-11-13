import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { read } from "../mods/headroom/providers/codex.js";
import { NOW, fakeHost } from "./helpers/fakes.mjs";

const USAGE = "https://chatgpt.com/backend-api/wham/usage";
const TOKEN = "access-secret-1";

const CREDENTIALS = {
  accessToken: TOKEN,
  refreshToken: "refresh-secret-1",
  expiresAt: NOW + 3600000,
  signedInAt: NOW - 3600000,
  identity: {
    accountId: "acct-1",
    organizationId: "acct-1",
    email: "maxi@example.com",
    organization: null,
    plan: "Plus",
  },
};

const fixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/codex/${name}.json`, import.meta.url)),
  );

// Reads the usage once, answered with `answer` (or failing the network when
// `answer` throws), at NOW.
async function readWith(answer) {
  const host = fakeHost({ respond: answer });
  const result = await read(CREDENTIALS, { fetch: host.fetch, now: host.now });
  return { host, result };
}

const answering = (name) =>
  readWith(() => ({ status: 200, body: fixture(name) }));

test("reads the usage with the access token and the account id", async () => {
  const { host } = await answering("five-hour-weekly");
  assert.equal(host.requests.length, 1);
  const [request] = host.requests;
  assert.equal(request.url, USAGE);
  assert.equal(request.method, "GET");
  assert.equal(request.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(request.headers["ChatGPT-Account-Id"], "acct-1");
});

test("a 5-hour and a weekly window, weekly first", async () => {
  const { result } = await answering("five-hour-weekly");
  assert.deepEqual(result, {
    ok: true,
    plan: "Plus",
    windows: [
      {
        id: "7d",
        label: "Weekly",
        durationMs: 604800000,
        usedFraction: 0.41,
        resetsAt: 1794841200000,
        atLimit: false,
      },
      {
        id: "5h",
        label: "5-hour",
        durationMs: 18000000,
        usedFraction: 0.62,
        resetsAt: 1794480480000,
        atLimit: false,
      },
    ],
  });
});

test("a weekly-only plan reports its week in the primary slot", async () => {
  const { result } = await answering("weekly-only");
  assert.deepEqual(result, {
    ok: true,
    plan: "Free",
    windows: [
      {
        id: "7d",
        label: "Weekly",
        durationMs: 604800000,
        usedFraction: 0,
        resetsAt: null,
        atLimit: false,
      },
    ],
  });
});

test("a reached limit marks the fullest window", async () => {
  const { result } = await answering("limit-reached");
  assert.deepEqual(result, {
    ok: true,
    plan: "Pro",
    windows: [
      {
        id: "7d",
        label: "Weekly",
        durationMs: 604800000,
        usedFraction: 0.74,
        resetsAt: 1794700000000,
        atLimit: false,
      },
      {
        id: "5h",
        label: "5-hour",
        durationMs: 18000000,
        usedFraction: 0.985,
        resetsAt: 1794475800000,
        atLimit: true,
      },
    ],
  });
});

test("a reached limit marks every window at 100 %, clamped to 1", async () => {
  const { result } = await answering("limit-reached-full");
  assert.deepEqual(result, {
    ok: true,
    plan: "Plus",
    windows: [
      {
        id: "7d",
        label: "Weekly",
        durationMs: 604800000,
        usedFraction: 1,
        resetsAt: 1794700000000,
        atLimit: true,
      },
      {
        id: "5h",
        label: "5-hour",
        durationMs: 18000000,
        usedFraction: 1,
        resetsAt: 1794475800000,
        atLimit: true,
      },
    ],
  });
});

test("additional rate limits follow the general windows", async () => {
  const { result } = await answering("additional");
  assert.deepEqual(result, {
    ok: true,
    plan: "Pro",
    windows: [
      {
        id: "7d",
        label: "Weekly",
        durationMs: 604800000,
        usedFraction: 0.1,
        resetsAt: 1794900000000,
        atLimit: false,
      },
      {
        id: "5h",
        label: "5-hour",
        durationMs: 18000000,
        usedFraction: 0.2,
        resetsAt: 1794480000000,
        atLimit: false,
      },
      {
        id: "extra:gpt-5-3-codex-spark:7d",
        label: "GPT-5.3-Codex-Spark · Weekly",
        durationMs: 604800000,
        usedFraction: 0.3,
        resetsAt: 1794900000000,
        atLimit: false,
      },
      {
        id: "extra:gpt-5-3-codex-spark:5h",
        label: "GPT-5.3-Codex-Spark · 5-hour",
        durationMs: 18000000,
        usedFraction: 1,
        resetsAt: 1794477600000,
        atLimit: true,
      },
      {
        id: "extra:review-tasks:90m",
        label: "Review Tasks · 90-minute",
        durationMs: 5400000,
        usedFraction: 0.12,
        resetsAt: 1794474600000,
        atLimit: false,
      },
    ],
  });
});

test("an unknown window length is named by its length", async () => {
  const { result } = await answering("unknown-length");
  assert.deepEqual(result, {
    ok: true,
    plan: null,
    windows: [
      {
        id: "1d",
        label: "1-day",
        durationMs: 86400000,
        usedFraction: 0.25,
        resetsAt: 1794520800000,
        atLimit: false,
      },
      {
        id: "3h",
        label: "3-hour",
        durationMs: 10800000,
        usedFraction: 0.5,
        resetsAt: 1794477600000,
        atLimit: false,
      },
    ],
  });
});

test("401 is an ended login", async () => {
  const { result } = await readWith(() => ({
    status: 401,
    body: { error: `bad token ${TOKEN}` },
  }));
  assert.deepEqual(result, { ok: false, kind: "auth" });
});

test("a rejected fetch is a network failure", async () => {
  const { result } = await readWith(() => {
    throw new Error(`connection reset while sending ${TOKEN}`);
  });
  assert.deepEqual(result, { ok: false, kind: "network" });
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});

test("a 500 is unexpected and never carries its body", async () => {
  const { result } = await readWith(() => ({
    status: 500,
    body: `internal error for Bearer ${TOKEN}`,
  }));
  assert.deepEqual(result, { ok: false, kind: "unexpected" });
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});

test("a body that is not an object is unexpected", async () => {
  for (const body of ["ok", [1, 2], null]) {
    const { result } = await readWith(() => ({
      status: 200,
      body: JSON.stringify(body),
    }));
    assert.deepEqual(result, { ok: false, kind: "unexpected" }, String(body));
  }
});
