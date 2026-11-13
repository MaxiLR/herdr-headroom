// Claude (a Claude Pro or Max subscription): signs in the way Claude Code does
// when the browser cannot call back (the page shows a code to paste), refreshes
// the rotating tokens and reads the account's usage windows. The method and its
// constants are oh-my-pi's (MIT).
import { base64url, challengeOf } from "../logic/pkce.js";

export const id = "claude";
export const name = "Claude";
// A Claude login ends 30 days after sign-in whatever happens in between.
export const loginTtlMs = 2592000000;

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const REDIRECT_URI = "https://platform.claude.com/oauth/code/callback";
const SCOPES =
  "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
const TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const BETA = "oauth-2025-04-20";

const WEEK_MS = 604800000;
const WEEKLY = { id: "7d", label: "Weekly", durationMs: WEEK_MS };
const FIVE_HOUR = { id: "5h", label: "5-hour", durationMs: 18000000 };
// `seven_day_<model>`: a per-model weekly bucket; `seven_day_oauth_apps` is not.
const MODEL_BUCKET = /^seven_day_([a-z0-9]+)$/i;

// A failure of a known kind, so no message ever carries a response body.
class Failure {
  constructor(kind) {
    this.kind = kind;
  }
}

const failed = (error) => ({
  ok: false,
  kind: error instanceof Failure ? error.kind : "unexpected",
});

async function request(io, url, options) {
  try {
    return await io.fetch(url, options);
  } catch {
    throw new Failure("network");
  }
}

function postJson(io, headers, body) {
  return request(io, TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function jsonOf(response) {
  if (!response.ok) throw new Failure("unexpected");
  const body = await response.json();
  if (!isRecord(body)) throw new Failure("unexpected");
  return body;
}

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// `value` when it is a non-empty string; otherwise a failure.
function required(value) {
  if (typeof value !== "string" || value === "") {
    throw new Failure("unexpected");
  }
  return value;
}

// `expires_in` (seconds) from `now`, in ms.
function expiry(tokens, now) {
  const seconds = tokens.expires_in;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    throw new Failure("unexpected");
  }
  return now + seconds * 1000;
}

// The code and the state in what the person pasted: `code#state`, a bare
// code, or the whole redirect address. A state is null when none was pasted.
function pastedParts(pasted) {
  const text = String(pasted).trim();
  const query = text.indexOf("?");
  if (query !== -1) {
    const params = new URLSearchParams(text.slice(query + 1).split("#")[0]);
    return { code: params.get("code"), state: params.get("state") || null };
  }
  const hash = text.indexOf("#");
  if (hash === -1) return { code: text, state: null };
  return { code: text.slice(0, hash), state: text.slice(hash + 1) || null };
}

export async function login(io) {
  try {
    const verifier = base64url(io.random(32));
    const state = base64url(io.random(32));
    const params = new URLSearchParams({
      code: "true",
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge: challengeOf(verifier),
      code_challenge_method: "S256",
      state,
    });
    const url = `${AUTHORIZE_URL}?${params}`;
    io.present({ url });
    await io.openUrl(url);
    const pasted = await io.readCode();
    if (pasted == null) return { ok: false, kind: "cancelled" };
    const parts = pastedParts(pasted);
    if (parts.state !== null && parts.state !== state) {
      return { ok: false, kind: "state" };
    }
    const code = required(parts.code);
    const response = await postJson(
      io,
      {},
      {
        grant_type: "authorization_code",
        code,
        state,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      },
    );
    if (response.status >= 400 && response.status < 500) {
      return { ok: false, kind: "rejected" };
    }
    const tokens = await jsonOf(response);
    const account = isRecord(tokens.account) ? tokens.account : {};
    const organization = isRecord(tokens.organization)
      ? tokens.organization
      : {};
    const signedInAt = io.now();
    return {
      ok: true,
      credentials: {
        accessToken: required(tokens.access_token),
        refreshToken: required(tokens.refresh_token),
        expiresAt: expiry(tokens, signedInAt),
        signedInAt,
        identity: {
          accountId: required(account.uuid),
          organizationId: required(organization.uuid),
          email: account.email_address ?? null,
          organization: organization.name ?? null,
          plan: null,
        },
      },
    };
  } catch (error) {
    return failed(error);
  }
}

export async function refresh(credentials, io) {
  try {
    const response = await postJson(
      io,
      { "anthropic-beta": BETA },
      {
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: CLIENT_ID,
      },
    );
    if ([400, 401, 403].includes(response.status)) {
      return { ok: false, kind: "auth" };
    }
    const tokens = await jsonOf(response);
    return {
      ok: true,
      credentials: {
        accessToken: required(tokens.access_token),
        // The refresh token rotates; keep the old one only if none came back.
        refreshToken:
          typeof tokens.refresh_token === "string" && tokens.refresh_token
            ? tokens.refresh_token
            : credentials.refreshToken,
        expiresAt: expiry(tokens, io.now()),
      },
    };
  } catch (error) {
    return failed(error);
  }
}

function numberOf(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function timeOf(value) {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// `{ utilization, resetsAt }` from a usage bucket, or null when it reports
// neither.
function bucketOf(utilization, resetsAt) {
  const bucket = {
    utilization: numberOf(utilization),
    resetsAt: timeOf(resetsAt),
  };
  return bucket.utilization === null && bucket.resetsAt === null
    ? null
    : bucket;
}

const usageBucket = (raw) =>
  isRecord(raw) ? bucketOf(raw.utilization, raw.resets_at) : null;

// The entries of `limits` that report something, as oh-my-pi reads them.
// `is_active` is ignored: it ranks the binding limit, it does not say whether
// a bucket exists.
function limitEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.kind !== "string") continue;
    const bucket = bucketOf(entry.percent, entry.resets_at);
    if (!bucket) continue;
    const displayName = entry.scope?.model?.display_name;
    entries.push({
      kind: entry.kind,
      bucket,
      displayName:
        typeof displayName === "string" && displayName.trim() !== ""
          ? displayName.trim()
          : null,
    });
  }
  return entries;
}

const slugOf = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function windowOf(known, bucket) {
  if (bucket?.utilization == null) return null;
  const { utilization, resetsAt } = bucket;
  return {
    ...known,
    usedFraction: Math.min(Math.max(utilization, 0), 100) / 100,
    resetsAt,
    atLimit: utilization >= 100,
  };
}

function windowsOf(usage) {
  const entries = limitEntries(usage.limits);
  const first = (kind) =>
    entries.find((entry) => entry.kind === kind)?.bucket ?? null;
  const windows = [
    windowOf(WEEKLY, usageBucket(usage.seven_day) ?? first("weekly_all")),
    windowOf(FIVE_HOUR, usageBucket(usage.five_hour) ?? first("session")),
  ];
  const models = new Set();
  for (const [key, raw] of Object.entries(usage)) {
    const model = MODEL_BUCKET.exec(key)?.[1];
    if (!model) continue;
    const window = windowOf(
      {
        id: `7d:${model.toLowerCase()}`,
        label: `Weekly · ${model[0].toUpperCase()}${model.slice(1)}`,
        durationMs: WEEK_MS,
      },
      usageBucket(raw),
    );
    if (!window) continue;
    models.add(model.toLowerCase());
    windows.push(window);
  }
  for (const entry of entries) {
    if (entry.kind !== "weekly_scoped" || !entry.displayName) continue;
    const slug = slugOf(entry.displayName);
    if (slug === "" || models.has(slug)) continue;
    models.add(slug);
    windows.push(
      windowOf(
        {
          id: `7d:${slug}`,
          label: `Weekly · ${entry.displayName}`,
          durationMs: WEEK_MS,
        },
        entry.bucket,
      ),
    );
  }
  return windows.filter(Boolean);
}

export async function read(credentials, io) {
  try {
    const response = await request(io, USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "anthropic-beta": BETA,
      },
    });
    if (response.status === 401) return { ok: false, kind: "auth" };
    const usage = await jsonOf(response);
    return { ok: true, windows: windowsOf(usage), plan: null };
  } catch (error) {
    return failed(error);
  }
}
