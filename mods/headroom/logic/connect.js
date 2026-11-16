// The connect dialog's words and its sign-in: the one line a failure reads
// as, the Codex countdown, and the `io` a provider signs in through.
import { countdown } from "./pace.js";

// The name a provider's own page goes by.
const PAGE_OWNER = { claude: "Claude", codex: "OpenAI" };

// The line each failure reads as; `cancelled` reads as none.
const ERRORS = {
  state: () => "That code is from another sign-in. Start again.",
  rejected: (provider) =>
    `${PAGE_OWNER[provider] ?? "The provider"} did not accept the code.`,
  timeout: () => "The sign-in timed out. Start again.",
  network: () => "Could not reach the provider.",
  unexpected: () => "Could not reach the provider.",
  vault: () => "Could not keep the login private, so nothing was stored.",
};

/** The one line a failed sign-in of `kind` reads as; null for none. */
export function errorText(kind, provider) {
  if (kind === "cancelled") return null;
  return (ERRORS[kind] ?? ERRORS.unexpected)(provider);
}

/** How long the Codex wait has left: `stops in 14m`; `<1m` once past. */
export function stopsIn(deadline, now) {
  return `stops in ${countdown(Math.max(0, deadline - now))}`;
}

/**
 * The dialog's state, plain data: the provider chosen (null while choosing),
 * what the provider presented (`{ url, code?, deadline? }`), the failure's
 * kind, whether a pasted code is being checked, whether the dialog closed,
 * and which value was just copied (`url` or `code`).
 */
export function dialogState(provider = null) {
  return {
    provider,
    shown: null,
    error: null,
    checking: false,
    closed: false,
    copied: null,
  };
}

// How long a copy reads `Copied`.
const COPIED_MS = 2000;

// Each state's current turn: a copy, a new step or a newly presented value
// takes the next one, so a wait that ends after it changes nothing.
const turns = new WeakMap();

function nextTurn(state) {
  const turn = (turns.get(state) ?? 0) + 1;
  turns.set(state, turn);
  return turn;
}

/**
 * Marks `what` (`url` or `code`) as just copied; 2 s later, through one
 * `sleep(ms)`, it reads as not copied and `refresh()` redraws. A later copy,
 * a new step or closing the dialog first leaves the state to them. Settles
 * when the wait ends.
 */
export async function markCopied(state, what, { sleep, refresh }) {
  const turn = nextTurn(state);
  state.copied = what;
  try {
    await sleep(COPIED_MS);
  } catch {
    return;
  }
  if (state.closed || turns.get(state) !== turn) return;
  state.copied = null;
  refresh();
}

/** Back to the choice of provider, in place. */
export function backToProviders(state) {
  nextTurn(state);
  Object.assign(state, dialogState());
}

/**
 * Starts signing in to `provider` through `store.connect`, keeping `state` in
 * step with it. `sleep(ms)` waits (a failure to wait stops the sign-in),
 * `refresh()` redraws, `connected(id)` runs once the account is stored.
 * Returns `{ submit(code), stop(), done }`: `submit` hands the pasted code to
 * the provider, `stop` cancels the sign-in, `done` settles when it ends.
 */
export function startSignIn(
  state,
  { provider, store, sleep, refresh, connected },
) {
  let stopped = false;
  let pending = null;
  let waiting = null;

  state.provider = provider;
  state.shown = null;
  state.error = null;
  state.checking = false;
  state.copied = null;
  nextTurn(state);

  function stop() {
    stopped = true;
    waiting?.(null);
    waiting = null;
  }

  const io = {
    async sleep(ms) {
      try {
        await sleep(ms);
      } catch {
        stop();
      }
    },
    present({ url, code, deadline }) {
      if (stopped) return;
      state.shown = { url };
      if (code !== undefined) state.shown.code = code;
      if (deadline !== undefined) state.shown.deadline = deadline;
      state.copied = null;
      nextTurn(state);
      refresh();
    },
    readCode() {
      if (stopped) return Promise.resolve(null);
      if (pending !== null) {
        const code = pending;
        pending = null;
        return Promise.resolve(code);
      }
      return new Promise((resolve) => {
        waiting = resolve;
      });
    },
    cancelled: () => stopped,
  };

  // Called at once, so the provider starts now; a throw reads as unexpected.
  const done = (async () => store.connect(provider, io))()
    .catch(() => ({ ok: false, kind: "unexpected" }))
    .then((result) => {
      if (stopped) return;
      state.checking = false;
      if (result.ok) {
        connected(result.id);
        return;
      }
      if (result.kind !== "cancelled") state.error = result.kind;
      refresh();
    });

  return {
    submit(code) {
      if (stopped || state.checking) return;
      state.checking = true;
      if (waiting) {
        waiting(code);
        waiting = null;
      } else {
        pending = code;
      }
    },
    stop,
    done,
  };
}
