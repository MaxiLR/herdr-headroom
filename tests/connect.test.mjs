import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backToProviders,
  dialogState,
  errorText,
  markCopied,
  startSignIn,
  stopsIn,
} from "../mods/headroom/logic/connect.js";
import { NOW } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;

test("every sign-in failure reads as one line from its kind", () => {
  assert.equal(
    errorText("state", "claude"),
    "That code is from another sign-in. Start again.",
  );
  assert.equal(
    errorText("rejected", "claude"),
    "Claude did not accept the code.",
  );
  assert.equal(
    errorText("timeout", "codex"),
    "The sign-in timed out. Start again.",
  );
  assert.equal(errorText("network", "codex"), "Could not reach the provider.");
  assert.equal(
    errorText("unexpected", "claude"),
    "Could not reach the provider.",
  );
  assert.equal(
    errorText("vault", "claude"),
    "Could not keep the login private, so nothing was stored.",
  );
  assert.equal(errorText("cancelled", "claude"), null);
});

test("the Codex wait counts down to its deadline", () => {
  assert.equal(stopsIn(NOW + 14 * MINUTE, NOW), "stops in 14m");
  assert.equal(stopsIn(NOW - 2 * MINUTE, NOW), "stops in <1m");
});

// A store that records each `connect` and leaves it waiting until the test
// settles it with `finish(result)`.
function standInStore() {
  const calls = [];
  return {
    calls,
    connect(provider, io) {
      return new Promise((resolve) => {
        calls.push({ provider, io, finish: resolve });
      });
    },
  };
}

function begin(provider, overrides = {}) {
  const store = standInStore();
  const state = dialogState(provider);
  const seen = { refreshed: 0, connected: [] };
  const session = startSignIn(state, {
    provider,
    store,
    sleep: async () => {},
    refresh: () => {
      seen.refreshed += 1;
    },
    connected: (id) => seen.connected.push(id),
    ...overrides,
  });
  return { store, state, seen, session };
}

test("choosing Codex hands the store the four sign-in functions", () => {
  const { store } = begin("codex");
  assert.equal(store.calls.length, 1);
  const [{ provider, io }] = store.calls;
  assert.equal(provider, "codex");
  assert.deepEqual(Object.keys(io).sort(), [
    "cancelled",
    "present",
    "readCode",
    "sleep",
  ]);
  for (const name of ["sleep", "present", "readCode", "cancelled"]) {
    assert.equal(typeof io[name], "function", name);
  }
  assert.equal(io.cancelled(), false);
});

test("stopping a sign-in cancels it and a waiting readCode gets null", async () => {
  const { store, session } = begin("claude");
  const { io } = store.calls[0];
  const pasted = io.readCode();
  session.stop();
  assert.equal(io.cancelled(), true);
  assert.equal(await pasted, null);
  assert.equal(await io.readCode(), null);
});

test("Connect hands the pasted code to the waiting readCode", async () => {
  const { store, state, session } = begin("claude");
  const { io } = store.calls[0];
  const pasted = io.readCode();
  session.submit("abc#xyz");
  assert.equal(await pasted, "abc#xyz");
  assert.equal(state.checking, true);
});

test("what the provider presents is what the dialog shows", () => {
  const { store, state, seen } = begin("codex");
  store.calls[0].io.present({
    url: "https://auth.openai.com/codex/device",
    code: "WDJB-MJHT",
    deadline: NOW + 15 * MINUTE,
  });
  assert.deepEqual(state.shown, {
    url: "https://auth.openai.com/codex/device",
    code: "WDJB-MJHT",
    deadline: NOW + 15 * MINUTE,
  });
  assert.ok(seen.refreshed > 0);
});

test("a failed sign-in keeps its kind for the dialog's one line", async () => {
  const { store, state, session } = begin("codex");
  store.calls[0].finish({ ok: false, kind: "timeout" });
  await session.done;
  assert.equal(state.error, "timeout");
});

test("a cancelled sign-in leaves no error behind", async () => {
  const { store, state, session } = begin("claude");
  store.calls[0].finish({ ok: false, kind: "cancelled" });
  await session.done;
  assert.equal(state.error, null);
});

test("a connected account closes the dialog", async () => {
  const { store, seen, session } = begin("codex");
  store.calls[0].finish({ ok: true, id: "codex:acct-1" });
  await session.done;
  assert.deepEqual(seen.connected, ["codex:acct-1"]);
});

test("a sign-in stopped before it ends neither closes nor shows an error", async () => {
  const { store, state, seen, session } = begin("codex");
  session.stop();
  store.calls[0].finish({ ok: true, id: "codex:acct-1" });
  await session.done;
  assert.deepEqual(seen.connected, []);
  assert.equal(state.error, null);
});

// Waits that last until the test ends each one by hand with `end()`.
function handWaits() {
  const waits = [];
  return {
    waits,
    sleep: (ms) =>
      new Promise((resolve) => {
        waits.push({ ms, end: resolve });
      }),
  };
}

const CODEX_URL = "https://auth.openai.com/codex/device";

// A Codex sign-in that shows its code and address, with a redraw counter
// and hand-ended waits for Copied.
function copying() {
  const signIn = begin("codex");
  signIn.store.calls[0].io.present({ url: CODEX_URL, code: "WDJB-MJHT" });
  const { waits, sleep } = handWaits();
  const refresh = () => {
    signIn.seen.refreshed += 1;
  };
  const copy = (what) => markCopied(signIn.state, what, { sleep, refresh });
  return { ...signIn, waits, copy };
}

test("a copy reads Copied for 2 s, then Copy again with one redraw", async () => {
  const { state, seen, waits, copy } = copying();
  const before = seen.refreshed;
  const ended = copy("code");
  assert.equal(state.copied, "code");
  assert.equal(waits.length, 1);
  assert.equal(waits[0].ms, 2000);
  waits[0].end();
  await ended;
  assert.equal(state.copied, null);
  assert.equal(seen.refreshed - before, 1);
});

test("a second copy 1 s in keeps Copied until its own wait ends", async () => {
  const { state, seen, waits, copy } = copying();
  const before = seen.refreshed;
  const first = copy("url");
  const second = copy("url");
  assert.equal(waits.length, 2);
  waits[0].end();
  await first;
  assert.equal(state.copied, "url");
  assert.equal(seen.refreshed - before, 0);
  waits[1].end();
  await second;
  assert.equal(state.copied, null);
  assert.equal(seen.refreshed - before, 1);
});

test("a copy of the other value takes over the wait", async () => {
  const { state, waits, copy } = copying();
  const first = copy("url");
  copy("code");
  waits[0].end();
  await first;
  assert.equal(state.copied, "code");
});

test("Back before the wait ends leaves the choice as it is", async () => {
  const { state, seen, waits, copy, session } = copying();
  const ended = copy("code");
  session.stop();
  backToProviders(state);
  const choice = structuredClone(state);
  assert.deepEqual(choice, dialogState());
  const before = seen.refreshed;
  waits[0].end();
  await ended;
  assert.deepEqual(state, choice);
  assert.equal(seen.refreshed, before);
});

test("a new sign-in before the wait ends is left as it is", async () => {
  const { state, seen, waits, copy, session } = copying();
  const ended = copy("url");
  session.stop();
  startSignIn(state, {
    provider: "codex",
    store: {
      connect: (_provider, io) => {
        io.present({ url: CODEX_URL, code: "QRST-UVWX" });
        return new Promise(() => {});
      },
    },
    sleep: async () => {},
    refresh: () => {},
    connected: () => {},
  });
  const signedIn = structuredClone(state);
  assert.equal(signedIn.copied, null);
  const before = seen.refreshed;
  waits[0].end();
  await ended;
  assert.deepEqual(state, signedIn);
  assert.equal(seen.refreshed, before);
});

test("a newly presented code is left as it is when the wait ends", async () => {
  const { state, store, seen, waits, copy } = copying();
  const ended = copy("code");
  store.calls[0].io.present({ url: CODEX_URL, code: "QRST-UVWX" });
  const presented = structuredClone(state);
  assert.equal(presented.copied, null);
  const before = seen.refreshed;
  waits[0].end();
  await ended;
  assert.deepEqual(state, presented);
  assert.equal(seen.refreshed, before);
});

test("closing before the wait ends changes and redraws nothing", async () => {
  const { state, seen, waits, copy, session } = copying();
  const ended = copy("url");
  state.closed = true;
  session.stop();
  const closed = structuredClone(state);
  const before = seen.refreshed;
  waits[0].end();
  await ended;
  assert.deepEqual(state, closed);
  assert.equal(seen.refreshed, before);
});
