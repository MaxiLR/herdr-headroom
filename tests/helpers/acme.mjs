// A hand-made provider, `acme`, over a fake host: its token and usage
// endpoints answer what a test scripts, and the host records every request.
import assert from "node:assert/strict";
import { createStore } from "../../mods/headroom/logic/store.js";
import { NOW, fakeHost, win } from "./fakes.mjs";

export const MINUTE = 60 * 1000;
export const TOKEN_URL = "https://acme.test/token";
export const USAGE_URL = "https://acme.test/usage";
export const LOGIN_TTL_MS = 30 * 24 * 60 * MINUTE;
// How often an active acme account is read.
export const ACTIVE_EVERY_MS = 2 * MINUTE;

const HOME = "/home/test/.config/herdr-app";
export const VAULT = `${HOME}/headroom/vault.json`;

// The stored login of account `n`, its access token expiring in an hour.
export function login(n, overrides = {}) {
  return {
    id: `acme:acct-${n}:org-${n}`,
    provider: "acme",
    label: `user${n}`,
    position: n - 1,
    accessToken: `access-secret-${n}`,
    refreshToken: `refresh-secret-${n}`,
    expiresAt: NOW + 60 * MINUTE,
    signedInAt: NOW - MINUTE,
    identity: {
      accountId: `acct-${n}`,
      organizationId: `org-${n}`,
      email: `user${n}@example.com`,
      organization: null,
      plan: "Pro",
    },
    ...overrides,
  };
}

// The windows a usage answer reports: weekly at 41 %, 5-hour at 62 %.
export const WINDOWS = [
  win("7d", 0.41, NOW + 4 * 24 * 60 * MINUTE),
  win("5h", 0.62, NOW + 108 * MINUTE),
];

export const usageOk = (windows = WINDOWS) => ({
  status: 200,
  body: { windows },
});

// A refresh answer giving `access-secret-<n>-new` and `refresh-secret-<n>-new`
// for an hour.
export const tokenOk = (host, n) => ({
  status: 200,
  body: {
    access_token: `access-secret-${n}-new`,
    refresh_token: `refresh-secret-${n}-new`,
    expires_at: host.now() + 60 * MINUTE,
  },
});

// The provider: `read` asks USAGE_URL with the access token, `refresh` posts
// the refresh token to TOKEN_URL.
function acme() {
  async function call(io, url, options) {
    try {
      return { response: await io.fetch(url, options) };
    } catch {
      return { failed: { ok: false, kind: "network" } };
    }
  }
  return {
    id: "acme",
    name: "Acme",
    loginTtlMs: LOGIN_TTL_MS,
    activeEveryMs: ACTIVE_EVERY_MS,
    login: async () => ({ ok: false, kind: "cancelled" }),
    async read(credentials, io) {
      const { response, failed } = await call(io, USAGE_URL, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      if (failed) return failed;
      if (response.status === 401) return { ok: false, kind: "auth" };
      if (response.status !== 200) return { ok: false, kind: "unexpected" };
      const body = await response.json();
      return { ok: true, windows: body.windows, plan: null };
    },
    async refresh(credentials, io) {
      const { response, failed } = await call(io, TOKEN_URL, {
        method: "POST",
        body: JSON.stringify({ refresh_token: credentials.refreshToken }),
      });
      if (failed) return failed;
      if (response.status === 400) return { ok: false, kind: "auth" };
      if (response.status !== 200) return { ok: false, kind: "unexpected" };
      const body = await response.json();
      return {
        ok: true,
        credentials: {
          accessToken: body.access_token,
          refreshToken: body.refresh_token,
          expiresAt: body.expires_at,
        },
      };
    },
  };
}

// A store over a fake host whose vault holds `accounts`. `usage(request)`
// and `token(request)` answer the endpoints (`{ status, body }`, a promise of
// one, or a throw); the usage endpoint answers 200 with WINDOWS and the token
// endpoint 500 without them.
export function setup({ accounts = [login(1)], usage, token } = {}) {
  const host = fakeHost({
    respond(request) {
      if (request.url === USAGE_URL) return usage ? usage(request) : usageOk();
      if (request.url === TOKEN_URL) {
        return token ? token(request) : { status: 500 };
      }
      return { status: 404 };
    },
  });
  host.files[VAULT] = JSON.stringify({ version: 1, accounts }, null, 2);
  const store = createStore(host, { providers: { acme: acme() } });
  return { host, store };
}

export const usageRequests = (host) =>
  host.requests.filter((request) => request.url === USAGE_URL);
export const tokenRequests = (host) =>
  host.requests.filter((request) => request.url === TOKEN_URL);

// The access token a usage request carried.
export const bearerOf = (request) =>
  request.headers.Authorization.replace(/^Bearer /, "");

export const readings = (host) => host.state["headroom.readings"].accounts;
export const readingOf = (host, id) =>
  readings(host).find((reading) => reading.id === id);

export const vaultAccounts = (host) => JSON.parse(host.files[VAULT]).accounts;

// Lets every pending promise callback run.
export const settle = () => new Promise((resolve) => setImmediate(resolve));

// A promise and the function that resolves it.
export function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// No token from the vault, before or after a refresh, is in anything given
// to the shared state or to a toast.
export function assertNoToken(host) {
  const given = JSON.stringify([host.sets, host.toasts]);
  assert.doesNotMatch(given, /(access|refresh)-secret/, "a token is shared");
}

// A store like `setup`'s whose provider's `login` answers `logins` in turn:
// the sign-ins `connect` gets.
export function setupSigningIn({ logins = [], ...options } = {}) {
  const { host } = setup(options);
  const provider = {
    ...acme(),
    login: async () => logins.shift() ?? { ok: false, kind: "cancelled" },
  };
  return { host, store: createStore(host, { providers: { acme: provider } }) };
}
