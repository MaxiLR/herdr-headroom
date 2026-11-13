import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseForm } from "../mods/headroom/logic/form.js";

test("a block 160 px wide or more and 48 px tall or more is the list", () => {
  assert.equal(chooseForm({}, { width: 160, height: 48 }), "list");
  assert.equal(
    chooseForm({ form: "auto" }, { width: 268, height: 300 }),
    "list",
  );
});

test("a block narrower than 160 px is the rail", () => {
  assert.equal(chooseForm({}, { width: 159, height: 400 }), "rail");
});

test("a block wide enough but under 48 px tall is the strip", () => {
  assert.equal(chooseForm({}, { width: 600, height: 47 }), "strip");
});

test("a block both too narrow and too short is the rail", () => {
  assert.equal(chooseForm({}, { width: 159, height: 47 }), "rail");
});

test("before the block is laid out it is the list", () => {
  assert.equal(chooseForm({}, null), "list");
  assert.equal(chooseForm({ form: "auto" }, null), "list");
});

test("an explicit form holds whatever the size", () => {
  for (const form of ["list", "rail", "strip", "detail"]) {
    assert.equal(chooseForm({ form }, { width: 40, height: 20 }), form);
    assert.equal(chooseForm({ form }, { width: 900, height: 900 }), form);
    assert.equal(chooseForm({ form }, null), form);
  }
});

test("a copy given connect props is the connect dialog", () => {
  assert.equal(
    chooseForm({ connect: {} }, { width: 420, height: 300 }),
    "connect",
  );
  assert.equal(
    chooseForm({ form: "detail", connect: { provider: "codex" } }, null),
    "connect",
  );
});

test("an unknown form is chosen by size", () => {
  assert.equal(
    chooseForm({ form: "grid" }, { width: 100, height: 300 }),
    "rail",
  );
  assert.equal(
    chooseForm({ form: "grid" }, { width: 300, height: 30 }),
    "strip",
  );
  assert.equal(
    chooseForm({ form: "grid" }, { width: 300, height: 300 }),
    "list",
  );
});

test("an account form naming its account holds whatever the size", () => {
  const props = { form: "account", account: "claude:a:o" };
  assert.equal(chooseForm(props, { width: 40, height: 20 }), "account");
  assert.equal(chooseForm(props, { width: 900, height: 900 }), "account");
  assert.equal(chooseForm(props, null), "account");
});

test("connect props win over an account form", () => {
  assert.equal(
    chooseForm({ form: "account", account: "claude:a:o", connect: {} }, null),
    "connect",
  );
});

test("an account form naming no account is chosen by size", () => {
  assert.equal(
    chooseForm({ form: "account" }, { width: 100, height: 300 }),
    "rail",
  );
});

test("a copy given remove props is the remove dialog whatever its size", () => {
  const props = { remove: "claude:a:b" };
  assert.equal(chooseForm(props, null), "remove");
  assert.equal(chooseForm(props, { width: 380, height: 160 }), "remove");
  assert.equal(chooseForm(props, { width: 100, height: 300 }), "remove");
  assert.equal(chooseForm(props, { width: 600, height: 30 }), "remove");
});
