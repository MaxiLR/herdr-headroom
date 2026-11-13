// Codex (a ChatGPT subscription): signs in with OpenAI's device code,
// refreshes its access token and reads the account's usage windows.
// The method and the constants follow oh-my-pi's Codex provider (MIT).

export const id = "codex";
export const name = "Codex";
// A Codex login does not end on its own.
export const loginTtlMs = null;
// An active Codex account is read every minute, as Codex's own client does.
export const activeEveryMs = 60000;

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

// Window lengths in seconds with a name of their own.
const NAMED_LENGTHS = {
  18000: { id: "5h", label: "5-hour" },
  604800: { id: "7d", label: "Weekly" },
};
// Other lengths are named in the largest of these units that divides them.
const UNITS = [
  { seconds: 86400, id: "d", label: "day" },
  { seconds: 3600, id: "h", label: "hour" },
  { seconds: 60, id: "m", label: "minute" },
  { seconds: 1, id: "s", label: "second" },
];

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

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isText = (value) => typeof value === "string" && value !== "";

// `value` as a finite number, or null.
function numberOf(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ensure(condition) {
  if (!condition) throw new Failure("unexpected");
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

function postForm(io, url, fields) {
  return request(io, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

// The body of a successful response as an object.
async function objectOf(response) {
  ensure(response.ok);
  const body = await response.json();
  ensure(isObject(body));
  return body;
}

// A plan as words: `self_serve_business_prolite` reads `Self serve business
// prolite`. A plan that is not text is null.
function planWords(plan) {
  if (!isText(plan)) return null;
  const words = plan.replaceAll("_", " ");
  return words[0].toUpperCase() + words.slice(1);
}

// The payload of a JWT, unverified, or null.
function claimsOf(token) {
  const part = typeof token === "string" ? token.split(".")[1] : undefined;
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return isObject(claims) ? claims : null;
  } catch {
    return null;
  }
}

// Who signed in, from the access token's claims, else the id token's.
function identityOf(tokens) {
  for (const token of [tokens.access_token, tokens.id_token]) {
    const claims = claimsOf(token);
    const auth = claims?.[AUTH_CLAIM];
    if (!isText(auth?.chatgpt_account_id)) continue;
    const email = claims[PROFILE_CLAIM]?.email;
    return {
      accountId: auth.chatgpt_account_id,
      organizationId: auth.chatgpt_account_id,
      email: isText(email) ? email : null,
      organization: null,
      plan: planWords(auth.chatgpt_plan_type),
    };
  }
  throw new Failure("unexpected");
}

// Waits for the person to approve the device code on OpenAI's page, polling
// as often as OpenAI asks; the approval, or a failure.
async function approval(io, device) {
  const interval = numberOf(device.interval);
  const waitMs = (interval > 0 ? interval : DEFAULT_INTERVAL_S) * 1000;
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
    const approved = await objectOf(response);
    ensure(isText(approved.authorization_code));
    ensure(isText(approved.code_verifier));
    return approved;
  }
}

export async function login(io) {
  try {
    const device = await objectOf(
      await postJson(io, USERCODE_URL, { client_id: CLIENT_ID }),
    );
    ensure(isText(device.device_auth_id) && isText(device.user_code));
    const approved = await approval(io, device);
    const response = await postForm(io, TOKEN_URL, {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: approved.authorization_code,
      code_verifier: approved.code_verifier,
      redirect_uri: REDIRECT_URI,
    });
    if (response.status >= 400 && response.status < 500) {
      throw new Failure("rejected");
    }
    const tokens = await objectOf(response);
    const expiresIn = numberOf(tokens.expires_in);
    ensure(isText(tokens.access_token) && isText(tokens.refresh_token));
    ensure(expiresIn !== null);
    const identity = identityOf(tokens);
    const signedInAt = io.now();
    return {
      ok: true,
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: signedInAt + expiresIn * 1000,
        signedInAt,
        identity,
      },
    };
  } catch (error) {
    return failed(error);
  }
}

export async function refresh(credentials, io) {
  try {
    const response = await postForm(io, TOKEN_URL, {
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: CLIENT_ID,
    });
    if ([400, 401, 403].includes(response.status)) {
      return { ok: false, kind: "auth" };
    }
    const tokens = await objectOf(response);
    const expiresIn = numberOf(tokens.expires_in);
    ensure(isText(tokens.access_token) && expiresIn !== null);
    return {
      ok: true,
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: isText(tokens.refresh_token)
          ? tokens.refresh_token
          : credentials.refreshToken,
        expiresAt: io.now() + expiresIn * 1000,
      },
    };
  } catch (error) {
    return failed(error);
  }
}

// The id and label of a window `seconds` long.
function lengthName(seconds) {
  const named = NAMED_LENGTHS[seconds];
  if (named) return named;
  const unit = UNITS.find((unit) => seconds % unit.seconds === 0);
  const count = seconds / unit.seconds;
  return { id: `${count}${unit.id}`, label: `${count}-${unit.label}` };
}

// The windows of one rate limit, longest first, named by `naming(length)`;
// a reached limit marks the fullest window and any at 100 %.
function windowsOf(limit, now, naming) {
  if (!isObject(limit)) return [];
  const slots = [limit.primary_window, limit.secondary_window].filter(
    (slot) =>
      isObject(slot) &&
      Number.isInteger(numberOf(slot.limit_window_seconds)) &&
      slot.limit_window_seconds > 0,
  );
  const percents = slots.map((slot) => numberOf(slot.used_percent) ?? 0);
  const fullest = Math.max(...percents);
  return slots
    .map((slot, index) => {
      const seconds = numberOf(slot.limit_window_seconds);
      const percent = percents[index];
      const resetAt = numberOf(slot.reset_at);
      const resetAfter = numberOf(slot.reset_after_seconds);
      return {
        ...naming(lengthName(seconds)),
        durationMs: seconds * 1000,
        usedFraction: Math.min(1, Math.max(0, percent / 100)),
        resetsAt:
          resetAt !== null
            ? resetAt * 1000
            : resetAfter !== null
              ? now + resetAfter * 1000
              : null,
        atLimit:
          limit.limit_reached === true &&
          (percent === fullest || percent >= 100),
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs);
}

// The windows of a named additional rate limit, for the detail view.
function additionalWindows(entry, now) {
  if (!isObject(entry) || !isText(entry.limit_name)) return [];
  const slug = entry.limit_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return windowsOf(entry.rate_limit, now, (length) => ({
    id: `extra:${slug}:${length.id}`,
    label: `${entry.limit_name} · ${length.label}`,
  }));
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
    const usage = await objectOf(response);
    const now = io.now();
    const additional = Array.isArray(usage.additional_rate_limits)
      ? usage.additional_rate_limits
      : [];
    const windows = [
      ...windowsOf(usage.rate_limit, now, (length) => length),
      ...additional.flatMap((entry) => additionalWindows(entry, now)),
    ];
    return { ok: true, windows, plan: planWords(usage.plan_type) };
  } catch (error) {
    return failed(error);
  }
}
