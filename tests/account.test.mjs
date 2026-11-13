import { test } from "node:test";
import assert from "node:assert/strict";
import { openAccount } from "../mods/headroom/logic/account.js";
import { fakeHost, reading } from "./helpers/fakes.mjs";

test("opening an account asks Herdr for a 380 px popup of that account alone", () => {
  const host = fakeHost();
  openAccount(
    { host, readings: [reading()], store: { accounts: () => [] } },
    reading().id,
  );
  assert.equal(host.overlays.length, 1);
  const [spec] = host.overlays;
  assert.equal(spec.mod, "headroom");
  assert.equal(spec.kind, "popup");
  assert.equal(spec.width, 380);
  assert.deepEqual(spec.props, {
    form: "account",
    account: "claude:acct-maxi:org-maxi",
  });
  assert.ok(Number.isInteger(spec.height), `height ${spec.height}`);
  assert.ok(spec.height > 0 && spec.height <= 640, `height ${spec.height}`);
});
