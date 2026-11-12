// What one account's last read says, as `headroom.readings` holds it.

function base(account, provider) {
  return {
    id: account.id,
    provider: account.provider,
    label: account.label,
    plan: account.identity.plan,
  };
}

function withLogin(reading, account, provider) {
  if (provider.loginTtlMs == null) return reading;
  return { ...reading, loginEndsAt: account.signedInAt + provider.loginTtlMs };
}

// An account that has not been read yet.
export function firstReading(account, provider) {
  return withLogin(
    {
      ...base(account, provider),
      status: "stale",
      fetchedAt: null,
      windows: [],
    },
    account,
    provider,
  );
}

// The reading `result` (a provider's `read` answer) gives at `now`.
export function readingOf(account, provider, result, previous, now) {
  const reading = result.ok
    ? {
        ...base(account, provider),
        plan: result.plan ?? account.identity.plan,
        status: "ok",
        fetchedAt: now,
        windows: result.windows,
      }
    : {
        ...base(account, provider),
        status: "error",
        error: result.kind,
        fetchedAt: null,
        windows: [],
      };
  return withLogin(reading, account, provider);
}
