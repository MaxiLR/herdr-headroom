// The accounts, their logins and their readings: signs in, reads each account
// when its reading is old, refreshing its token when needed, and publishes
// what it read. Every copy of the mod shares one store, which runs at most one
// operation per account at a time and one vault change at a time.
import { providers as allProviders } from "../providers/index.js";
import {
  accountId,
  defaultLabel,
  move,
  remove,
  rename,
  upsert,
} from "./accounts.js";
import { publish, published } from "./publish.js";
import { firstReading, readingOf, signedOutReading } from "./readings.js";
import { createVault } from "./vault.js";

// `tick` reads an account again once its last attempt is this old.
const READ_EVERY_MS = 5 * 60 * 1000;
// An access token expiring within this is refreshed before a read.
const REFRESH_BEFORE_MS = 5 * 60 * 1000;
// An operation running longer than this was abandoned: Herdr ended the tasks
// of the copy that started it.
const ABANDONED_AFTER_MS = 2 * 60 * 1000;
// A manual refresh reads no account whose read started less long ago.
const MANUAL_GAP_MS = 30 * 1000;

// The toast a vault save refused outside a sign-in posts; a sign-in says it
// in its dialog.
const REFUSED_TOAST = {
  title: "Could not keep the logins private, so nothing was stored",
  body: "Accounts may be gone after Herdr restarts.",
  level: "error",
};

// A provider's answer, or `unexpected` when it throws.
async function attempt(call) {
  try {
    return await call();
  } catch {
    return { ok: false, kind: "unexpected" };
  }
}

export function createStore(host, { providers = allProviders } = {}) {
  const vault = createVault(host);
  let accounts = [];
  // Readings by account id; published in the accounts' order.
  const readings = new Map();
  // The operation running on each account, `{ startedAt, job }`, by id.
  const running = new Map();
  // When each account's last operation started, by id.
  const attempts = new Map();
  let started = null;
  // The vault change running, `{ since, done }`, or null.
  let changing = null;

  const show = () =>
    publish(
      host,
      accounts.map((account) => ({
        ...readings.get(account.id),
        label: account.label,
      })),
      host.now(),
    );

  // Runs `work()` once no other vault change is running, or the one running
  // was abandoned: its copy closed while it waited on the vault.
  async function exclusively(work) {
    while (changing && host.now() - changing.since <= ABANDONED_AFTER_MS) {
      await changing.done;
    }
    const job = Promise.resolve().then(work);
    const entry = {
      since: host.now(),
      done: job.then(
        () => undefined,
        () => undefined,
      ),
    };
    changing = entry;
    entry.done.then(() => {
      if (changing === entry) changing = null;
    });
    return job;
  }

  // Runs `step(accounts)` → the next accounts after every change before it,
  // saves them and, once saved, keeps and publishes them.
  function change(step) {
    return exclusively(async () => {
      await start();
      const next = step(accounts);
      const saved = await vault.save(next);
      if (!saved.ok) return { ok: false, kind: saved.kind };
      accounts = next;
      for (const id of readings.keys()) {
        if (!accounts.some((account) => account.id === id)) readings.delete(id);
      }
      for (const account of accounts) {
        if (!readings.has(account.id)) {
          readings.set(
            account.id,
            firstReading(account, providers[account.provider]),
          );
        }
      }
      show();
      return { ok: true };
    });
  }

  function start() {
    started ??= (async () => {
      accounts = (await vault.load())
        .filter((account) => providers[account.provider])
        .sort((a, b) => a.position - b.position);
      const before = published(host);
      for (const account of accounts) {
        readings.set(
          account.id,
          before.find((reading) => reading.id === account.id) ??
            firstReading(account, providers[account.provider]),
        );
      }
      show();
    })();
    return started;
  }

  // Says why when the vault refused `answer`; gives `answer` back.
  function warn(answer) {
    if (!answer.ok && answer.kind === "vault") host.notify(REFUSED_TOAST);
    return answer;
  }

  const signedOut = (id) => readings.get(id)?.status === "signed-out";

  // Puts the tokens a refresh gave in place of the login whose refresh token
  // was `spent`, saved before they are used; when the vault cannot save them
  // they are kept in memory all the same, and the toast says why. A login replaced meanwhile stays.
  function keepTokens(id, spent, { accessToken, refreshToken, expiresAt }) {
    return exclusively(async () => {
      if (!accounts.some((a) => a.id === id && a.refreshToken === spent)) {
        return;
      }
      const next = accounts.map((account) =>
        account.id === id
          ? { ...account, accessToken, refreshToken, expiresAt }
          : account,
      );
      warn(await vault.save(next));
      accounts = next;
    });
  }

  // One read of account `id`, refreshing its token first when it expires
  // soon and once more on a 401; publishes what it found unless a newer
  // operation has replaced `entry`.
  async function operate(id, entry) {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    const provider = providers[account.provider];
    const io = { fetch: host.fetch, now: host.now };
    let login = account;

    // `{ ok: true }`, or the failure with `ended` when the provider rejected
    // the refresh token.
    async function renew() {
      const answer = await attempt(() => provider.refresh(login, io));
      if (!answer.ok) return { ...answer, ended: answer.kind === "auth" };
      await keepTokens(id, login.refreshToken, answer.credentials);
      const { accessToken, refreshToken, expiresAt } = answer.credentials;
      login = { ...login, accessToken, refreshToken, expiresAt };
      return { ok: true };
    }
    const read = () => attempt(() => provider.read(login, io));

    let result =
      typeof login.expiresAt === "number" &&
      login.expiresAt - host.now() <= REFRESH_BEFORE_MS
        ? await renew()
        : { ok: true };
    if (result.ok) {
      result = await read();
      if (!result.ok && result.kind === "auth") {
        const renewed = await renew();
        result = renewed.ok ? await read() : renewed;
      }
    }

    if (running.get(id) !== entry) return;
    const current = accounts.find((item) => item.id === id);
    if (!current) return;
    readings.set(
      id,
      result.ended
        ? signedOutReading(current, provider, host.now())
        : readingOf(
            current,
            provider,
            result,
            readings.get(id) ?? null,
            host.now(),
          ),
    );
    show();
  }

  // The operation on account `id`: the one running, unless it was abandoned
  // or `fresh` asks for a new one, or a new one.
  function operation(id, { fresh = false } = {}) {
    const now = host.now();
    const runningNow = running.get(id);
    if (
      !fresh &&
      runningNow &&
      now - runningNow.startedAt <= ABANDONED_AFTER_MS
    ) {
      return runningNow.job;
    }
    const entry = { startedAt: now };
    running.set(id, entry);
    attempts.set(id, now);
    entry.job = operate(id, entry).finally(() => {
      if (running.get(id) === entry) running.delete(id);
    });
    return entry.job;
  }

  const readAll = (ids) =>
    Promise.all(ids.map((id) => operation(id))).then(() => undefined);

  // Whether `tick` reads account `id` at `now`: never attempted, last
  // attempted long enough ago, or a window has reset since.
  function due(id, now) {
    const last = attempts.get(id);
    if (last == null || now - last >= READ_EVERY_MS) return true;
    return (readings.get(id)?.windows ?? []).some(
      (window) =>
        window.resetsAt != null &&
        window.resetsAt > last &&
        window.resetsAt <= now,
    );
  }

  return {
    start,

    accounts: () =>
      accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        label: account.label,
        email: account.identity.email,
        organization: account.identity.organization,
        plan: account.identity.plan,
        signedInAt: account.signedInAt,
      })),

    async connect(providerId, io) {
      const provider = providers[providerId];
      if (!provider) return { ok: false, kind: "unexpected" };
      await start();
      const result = await provider.login({
        fetch: host.fetch,
        now: host.now,
        random: host.random,
        openUrl: host.openUrl,
        ...io,
      });
      if (!result.ok) return { ok: false, kind: result.kind };
      const { identity } = result.credentials;
      const id = accountId(providerId, identity);
      const saved = await change((current) =>
        upsert(current, {
          id,
          provider: providerId,
          label: defaultLabel(
            identity,
            current.map((account) => account.label),
          ),
          position: current.length,
          accessToken: result.credentials.accessToken,
          refreshToken: result.credentials.refreshToken,
          expiresAt: result.credentials.expiresAt,
          signedInAt: result.credentials.signedInAt,
          identity,
        }),
      );
      if (!saved.ok) return saved;
      // A read with the new login, even while one with the old is running.
      await operation(id, { fresh: true });
      return { ok: true, id };
    },

    rename: (id, label) =>
      change((current) => rename(current, id, label)).then(warn),

    move: (id, delta) =>
      change((current) => move(current, id, delta)).then(warn),

    // Deletes the account's stored login and its reading.
    remove: (id) => change((current) => remove(current, id)).then(warn),

    tick() {
      const now = host.now();
      return readAll(
        accounts
          .map((account) => account.id)
          .filter((id) => !signedOut(id) && due(id, now)),
      );
    },

    // Reads account `id`, or every account, the person asked to; one whose
    // read started less than 30 seconds ago is not read again, though a read
    // still running is waited for.
    refresh(id) {
      const now = host.now();
      return readAll(
        accounts
          .map((account) => account.id)
          .filter((one) => !id || one === id)
          .filter(
            (one) =>
              !signedOut(one) &&
              (running.has(one) ||
                !(now - (attempts.get(one) ?? -Infinity) < MANUAL_GAP_MS)),
          ),
      );
    },
  };
}

let shared = null;

// The one store every copy of the mod uses.
export function sharedStore(host) {
  shared ??= createStore(host);
  return shared;
}
