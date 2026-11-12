// Codex (a ChatGPT subscription): signs in with OpenAI's device code and
// reads the account's usage windows.

export const id = "codex";
export const name = "Codex";
// A Codex login does not end on its own.
export const loginTtlMs = null;

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const USERCODE_URL = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const POLL_URL = "https://auth.openai.com/api/accounts/deviceauth/token";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const DEVICE_URL = "https://auth.openai.com/codex/device";
const REDIRECT_URI = "https://auth.openai.com/deviceauth/callback";
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

// How long the person has to approve the code.
const LOGIN_MS = 15 * 60 * 1000;
const DEFAULT_INTERVAL_S = 5;

const AUTH_CLAIM = "https://api.openai.com/auth";
const PROFILE_CLAIM = "https://api.openai.com/profile";

// Window lengths in seconds, and the windows they are.
const WINDOWS = {
  18000: { id: "5h", label: "5-hour", durationMs: 18000000 },
  604800: { id: "7d", label: "Weekly", durationMs: 604800000 },
};
// Weekly first.
const ORDER = ["7d", "5h"];

// A failure of a known kind, so no message ever carries a response body.
class Failure {
  constructor(kind) {
    this.kind = kind;
  }
}

async function request(io, url, options) {
  try {
    return await io.fetch(url, options);
  } catch {
    throw new Failure("network");
  }
}

function postJson(io, url, body) {
  return request(io, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function jsonOf(response) {
  if (!response.ok) throw new Failure("unexpected");
  return response.json();
}

const capitalized = (text) =>
  typeof text === "string" && text !== ""
    ? text[0].toUpperCase() + text.slice(1)
    : null;

// The payload of a JWT, unverified, or null.
function claimsOf(token) {
  const part = typeof token === "string" ? token.split(".")[1] : undefined;
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function identityOf(tokens) {
  for (const token of [tokens.access_token, tokens.id_token]) {
    const claims = claimsOf(token);
    const auth = claims?.[AUTH_CLAIM];
    if (!auth?.chatgpt_account_id) continue;
    return {
      accountId: auth.chatgpt_account_id,
      organizationId: auth.chatgpt_account_id,
      email: claims[PROFILE_CLAIM]?.email ?? null,
      organization: null,
      plan: capitalized(auth.chatgpt_plan_type),
    };
  }
  throw new Failure("unexpected");
}

// Waits for the person to approve `code` on OpenAI's page, polling as often
// as OpenAI asks; the approval's authorization code, or a failure.
async function approval(io, device) {
  const interval = Number(device.interval ?? DEFAULT_INTERVAL_S);
  const waitMs =
    (Number.isFinite(interval) && interval > 0
      ? interval
      : DEFAULT_INTERVAL_S) * 1000;
  const deadline = io.now() + LOGIN_MS;
  io.present({ url: DEVICE_URL, code: device.user_code, deadline });
  await io.openUrl(DEVICE_URL);
  for (;;) {
    await io.sleep(waitMs);
    if (io.cancelled()) throw new Failure("cancelled");
    if (io.now() >= deadline) throw new Failure("timeout");
    const response = await postJson(io, POLL_URL, {
      device_auth_id: device.device_auth_id,
      user_code: device.user_code,
    });
    if (response.status === 403 || response.status === 404) continue;
    return jsonOf(response);
  }
}

export async function login(io) {
  try {
    const device = await jsonOf(
      await postJson(io, USERCODE_URL, { client_id: CLIENT_ID }),
    );
    const approved = await approval(io, device);
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: approved.authorization_code,
      code_verifier: approved.code_verifier,
      redirect_uri: REDIRECT_URI,
    });
    const tokens = await jsonOf(
      await request(io, TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
    );
    const signedInAt = io.now();
    return {
      ok: true,
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: signedInAt + Number(tokens.expires_in) * 1000,
        signedInAt,
        identity: identityOf(tokens),
      },
    };
  } catch (error) {
    return {
      ok: false,
      kind: error instanceof Failure ? error.kind : "unexpected",
    };
  }
}

export async function refresh() {
  return { ok: false, kind: "unexpected" };
}

function windowOf(slot) {
  const known = WINDOWS[slot?.limit_window_seconds];
  if (!known) return null;
  return {
    ...known,
    usedFraction: Number(slot.used_percent) / 100,
    resetsAt: slot.reset_at == null ? null : slot.reset_at * 1000,
    atLimit: false,
  };
}

export async function read(credentials, io) {
  try {
    const response = await request(io, USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "ChatGPT-Account-Id": credentials.identity.accountId,
      },
    });
    if (response.status === 401) return { ok: false, kind: "auth" };
    const usage = await jsonOf(response);
    const limits = usage.rate_limit ?? {};
    const windows = [limits.primary_window, limits.secondary_window]
      .map(windowOf)
      .filter(Boolean)
      .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
    return { ok: true, windows, plan: capitalized(usage.plan_type) };
  } catch (error) {
    return {
      ok: false,
      kind: error instanceof Failure ? error.kind : "unexpected",
    };
  }
}
