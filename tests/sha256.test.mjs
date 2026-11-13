import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha256 } from "../mods/headroom/logic/sha256.js";

const ascii = (text) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const hex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

test("the FIPS 180-2 examples give their digests", () => {
  assert.equal(
    hex(sha256(new Uint8Array(0))),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(
    hex(sha256(ascii("abc"))),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const long =
    "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu";
  assert.equal(long.length, 112);
  assert.equal(
    hex(sha256(ascii(long))),
    "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
  );
});

test("the digest is 32 bytes in a Uint8Array", () => {
  const digest = sha256(ascii("abc"));
  assert.ok(digest instanceof Uint8Array);
  assert.equal(digest.length, 32);
});

test("every length from 0 to 130 bytes matches node:crypto", () => {
  for (let length = 0; length <= 130; length += 1) {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 151 + 7) % 256);
    assert.equal(
      hex(sha256(bytes)),
      createHash("sha256").update(bytes).digest("hex"),
      `length ${length}`,
    );
  }
});
