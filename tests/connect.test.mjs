import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dialogState,
  errorText,
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
