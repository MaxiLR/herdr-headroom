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

// The reading `result` (a provider's `read` answer, or a failed refresh)
// gives at `now`. A failure keeps the windows and time of the last read that
// worked, as a stale reading; with none, it is an error.
export function readingOf(account, provider, result, previous, now) {
  if (result.ok) {
    return withLogin(
      {
        ...base(account, provider),
        plan: result.plan ?? account.identity.plan,
        status: "ok",
        fetchedAt: now,
        windows: result.windows,
      },
      account,
      provider,
    );
  }
  const earlier =
    (previous?.status === "ok" || previous?.status === "stale") &&
    previous.fetchedAt != null
      ? previous
      : null;
  const reading = earlier
    ? {
        ...base(account, provider),
        plan: earlier.plan ?? account.identity.plan,
        status: "stale",
        error: result.kind,
        fetchedAt: earlier.fetchedAt,
        windows: earlier.windows,
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

// An account whose login ended, as found at `now`.
export function signedOutReading(account, provider, now) {
  return withLogin(
    {
      ...base(account, provider),
      status: "signed-out",
      fetchedAt: now,
      windows: [],
    },
    account,
    provider,
  );
}
