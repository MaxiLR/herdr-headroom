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

// Whether `windows`, just read, differ from those of `previous`, the reading
// before: a window came or went, started, reached or left its limit, or its
// share used changed. Reset times are not compared: a provider's drift by
// milliseconds between reads. Nothing has moved since a reading that was
// never read or whose login had ended.
export function moved(previous, windows) {
  if (previous?.fetchedAt == null || previous.status === "signed-out") {
    return false;
  }
  if (previous.windows.length !== windows.length) return true;
  return windows.some((window) => {
    const before = previous.windows.find((one) => one.id === window.id);
    return (
      !before ||
      before.usedFraction !== window.usedFraction ||
      before.atLimit !== window.atLimit ||
      (before.resetsAt == null) !== (window.resetsAt == null)
    );
  });
}
