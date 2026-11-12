import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, drawSource, texts, withId } from "./helpers/draw.mjs";
import { NOW } from "./helpers/fakes.mjs";

test("the connect dialog draws the code and the address to approve it at", (t) => {
  const lines = drawForm(t, "connect", {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 300 },
    ui: {
      connect: {
        shown: {
          url: "https://auth.openai.com/codex/device",
          code: "WDJB-MJHT",
        },
        error: null,
        closed: false,
      },
    },
  });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("WDJB-MJHT"), lines.join("\n"));
  assert.ok(
    drawn.includes("https://auth.openai.com/codex/device"),
    lines.join("\n"),
  );
  assert.ok(!drawn.includes("Could not reach the provider."), lines.join("\n"));
  assert.match(withId(lines, "cancel") ?? "", /:on_click/);
});

test("a failed sign-in says the provider could not be reached", (t) => {
  const lines = drawForm(t, "connect", {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 300 },
    ui: { connect: { shown: null, error: "network", closed: false } },
  });
  if (!lines) return;
  assert.ok(
    texts(lines).includes("Could not reach the provider."),
    lines.join("\n"),
  );
});

const CLAUDE_URL =
  "https://claude.ai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code";
const CODEX_URL = "https://auth.openai.com/codex/device";
const MINUTE = 60 * 1000;

// The dialog's own state, as plain data, at `step`.
function preloaded(fields) {
  return {
    provider: null,
    shown: null,
    error: null,
    checking: false,
    closed: false,
    copied: null,
    ...fields,
  };
}

function drawDialog(t, { connect = {}, state, width = 420 } = {}) {
  return drawForm(t, "connect", {
    props: { connect, overlay: "overlay-1" },
    size: { width, height: 360 },
    now: NOW,
    ui: state ? { connect: state } : {},
  });
}

const disabled = (line) => /:disabled\[Bool\(true\)\]/.test(line ?? "");

test("the dialog first asks which provider to sign in with", (t) => {
  const lines = drawDialog(t, { state: preloaded({}) });
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  for (const text of [
    "Connect an account",
    "Esc",
    "Claude",
    "Sign in with your Claude account",
    "Codex",
    "Sign in with your ChatGPT account",
    "You sign in on the provider's own page, in your browser. The login stays on this computer, in a file only you can read.",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${all}`);
  }
  assert.match(withId(lines, "choose-claude") ?? "", /:on_click/, all);
  assert.match(withId(lines, "choose-codex") ?? "", /:on_click/, all);
});

test("the choice keeps every word at 320 px", (t) => {
  const lines = drawDialog(t, { state: preloaded({}), width: 320 });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Sign in with your ChatGPT account"));
  assert.ok(
    drawn.includes(
      "You sign in on the provider's own page, in your browser. The login stays on this computer, in a file only you can read.",
    ),
  );
});

test("the Claude step shows the address and waits for a pasted code", (t) => {
  const lines = drawDialog(t, {
    state: preloaded({ provider: "claude", shown: { url: CLAUDE_URL } }),
  });
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  for (const text of [
    "Connect Claude",
    "Your browser opened Claude's sign-in page. Approve there, then copy the code it shows you.",
    "Sign-in address",
    CLAUDE_URL,
    "Code from Claude",
    "The whole address of the page that shows the code works too.",
    "Cancel",
    "Connect",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${all}`);
  }
  assert.match(withId(lines, "copy-url") ?? "", /:on_click/, all);
  assert.match(withId(lines, "open-url") ?? "", /:on_click/, all);
  assert.match(withId(lines, "cancel") ?? "", /:on_click/, all);
  assert.ok(disabled(withId(lines, "connect")), all);
});

test("the Codex step shows the code to enter and how long it waits", (t) => {
  const lines = drawDialog(t, {
    state: preloaded({
      provider: "codex",
      shown: { url: CODEX_URL, code: "WDJB-MJHT", deadline: NOW + 14 * MINUTE },
    }),
  });
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  for (const text of [
    "Connect Codex",
    "Your browser opened OpenAI's sign-in page. Enter this code there.",
    "WDJB-MJHT",
    "Sign-in address",
    CODEX_URL,
    "Waiting for you to approve",
    "stops in 14m",
    "Cancel",
  ]) {
    assert.ok(drawn.includes(text), `${text}\n${all}`);
  }
  assert.match(withId(lines, "copy-code") ?? "", /:on_click/, all);
  assert.match(withId(lines, "copy-url") ?? "", /:on_click/, all);
  assert.match(withId(lines, "open-url") ?? "", /:on_click/, all);
  assert.equal(withId(lines, "connect"), undefined, all);
});

for (const [kind, line] of [
  ["state", "That code is from another sign-in. Start again."],
  ["rejected", "Claude did not accept the code."],
  ["timeout", "The sign-in timed out. Start again."],
  ["network", "Could not reach the provider."],
  ["unexpected", "Could not reach the provider."],
  ["vault", "Could not keep the login private, so nothing was stored."],
]) {
  test(`a Claude sign-in that failed (${kind}) says so and offers Start again`, (t) => {
    const lines = drawDialog(t, {
      state: preloaded({
        provider: "claude",
        shown: { url: CLAUDE_URL },
        error: kind,
      }),
    });
    if (!lines) return;
    const all = lines.join("\n");
    const drawn = texts(lines);
    assert.ok(drawn.includes(line), `${line}\n${all}`);
    assert.ok(drawn.includes("Code from Claude"), all);
    assert.ok(drawn.includes("Start again"), all);
    assert.match(withId(lines, "start-again") ?? "", /:on_click/, all);
    assert.equal(withId(lines, "connect"), undefined, all);
  });
}

test("a Codex sign-in that timed out says so and offers Start again", (t) => {
  const lines = drawDialog(t, {
    state: preloaded({
      provider: "codex",
      shown: { url: CODEX_URL, code: "WDJB-MJHT", deadline: NOW - MINUTE },
      error: "timeout",
    }),
  });
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  assert.ok(drawn.includes("The sign-in timed out. Start again."), all);
  assert.ok(drawn.includes("Start again"), all);
  assert.match(withId(lines, "start-again") ?? "", /:on_click/, all);
  assert.ok(!drawn.includes("Waiting for you to approve"), all);
});

test("Sign in again for a Claude account starts at the Claude step", (t) => {
  const lines = drawDialog(t, {
    connect: { provider: "claude", account: "claude:acct-1" },
  });
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  assert.ok(drawn.includes("Connect Claude"), all);
  assert.ok(drawn.includes("Code from Claude"), all);
  assert.ok(!drawn.includes("Connect an account"), all);
});

test("choosing Codex starts its sign-in, and closing the dialog cancels it", (t) => {
  const lines = drawSource(
    t,
    `import { View, div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { theme } from "herdr";
import * as form from "./ui/connect.js";

export default class Draw extends View {
  init(_props, cx) {
    const calls = [];
    this.calls = calls;
    const store = {
      accounts: () => [],
      connect(provider, io) {
        calls.push({ provider, io });
        return new Promise(() => {});
      },
    };
    const nothing = () => undefined;
    this.view = {
      form: "connect",
      props: { connect: {}, overlay: "overlay-1" },
      size: { width: 420, height: 360 },
      now: ${NOW},
      theme: theme(),
      readings: [],
      notify: true,
      ui: {},
      store,
      host: { openOverlay: nothing, closeOverlay: nothing, openUrl: nothing },
    };
    form.init(this.view, cx);
    this.before = calls.length;
    form.choose(this.view, "codex", cx);
    const io = calls[0]?.io;
    this.functions = io
      ? Object.keys(io)
          .filter((name) => typeof io[name] === "function")
          .sort()
          .join(",")
      : "none";
    this.open = io ? String(io.cancelled()) : "none";
    form.close(this.view, cx);
    this.closed = io ? String(io.cancelled()) : "none";
  }

  render() {
    return v_flex()
      .id("draw")
      .child("calls before choosing: " + this.before)
      .child("calls: " + this.calls.map((call) => call.provider).join(","))
      .child("functions: " + this.functions)
      .child("cancelled while open: " + this.open)
      .child("cancelled after close: " + this.closed);
  }
}
`,
  );
  if (!lines) return;
  const all = lines.join("\n");
  const drawn = texts(lines);
  assert.ok(drawn.includes("calls before choosing: 0"), all);
  assert.ok(drawn.includes("calls: codex"), all);
  assert.ok(drawn.includes("functions: cancelled,present,readCode,sleep"), all);
  assert.ok(drawn.includes("cancelled while open: false"), all);
  assert.ok(drawn.includes("cancelled after close: true"), all);
});
