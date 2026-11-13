// Fakes for the mod's host surface and for a provider's sign-in `io`, so the
// logic and the providers run under node without Herdr.

// A fixed moment: 12 November 2026, 09:00 UTC.
export const NOW = Date.UTC(2026, 10, 12, 9, 0, 0);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// A response as the runtime's `fetch` gives it: no response headers.
function response(status, body) {
  const text =
    body === undefined
      ? ""
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

// The host surface `createHost` returns, recording what the code under test
// asks of it. `respond(request)` answers a request with `{ status, body }` or
// throws to fail the network; every request is answered 404 without it.
// `exec(command, args)` answers a program; it answers code 0 without it.
export function fakeHost({
  now = NOW,
  platform = "macos",
  home = "/home/test/.config/herdr-app",
  respond,
  exec,
  layout = null,
} = {}) {
  let overlay = 0;
  const host = {
    clock: { now },
    state: {},
    sets: [],
    toasts: [],
    requests: [],
    files: {},
    commands: [],
    overlays: [],
    closed: [],
    opened: [],
    resizes: [],
    // `["show", id]` and `["hide", id]`, for each block shown or hidden.
    visibility: [],
    sleeps: [],
    presented: [],
    // Whether an agent in Herdr is working.
    busy: false,
    working: () => host.busy,
    platform,
    home,
    now: () => host.clock.now,
    random: (n) =>
      Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256),
    async fetch(url, options = {}) {
      const request = {
        url,
        method: options.method ?? "GET",
        headers: options.headers ?? {},
        body: options.body,
      };
      host.requests.push(request);
      const answer = respond ? await respond(request) : { status: 404 };
      return response(answer.status, answer.body);
    },
    async exec(command, args) {
      host.commands.push([command, args]);
      return exec ? exec(command, args) : { code: 0, stdout: "", stderr: "" };
    },
    async readText(path) {
      return host.files[path] ?? null;
    },
    async writeText(path, text, expected) {
      if ((host.files[path] ?? null) !== expected) {
        throw new Error(`stale snapshot: ${path}`);
      }
      host.files[path] = text;
      return null;
    },
    shared: (key) => host.state[key] ?? null,
    setShared(key, value) {
      host.state[key] = structuredClone(value);
      host.sets.push([key, structuredClone(value)]);
      return null;
    },
    notify(toast) {
      host.toasts.push(toast);
      return `toast-${host.toasts.length}`;
    },
    layout: () => layout,
    resize(id, px) {
      host.resizes.push({ id, px });
      return null;
    },
    show(id) {
      host.visibility.push(["show", id]);
      return null;
    },
    hide(id) {
      host.visibility.push(["hide", id]);
      return null;
    },
    openOverlay(spec) {
      host.overlays.push(spec);
      overlay += 1;
      return `overlay-${overlay}`;
    },
    closeOverlay(id) {
      host.closed.push(id);
      return null;
    },
    async openUrl(url) {
      host.opened.push(url);
      return true;
    },
  };
  return host;
}

// An `io` for a provider's `login` over `host`: sleeping moves the host's
// clock on, what the dialog is told to show is recorded, and the pasted code
// is `code`. `cancelled` is a boolean or a function giving one.
export function loginIo(host, { code, cancelled } = {}) {
  return {
    fetch: host.fetch,
    now: host.now,
    random: host.random,
    openUrl: host.openUrl,
    async sleep(ms) {
      host.sleeps.push(ms);
      host.clock.now += ms;
    },
    present(shown) {
      host.presented.push(shown);
    },
    readCode: async () => code ?? null,
    cancelled: () =>
      typeof cancelled === "function" ? cancelled() : Boolean(cancelled),
  };
}

const WINDOWS = {
  "5h": { label: "5-hour", durationMs: 5 * HOUR },
  "7d": { label: "Weekly", durationMs: 7 * DAY },
};

// A window with the label and duration of `id`; `7d:<model>` is a weekly
// window named by its model.
export function win(id, usedFraction, resetsAt, overrides = {}) {
  const known =
    WINDOWS[id] ??
    (id.startsWith("7d:")
      ? {
          label: id.slice(3, 4).toUpperCase() + id.slice(4),
          durationMs: 7 * DAY,
        }
      : { label: id, durationMs: null });
  return {
    id,
    label: known.label,
    durationMs: known.durationMs,
    usedFraction,
    resetsAt,
    atLimit: false,
    ...overrides,
  };
}

// A Claude reading labelled maxi, read at NOW: weekly at 41 % resetting in
// 4d 6h, 5-hour at 62 % resetting in 1h 48m.
export function reading(overrides = {}) {
  return {
    id: "claude:acct-maxi:org-maxi",
    provider: "claude",
    label: "maxi",
    plan: "Max",
    status: "ok",
    fetchedAt: NOW,
    windows: [
      win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR),
      win("5h", 0.62, NOW + HOUR + 48 * MINUTE),
    ],
    ...overrides,
  };
}
