import { test } from "node:test";
import assert from "node:assert/strict";
import * as claude from "../mods/headroom/providers/claude.js";
import { NOW, fakeHost, loginIo } from "./helpers/fakes.mjs";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE = "https://claude.ai/oauth/authorize";
const REDIRECT = "https://platform.claude.com/oauth/code/callback";
const SCOPES =
  "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
const TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";

// `random` below fills its first answer with 1s and its second with 2s, so
// the verifier and the state are these, and the challenge is the verifier's.
const VERIFIER = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";
const STATE = "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";
const CHALLENGE = "VtX6czP210fbQsI5QH5dpMMvTHnzXQkrE0_TWkAtnFw";

const ACCESS = "sk-ant-oat01-secret-access";
const REFRESH = "sk-ant-ort01-secret-refresh";

const TOKENS = {
  token_type: "Bearer",
  access_token: ACCESS,
  refresh_token: REFRESH,
  expires_in: 28800,
  scope: SCOPES,
  account: { uuid: "acct-1", email_address: "maxi@example.com" },
  organization: { uuid: "org-1", name: "Maxi's Org" },
};

function signIn({ code, respond = () => ({ status: 200, body: TOKENS }) }) {
  const host = fakeHost({ respond });
  let calls = 0;
  const io = {
    ...loginIo(host, { code }),
    random(n) {
      calls += 1;
      return new Uint8Array(n).fill(calls);
    },
  };
  return { host, result: claude.login(io) };
}

test("the authorize address carries every parameter, shown and opened", async () => {
  const { host, result } = signIn({ code: null });
  assert.deepEqual(await result, { ok: false, kind: "cancelled" });
  assert.equal(host.opened.length, 1);
  const url = new URL(host.opened[0]);
  assert.equal(`${url.origin}${url.pathname}`, AUTHORIZE);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    code: "true",
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT,
    scope: SCOPES,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: STATE,
  });
  assert.deepEqual(host.presented, [{ url: host.opened[0] }]);
  assert.deepEqual(host.requests, []);
});

const EXCHANGE = {
  url: TOKEN_URL,
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: {
    grant_type: "authorization_code",
    code: "auth-code-1",
    state: STATE,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    code_verifier: VERIFIER,
  },
};

const sent = (host) =>
  host.requests.map((request) => ({
    ...request,
    body: JSON.parse(request.body),
  }));

for (const [name, pasted] of [
  ["code#state", `auth-code-1#${STATE}`],
  ["a bare code", "  auth-code-1\n"],
  ["a full redirect address", `${REDIRECT}?code=auth-code-1&state=${STATE}`],
]) {
  test(`${name} exchanges the code`, async () => {
    const { host, result } = signIn({ code: pasted });
    assert.equal((await result).ok, true);
    assert.deepEqual(sent(host), [EXCHANGE]);
  });
}

test("a pasted state that is not ours is refused without a request", async () => {
  const { host, result } = signIn({ code: "auth-code-1#someone-elses-state" });
  assert.deepEqual(await result, { ok: false, kind: "state" });
  assert.deepEqual(host.requests, []);
  const other = signIn({
    code: `${REDIRECT}?code=auth-code-1&state=someone-elses-state`,
  });
  assert.deepEqual(await other.result, { ok: false, kind: "state" });
  assert.deepEqual(other.host.requests, []);
});

test("the identity and the tokens land on the credentials", async () => {
  const { result } = signIn({ code: `auth-code-1#${STATE}` });
  assert.deepEqual(await result, {
    ok: true,
    credentials: {
      accessToken: ACCESS,
      refreshToken: REFRESH,
      expiresAt: NOW + 28800000,
      signedInAt: NOW,
      identity: {
        accountId: "acct-1",
        organizationId: "org-1",
        email: "maxi@example.com",
        organization: "Maxi's Org",
        plan: null,
      },
    },
  });
});

test("an organization without a name is null", async () => {
  const { result } = signIn({
    code: "auth-code-1",
    respond: () => ({
      status: 200,
      body: { ...TOKENS, organization: { uuid: "org-1" } },
    }),
  });
  const { credentials } = await result;
  assert.equal(credentials.identity.organization, null);
  assert.equal(credentials.identity.organizationId, "org-1");
});

const failing = async (respond) => {
  const { result } = signIn({ code: "auth-code-1", respond });
  const answer = await result;
  assert.equal(JSON.stringify(answer).includes("secret"), false);
  return answer;
};

test("a 400 on the exchange is rejected", async () => {
  assert.deepEqual(
    await failing(() => ({
      status: 400,
      body: { error: "invalid_grant", error_description: "Invalid code" },
    })),
    { ok: false, kind: "rejected" },
  );
});

test("a rejected fetch is network, another status unexpected", async () => {
  assert.deepEqual(
    await failing(() => {
      throw new Error("offline");
    }),
    { ok: false, kind: "network" },
  );
  assert.deepEqual(
    await failing(() => ({ status: 500, body: `oops ${ACCESS}` })),
    { ok: false, kind: "unexpected" },
  );
});

test("a missing token, account or organization is unexpected", async () => {
  for (const body of [
    { ...TOKENS, access_token: undefined },
    { ...TOKENS, refresh_token: undefined },
    { ...TOKENS, account: { email_address: "maxi@example.com" } },
    { ...TOKENS, organization: { name: "Maxi's Org" } },
    { ...TOKENS, organization: undefined },
  ]) {
    assert.deepEqual(await failing(() => ({ status: 200, body })), {
      ok: false,
      kind: "unexpected",
    });
  }
});

// Refresh.

const STORED = {
  accessToken: "sk-ant-oat01-secret-old-access",
  refreshToken: "sk-ant-ort01-secret-old-refresh",
  expiresAt: NOW - 1000,
  signedInAt: NOW - 86400000,
  identity: {
    accountId: "acct-1",
    organizationId: "org-1",
    email: "maxi@example.com",
    organization: "Maxi's Org",
    plan: null,
  },
};

async function refreshWith(respond) {
  const host = fakeHost({ respond });
  const result = await claude.refresh(STORED, {
    fetch: host.fetch,
    now: host.now,
  });
  assert.equal(JSON.stringify(result).includes("old"), false);
  return { host, result };
}

test("refresh posts the refresh token with the beta header and returns the rotated one", async () => {
  const { host, result } = await refreshWith(() => ({
    status: 200,
    body: {
      access_token: "sk-ant-oat01-new-access",
      refresh_token: "sk-ant-ort01-new-refresh",
      expires_in: 3600,
    },
  }));
  assert.deepEqual(sent(host), [
    {
      url: TOKEN_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
      },
      body: {
        grant_type: "refresh_token",
        refresh_token: "sk-ant-ort01-secret-old-refresh",
        client_id: CLIENT_ID,
      },
    },
  ]);
  assert.deepEqual(result, {
    ok: true,
    credentials: {
      accessToken: "sk-ant-oat01-new-access",
      refreshToken: "sk-ant-ort01-new-refresh",
      expiresAt: NOW + 3600000,
    },
  });
});

test("a refresh answered 400, 401 or 403 is auth", async () => {
  for (const status of [400, 401, 403]) {
    const { result } = await refreshWith(() => ({
      status,
      body: { error: "invalid_grant" },
    }));
    assert.deepEqual(result, { ok: false, kind: "auth" }, String(status));
  }
});

test("a refresh whose fetch rejects is network, a 500 unexpected", async () => {
  const offline = await refreshWith(() => {
    throw new Error("offline");
  });
  assert.deepEqual(offline.result, { ok: false, kind: "network" });
  const broken = await refreshWith(() => ({ status: 500, body: "oops" }));
  assert.deepEqual(broken.result, { ok: false, kind: "unexpected" });
  const empty = await refreshWith(() => ({ status: 200, body: {} }));
  assert.deepEqual(empty.result, { ok: false, kind: "unexpected" });
});

test("sign-in presents the address at once and completes without crypto.subtle", async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: (array) => array },
  });
  t.after(() => {
    Object.defineProperty(globalThis, "crypto", original);
  });
  assert.equal(globalThis.crypto.subtle, undefined);
  const { host, result } = signIn({ code: `auth-code-1#${STATE}` });
  // Nothing has been awaited yet: the address is already presented.
  assert.equal(host.presented.length, 1);
  const answer = await result;
  assert.equal(answer.ok, true);
  assert.deepEqual(sent(host), [EXCHANGE]);
  assert.equal(sent(host)[0].body.code_verifier, VERIFIER);
});
