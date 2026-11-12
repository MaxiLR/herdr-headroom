import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../mods/headroom/logic/store.js";
import { NOW, fakeHost, loginIo } from "./helpers/fakes.mjs";

const USERCODE = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const POLL = "https://auth.openai.com/api/accounts/deviceauth/token";
const EXCHANGE = "https://auth.openai.com/oauth/token";
const USAGE = "https://chatgpt.com/backend-api/wham/usage";
const DEVICE = "https://auth.openai.com/codex/device";

// An unsigned JWT whose payload is `claims`.
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
const SECRETS = [
  ACCESS,
  ID_TOKEN,
  "refresh-secret-1",
  "auth-code-1",
  "verifier-1",
];

// 5-hour at 62 % resetting at 1794486480 (unix seconds), weekly at 41 %
// resetting at 1794814200.
const USAGE_BODY = {
  plan_type: "plus",
  rate_limit: {
    primary_window: {
      used_percent: 62,
      limit_window_seconds: 18000,
      reset_at: 1794486480,
    },
    secondary_window: {
      used_percent: 41,
      limit_window_seconds: 604800,
      reset_at: 1794814200,
    },
  },
};

const WEEKLY = {
  id: "7d",
  label: "Weekly",
  durationMs: 604800000,
  usedFraction: 0.41,
  resetsAt: 1794814200000,
  atLimit: false,
};
const FIVE_HOUR = {
  id: "5h",
  label: "5-hour",
  durationMs: 18000000,
  usedFraction: 0.62,
  resetsAt: 1794486480000,
  atLimit: false,
};

// OpenAI's side of a Codex sign-in that stays pending for `pending` polls,
// and the usage endpoint answering `usage` (a response, or a function of the
// request giving one).
function openai({
  pending = 2,
  usage = { status: 200, body: USAGE_BODY },
} = {}) {
  let polls = 0;
  return (request) => {
    switch (request.url) {
      case USERCODE:
        polls = 0;
        return {
          status: 200,
          body: {
            device_auth_id: "device-1",
            user_code: "WDJB-MJHT",
            interval: "5",
          },
        };
      case POLL:
        polls += 1;
        return polls <= pending
          ? { status: 403, body: { error: "authorization_pending" } }
          : {
              status: 200,
              body: {
                authorization_code: "auth-code-1",
                code_verifier: "verifier-1",
              },
            };
      case EXCHANGE:
        return {
          status: 200,
          body: {
            access_token: ACCESS,
            refresh_token: "refresh-secret-1",
            id_token: ID_TOKEN,
            expires_in: 3600,
          },
        };
      case USAGE:
        return typeof usage === "function" ? usage(request) : usage;
      default:
        return { status: 404 };
    }
  };
}

const usageRequests = (host) => host.requests.filter((r) => r.url === USAGE);
const published = (host) => host.state["headroom.readings"];

async function connected(options) {
  const host = fakeHost({ respond: openai(options) });
  const store = createStore(host);
  await store.start();
  const result = await store.connect("codex", loginIo(host));
  return { host, store, result };
}

test("before any account start publishes an empty list", async () => {
  const host = fakeHost();
  const store = createStore(host);
  await store.start();
  assert.deepEqual(published(host), { version: 1, accounts: [] });
  assert.deepEqual(store.accounts(), []);
  assert.deepEqual(host.requests, []);
  assert.deepEqual(host.files, {});
});

test("a Codex sign-in approved after two polls is read and published", async () => {
  const { host, store, result } = await connected();
  assert.deepEqual(result, { ok: true, id: "codex:acct-1:acct-1" });
  assert.deepEqual(host.presented, [
    { url: DEVICE, code: "WDJB-MJHT", deadline: NOW + 900000 },
  ]);
  assert.deepEqual(host.opened, [DEVICE]);
  assert.deepEqual(host.sleeps, [5000, 5000, 5000]);
  assert.deepEqual(published(host), {
    version: 1,
    accounts: [
      {
        id: "codex:acct-1:acct-1",
        provider: "codex",
        label: "maxi",
        plan: "Plus",
        status: "ok",
        fetchedAt: NOW + 15000,
        windows: [WEEKLY, FIVE_HOUR],
      },
    ],
  });
  assert.deepEqual(store.accounts(), [
    {
      id: "codex:acct-1:acct-1",
      provider: "codex",
      label: "maxi",
      email: "maxi@example.com",
      organization: null,
      plan: "Plus",
      signedInAt: NOW + 15000,
    },
  ]);
});

test("the sign-in speaks OpenAI's device code protocol", async () => {
  const { host } = await connected();
  const [usercode, ...rest] = host.requests;
  assert.equal(usercode.url, USERCODE);
  assert.equal(usercode.method, "POST");
  assert.deepEqual(JSON.parse(usercode.body), {
    client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
  });
  const polls = rest.filter((r) => r.url === POLL);
  assert.equal(polls.length, 3);
  assert.deepEqual(JSON.parse(polls[0].body), {
    device_auth_id: "device-1",
    user_code: "WDJB-MJHT",
  });
  const exchange = rest.find((r) => r.url === EXCHANGE);
  assert.equal(exchange.method, "POST");
  assert.equal(
    exchange.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  );
  assert.deepEqual(Object.fromEntries(new URLSearchParams(exchange.body)), {
    grant_type: "authorization_code",
    client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
    code: "auth-code-1",
    code_verifier: "verifier-1",
    redirect_uri: "https://auth.openai.com/deviceauth/callback",
  });
  const [usage] = usageRequests(host);
  assert.equal(usage.method, "GET");
  assert.equal(usage.headers.Authorization, `Bearer ${ACCESS}`);
  assert.equal(usage.headers["ChatGPT-Account-Id"], "acct-1");
});

test("connecting the same identity again leaves one reading", async () => {
  const { host, store } = await connected();
  const again = await store.connect("codex", loginIo(host));
  assert.deepEqual(again, { ok: true, id: "codex:acct-1:acct-1" });
  assert.equal(published(host).accounts.length, 1);
  assert.equal(published(host).accounts[0].id, "codex:acct-1:acct-1");
  assert.equal(store.accounts().length, 1);
});

test("a read answered 500 publishes an error with no windows", async () => {
  const { host, result } = await connected({
    usage: { status: 500, body: "oops" },
  });
  assert.deepEqual(result, { ok: true, id: "codex:acct-1:acct-1" });
  assert.deepEqual(published(host).accounts, [
    {
      id: "codex:acct-1:acct-1",
      provider: "codex",
      label: "maxi",
      plan: "Plus",
      status: "error",
      error: "unexpected",
      fetchedAt: null,
      windows: [],
    },
  ]);
});

test("a read answered 401 is an auth error and a failed fetch a network one", async () => {
  const unauthorized = await connected({ usage: { status: 401 } });
  assert.equal(published(unauthorized.host).accounts[0].error, "auth");
  const offline = await connected({
    usage: () => {
      throw new TypeError("network down");
    },
  });
  assert.equal(published(offline.host).accounts[0].error, "network");
});

test("windows are told by their length, weekly first", async () => {
  const { host } = await connected({
    usage: {
      status: 200,
      body: {
        rate_limit: {
          primary_window: {
            used_percent: 41,
            limit_window_seconds: 604800,
            reset_at: 1794814200,
          },
          secondary_window: {
            used_percent: 0,
            limit_window_seconds: 18000,
            reset_at: null,
          },
        },
      },
    },
  });
  const [only] = published(host).accounts;
  assert.equal(only.plan, "Plus");
  assert.deepEqual(only.windows, [
    WEEKLY,
    { ...FIVE_HOUR, usedFraction: 0, resetsAt: null },
  ]);
});

test("a window of another length is named by its length", async () => {
  const { host } = await connected({
    usage: {
      status: 200,
      body: {
        plan_type: "pro",
        rate_limit: {
          primary_window: {
            used_percent: 10,
            limit_window_seconds: 86400,
            reset_at: 1794486480,
          },
          secondary_window: {
            used_percent: 41,
            limit_window_seconds: 604800,
            reset_at: 1794814200,
          },
        },
      },
    },
  });
  const [only] = published(host).accounts;
  assert.equal(only.plan, "Pro");
  assert.deepEqual(only.windows, [
    WEEKLY,
    {
      id: "1d",
      label: "1-day",
      durationMs: 86400000,
      usedFraction: 0.1,
      resetsAt: 1794486480000,
      atLimit: false,
    },
  ]);
});

test("a cancelled sign-in adds no account", async () => {
  const host = fakeHost({ respond: openai({ pending: 99 }) });
  const store = createStore(host);
  await store.start();
  const result = await store.connect(
    "codex",
    loginIo(host, { cancelled: () => host.sleeps.length > 2 }),
  );
  assert.deepEqual(result, { ok: false, kind: "cancelled" });
  assert.deepEqual(published(host), { version: 1, accounts: [] });
  // Cancelled after its third wait, before a third poll.
  assert.equal(host.requests.filter((r) => r.url === POLL).length, 2);
  assert.equal(host.requests.filter((r) => r.url === EXCHANGE).length, 0);
});

test("an unknown provider is unexpected", async () => {
  const host = fakeHost();
  const store = createStore(host);
  await store.start();
  assert.deepEqual(await store.connect("gemini", loginIo(host)), {
    ok: false,
    kind: "unexpected",
  });
});

test("tick reads again once the reading is older than 5 minutes, not before", async () => {
  const { host, store } = await connected();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 299999;
  await store.tick();
  assert.equal(usageRequests(host).length, 1);
  host.clock.now += 2;
  await store.tick();
  assert.equal(usageRequests(host).length, 2);
  assert.equal(published(host).accounts[0].fetchedAt, NOW + 15000 + 300001);
});

test("a read already running is not started twice", async () => {
  const { host, store } = await connected();
  await Promise.all([store.refresh(), store.refresh("codex:acct-1:acct-1")]);
  assert.equal(usageRequests(host).length, 2);
});

test("no token reaches a file or the shared state", async () => {
  const { host, store } = await connected();
  await store.refresh();
  assert.deepEqual(Object.keys(host.files), [
    `${host.home}/headroom/vault.json`,
  ]);
  const shared = JSON.stringify(host.sets);
  for (const secret of SECRETS) {
    assert.equal(
      shared.includes(secret),
      false,
      `a secret is shared: ${secret}`,
    );
  }
  const listed = JSON.stringify(store.accounts());
  for (const secret of SECRETS) {
    assert.equal(
      listed.includes(secret),
      false,
      `a secret is listed: ${secret}`,
    );
  }
});
