import { test } from "node:test";
import assert from "node:assert/strict";
import { login, refresh } from "../mods/headroom/providers/codex.js";
import { NOW, fakeHost, loginIo } from "./helpers/fakes.mjs";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const USERCODE = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const POLL = "https://auth.openai.com/api/accounts/deviceauth/token";
const TOKEN = "https://auth.openai.com/oauth/token";
const DEVICE = "https://auth.openai.com/codex/device";
const FORM = "application/x-www-form-urlencoded";

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
const ID_TOKEN = jwt({
  "https://api.openai.com/auth": {
    chatgpt_account_id: "acct-2",
    chatgpt_plan_type: "pro",
  },
  "https://api.openai.com/profile": { email: "other@example.com" },
});
const BARE_ACCESS = jwt({ sub: "user-1" });
const SECRETS = [
  ACCESS,
  ID_TOKEN,
  "refresh-secret-1",
  "auth-code-1",
  "verifier-1",
];

const DEVICE_CODE = {
  device_auth_id: "device-1",
  user_code: "ABCD-1234",
  interval: "3",
};
const APPROVED = {
  authorization_code: "auth-code-1",
  code_verifier: "verifier-1",
};
const TOKENS = {
  access_token: ACCESS,
  refresh_token: "refresh-secret-1",
  id_token: ID_TOKEN,
  expires_in: 3600,
};

// A sign-in where OpenAI answers the device code with `device`, the polls
// with `polls` in turn (the last one repeating) and the exchange with
// `exchange`.
function signIn({
  device = { status: 200, body: DEVICE_CODE },
  polls = [{ status: 200, body: APPROVED }],
  exchange = { status: 200, body: TOKENS },
  cancelled,
} = {}) {
  let polled = 0;
  const host = fakeHost({
    respond(request) {
      if (request.url === USERCODE) return device;
      if (request.url === POLL) {
        const answer = polls[Math.min(polled, polls.length - 1)];
        polled += 1;
        return answer;
      }
      if (request.url === TOKEN) return exchange;
      return { status: 404 };
    },
  });
  return { host, io: loginIo(host, { cancelled }) };
}

const formOf = (request) =>
  Object.fromEntries(new URLSearchParams(request.body));

const assertNoSecret = (result) => {
  for (const secret of SECRETS) {
    assert.ok(!JSON.stringify(result).includes(secret), "leaks a secret");
  }
};

test("pending polls, then an approval, then the token exchange", async () => {
  const { host, io } = signIn({
    polls: [
      { status: 403, body: { error: "pending" } },
      { status: 404, body: { error: "pending" } },
      { status: 200, body: APPROVED },
    ],
  });
  const result = await login(io);

  assert.deepEqual(
    host.requests.map((request) => [request.method, request.url]),
    [
      ["POST", USERCODE],
      ["POST", POLL],
      ["POST", POLL],
      ["POST", POLL],
      ["POST", TOKEN],
    ],
  );
  const [usercode, poll, , , exchange] = host.requests;
  assert.deepEqual(JSON.parse(usercode.body), { client_id: CLIENT_ID });
  assert.deepEqual(JSON.parse(poll.body), {
    device_auth_id: "device-1",
    user_code: "ABCD-1234",
  });
  assert.equal(exchange.headers["Content-Type"], FORM);
  assert.deepEqual(formOf(exchange), {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code: "auth-code-1",
    code_verifier: "verifier-1",
    redirect_uri: "https://auth.openai.com/deviceauth/callback",
  });
  assert.deepEqual(host.sleeps, [3000, 3000, 3000]);

  assert.deepEqual(result, {
    ok: true,
    credentials: {
      accessToken: ACCESS,
      refreshToken: "refresh-secret-1",
      expiresAt: NOW + 9000 + 3600000,
      signedInAt: NOW + 9000,
      identity: {
        accountId: "acct-1",
        organizationId: "acct-1",
        email: "maxi@example.com",
        organization: null,
        plan: "Plus",
      },
    },
  });
});

test("presents the device page, the code and a 15-minute deadline", async () => {
  const { host, io } = signIn();
  await login(io);
  assert.deepEqual(host.presented, [
    { url: DEVICE, code: "ABCD-1234", deadline: NOW + 900000 },
  ]);
  assert.deepEqual(host.opened, [DEVICE]);
});

test("polls every 5 seconds when OpenAI gives no interval", async () => {
  const { host, io } = signIn({
    device: {
      status: 200,
      body: { device_auth_id: "device-1", user_code: "ABCD-1234" },
    },
    polls: [{ status: 403 }, { status: 200, body: APPROVED }],
  });
  const result = await login(io);
  assert.equal(result.ok, true);
  assert.deepEqual(host.sleeps, [5000, 5000]);
});

test("a numeric interval is taken in seconds", async () => {
  const { host, io } = signIn({
    device: { status: 200, body: { ...DEVICE_CODE, interval: 7 } },
    polls: [{ status: 404 }, { status: 200, body: APPROVED }],
  });
  await login(io);
  assert.deepEqual(host.sleeps, [7000, 7000]);
});

test("cancelling stops the polling", async () => {
  let host;
  const signing = signIn({
    polls: [{ status: 403 }],
    // The dialog closes once the first poll has been answered.
    cancelled: () => host.requests.length >= 2,
  });
  host = signing.host;
  const result = await login(signing.io);
  assert.deepEqual(result, { ok: false, kind: "cancelled" });
  assert.deepEqual(
    host.requests.map((request) => request.url),
    [USERCODE, POLL],
  );
});

test("15 minutes without an approval is a timeout", async () => {
  const { host, io } = signIn({
    device: { status: 200, body: { ...DEVICE_CODE, interval: 5 } },
    polls: [{ status: 403 }],
  });
  const result = await login(io);
  assert.deepEqual(result, { ok: false, kind: "timeout" });
  // 180 sleeps of 5 s reach the deadline; the 180th is not followed by a poll.
  assert.equal(host.sleeps.length, 180);
  assert.equal(host.clock.now, NOW + 900000);
  assert.equal(host.requests.filter((r) => r.url === POLL).length, 179);
  assert.equal(host.requests.filter((r) => r.url === TOKEN).length, 0);
});

test("identity from the id token when the access token has none", async () => {
  const { io } = signIn({
    exchange: {
      status: 200,
      body: { ...TOKENS, access_token: BARE_ACCESS },
    },
  });
  const result = await login(io);
  assert.equal(result.ok, true);
  assert.equal(result.credentials.accessToken, BARE_ACCESS);
  assert.deepEqual(result.credentials.identity, {
    accountId: "acct-2",
    organizationId: "acct-2",
    email: "other@example.com",
    organization: null,
    plan: "Pro",
  });
});

test("no account id in either token is unexpected", async () => {
  const { io } = signIn({
    exchange: {
      status: 200,
      body: { ...TOKENS, access_token: BARE_ACCESS, id_token: BARE_ACCESS },
    },
  });
  const result = await login(io);
  assert.deepEqual(result, { ok: false, kind: "unexpected" });
  assertNoSecret(result);
});

test("a rejected fetch is a network failure", async () => {
  const host = fakeHost({
    respond() {
      throw new Error("offline");
    },
  });
  const result = await login(loginIo(host));
  assert.deepEqual(result, { ok: false, kind: "network" });
});

test("an exchange answered 4xx is rejected", async () => {
  const { io } = signIn({
    exchange: { status: 400, body: { error: "invalid_grant auth-code-1" } },
  });
  const result = await login(io);
  assert.deepEqual(result, { ok: false, kind: "rejected" });
  assertNoSecret(result);
});

test("an exchange answered 500 is unexpected", async () => {
  const { io } = signIn({
    exchange: { status: 500, body: `failed for verifier-1` },
  });
  const result = await login(io);
  assert.deepEqual(result, { ok: false, kind: "unexpected" });
  assertNoSecret(result);
});

test("a poll answered with another status is unexpected", async () => {
  const { host, io } = signIn({ polls: [{ status: 500 }] });
  const result = await login(io);
  assert.deepEqual(result, { ok: false, kind: "unexpected" });
  assert.equal(host.requests.filter((r) => r.url === TOKEN).length, 0);
});

test("a missing field is unexpected", async () => {
  for (const answers of [
    { device: { status: 200, body: { user_code: "ABCD-1234" } } },
    { polls: [{ status: 200, body: { code_verifier: "verifier-1" } }] },
    {
      exchange: {
        status: 200,
        body: { ...TOKENS, refresh_token: undefined },
      },
    },
    { exchange: { status: 200, body: { ...TOKENS, expires_in: undefined } } },
  ]) {
    const { io } = signIn(answers);
    const result = await login(io);
    assert.deepEqual(result, { ok: false, kind: "unexpected" });
    assertNoSecret(result);
  }
});

// Refresh.

const CREDENTIALS = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  expiresAt: NOW - 1000,
  signedInAt: NOW - 86400000,
  identity: {
    accountId: "acct-1",
    organizationId: "acct-1",
    email: "maxi@example.com",
    organization: null,
    plan: "Plus",
  },
};

async function refreshWith(answer) {
  const host = fakeHost({ respond: answer });
  const result = await refresh(CREDENTIALS, {
    fetch: host.fetch,
    now: host.now,
  });
  return { host, result };
}

test("refresh posts the refresh token as a form", async () => {
  const { host } = await refreshWith(() => ({
    status: 200,
    body: { access_token: "new-access", expires_in: 3600 },
  }));
  assert.equal(host.requests.length, 1);
  const [request] = host.requests;
  assert.equal(request.url, TOKEN);
  assert.equal(request.method, "POST");
  assert.equal(request.headers["Content-Type"], FORM);
  assert.deepEqual(formOf(request), {
    grant_type: "refresh_token",
    refresh_token: "old-refresh",
    client_id: CLIENT_ID,
  });
});

test("refresh takes a rotated refresh token", async () => {
  const { result } = await refreshWith(() => ({
    status: 200,
    body: {
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    },
  }));
  assert.deepEqual(result, {
    ok: true,
    credentials: {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: NOW + 3600000,
    },
  });
});

test("refresh keeps the old refresh token when none comes back", async () => {
  const { result } = await refreshWith(() => ({
    status: 200,
    body: { access_token: "new-access", expires_in: 864000 },
  }));
  assert.deepEqual(result, {
    ok: true,
    credentials: {
      accessToken: "new-access",
      refreshToken: "old-refresh",
      expiresAt: NOW + 864000000,
    },
  });
});

test("a refused refresh token ends the login", async () => {
  for (const status of [400, 401, 403]) {
    const { result } = await refreshWith(() => ({
      status,
      body: { error: "invalid_grant old-refresh" },
    }));
    assert.deepEqual(result, { ok: false, kind: "auth" }, String(status));
  }
});

test("refresh failures that are not the token's", async () => {
  const offline = await refreshWith(() => {
    throw new Error("offline old-refresh");
  });
  assert.deepEqual(offline.result, { ok: false, kind: "network" });
  const broken = await refreshWith(() => ({
    status: 500,
    body: "error for old-refresh",
  }));
  assert.deepEqual(broken.result, { ok: false, kind: "unexpected" });
  const empty = await refreshWith(() => ({ status: 200, body: {} }));
  assert.deepEqual(empty.result, { ok: false, kind: "unexpected" });
  for (const { result } of [offline, broken, empty]) {
    assert.ok(!JSON.stringify(result).includes("old-refresh"));
  }
});

test("the identity's plan reads as words", async () => {
  const access = jwt({
    "https://api.openai.com/auth": {
      chatgpt_account_id: "acct-1",
      chatgpt_plan_type: "self_serve_business_prolite",
    },
    "https://api.openai.com/profile": { email: "maxi@example.com" },
  });
  const { io } = signIn({
    exchange: { status: 200, body: { ...TOKENS, access_token: access } },
  });
  const result = await login(io);
  assert.equal(result.ok, true);
  assert.equal(result.credentials.identity.plan, "Self serve business prolite");
});
