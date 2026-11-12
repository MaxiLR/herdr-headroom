// The accounts, their logins and their readings: signs in, reads each account
// when its reading is old and publishes what it read.
import { providers as allProviders } from "../providers/index.js";
import { publish, published } from "./publish.js";
import { firstReading, readingOf } from "./readings.js";
import { createVault } from "./vault.js";

// A reading older than this is read again.
const READ_EVERY_MS = 5 * 60 * 1000;

export function createStore(host, { providers = allProviders } = {}) {
  const vault = createVault(host);
  let accounts = [];
  // Readings by account id; published in the accounts' order.
  const readings = new Map();
  // Reads running, by account id.
  const running = new Map();
  let started = null;

  const show = () =>
    publish(
      host,
      accounts.map((account) => readings.get(account.id)),
      host.now(),
    );

  function start() {
    started ??= (async () => {
      accounts = (await vault.load()).filter(
        (account) => providers[account.provider],
      );
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

  function readOne(id) {
    if (running.has(id)) return running.get(id);
    const job = (async () => {
      const account = accounts.find((item) => item.id === id);
      if (!account) return;
      const provider = providers[account.provider];
      let result;
      try {
        result = await provider.read(account, {
          fetch: host.fetch,
          now: host.now,
        });
      } catch {
        result = { ok: false, kind: "unexpected" };
      }
      const current = accounts.find((item) => item.id === id);
      if (!current) return;
      readings.set(
        id,
        readingOf(
          current,
          provider,
          result,
          readings.get(id) ?? null,
          host.now(),
        ),
      );
      show();
    })().finally(() => running.delete(id));
    running.set(id, job);
    return job;
  }

  const readAll = (ids) => Promise.all(ids.map(readOne)).then(() => undefined);

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
      const id = `${providerId}:${identity.accountId}:${identity.organizationId}`;
      const index = accounts.findIndex((account) => account.id === id);
      const previous = accounts[index];
      const account = {
        id,
        provider: providerId,
        label:
          previous?.label ?? (identity.email?.split("@")[0] || provider.name),
        position: previous?.position ?? accounts.length,
        accessToken: result.credentials.accessToken,
        refreshToken: result.credentials.refreshToken,
        expiresAt: result.credentials.expiresAt,
        signedInAt: result.credentials.signedInAt,
        identity,
      };
      const next =
        index === -1
          ? [...accounts, account]
          : accounts.map((item, at) => (at === index ? account : item));
      const saved = await vault.save(next);
      if (!saved.ok) return { ok: false, kind: saved.kind };
      accounts = next;
      if (!readings.has(id)) readings.set(id, firstReading(account, provider));
      show();
      await readOne(id);
      return { ok: true, id };
    },

    tick() {
      const now = host.now();
      return readAll(
        accounts
          .filter((account) => {
            const fetchedAt = readings.get(account.id)?.fetchedAt;
            return fetchedAt == null || now - fetchedAt > READ_EVERY_MS;
          })
          .map((account) => account.id),
      );
    },

    refresh(id) {
      return readAll(id ? [id] : accounts.map((account) => account.id));
    },
  };
}

let shared = null;

// The one store every copy of the mod uses.
export function sharedStore(host) {
  shared ??= createStore(host);
  return shared;
}
