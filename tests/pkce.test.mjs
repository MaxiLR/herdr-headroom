import { test } from "node:test";
import assert from "node:assert/strict";
import { base64url, challengeOf } from "../mods/headroom/logic/pkce.js";

test("base64url uses the URL alphabet and drops the padding", () => {
  assert.equal(base64url(Uint8Array.from([0xfb, 0xff])), "-_8");
  assert.equal(base64url(Uint8Array.from([0x01, 0x02, 0x03, 0x04])), "AQIDBA");
});

test("the RFC 7636 appendix B verifier gives its challenge without TextEncoder", async (t) => {
  const encoder = globalThis.TextEncoder;
  delete globalThis.TextEncoder;
  t.after(() => {
    globalThis.TextEncoder = encoder;
  });
  assert.equal(globalThis.TextEncoder, undefined);
  assert.equal(
    await challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("the challenge comes back directly, not as a promise", (t) => {
  const encoder = globalThis.TextEncoder;
  delete globalThis.TextEncoder;
  t.after(() => {
    globalThis.TextEncoder = encoder;
  });
  const challenge = challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
  assert.equal(typeof challenge, "string");
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});
