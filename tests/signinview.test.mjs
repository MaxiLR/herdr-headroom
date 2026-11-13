import { test } from "node:test";
import assert from "node:assert/strict";
import { drawSource, texts } from "./helpers/draw.mjs";

// The PKCE challenge and the Claude sign-in run inside Herdr's own runtime,
// where `herdr-app check` passes even when a promise never settles: these
// tests read what is drawn, never the exit status alone.

test("the RFC 7636 appendix B challenge is computed inside Herdr", (t) => {
  const lines = drawSource(
    t,
    `import { View } from "gpui-kit";
import { v_flex } from "gpui-base";
import { challengeOf } from "./logic/pkce.js";

export default class Draw extends View {
  render() {
    return v_flex()
      .id("draw")
      .child(String(challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")));
  }
}
`,
  );
  if (!lines) return;
  assert.ok(
    texts(lines).includes("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"),
    lines.join("\n"),
  );
});

test("Claude's sign-in presents its authorize address inside Herdr", (t) => {
  const lines = drawSource(
    t,
    `import { View } from "gpui-kit";
import { v_flex } from "gpui-base";
import { login } from "./providers/claude.js";

export default class Draw extends View {
  init() {
    this.shown = "nothing presented";
    let calls = 0;
    const io = {
      random: (n) => {
        calls += 1;
        return new Uint8Array(n).fill(calls);
      },
      present: (shown) => {
        this.shown = shown.url;
      },
      openUrl: async () => true,
      readCode: () => new Promise(() => {}),
      fetch: () => new Promise(() => {}),
      now: () => 0,
      sleep: () => new Promise(() => {}),
      cancelled: () => false,
    };
    login(io);
  }

  render() {
    return v_flex().id("draw").child(this.shown);
  }
}
`,
  );
  if (!lines) return;
  const drawn = texts(lines).join("\n");
  assert.ok(
    drawn.includes(
      "code_challenge=VtX6czP210fbQsI5QH5dpMMvTHnzXQkrE0_TWkAtnFw",
    ),
    lines.join("\n"),
  );
  assert.ok(drawn.includes("code_challenge_method=S256"), lines.join("\n"));
});
