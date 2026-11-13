import { test } from "node:test";
import assert from "node:assert/strict";
import { menuItems, removeQuestion } from "../mods/headroom/logic/menu.js";
import { reading } from "./helpers/fakes.mjs";

const THREE = [
  reading({ id: "claude:acct-maxi:org-maxi", label: "maxi" }),
  reading({ id: "claude:acct-maxi:org-terac", label: "maxi · Terac" }),
  reading({ id: "codex:acct-maxilr", provider: "codex", label: "maxilr" }),
];

test("the first of three accounts cannot move up", () => {
  assert.deepEqual(menuItems(THREE, "claude:acct-maxi:org-maxi"), [
    { key: "rename", label: "Rename", enabled: true },
    { key: "up", label: "Move up", enabled: false },
    { key: "down", label: "Move down", enabled: true },
    { key: "signin", label: "Sign in again", enabled: true },
    { key: "remove", label: "Remove", enabled: true },
  ]);
});

test("a middle account can move up and down", () => {
  assert.deepEqual(menuItems(THREE, "claude:acct-maxi:org-terac"), [
    { key: "rename", label: "Rename", enabled: true },
    { key: "up", label: "Move up", enabled: true },
    { key: "down", label: "Move down", enabled: true },
    { key: "signin", label: "Sign in again", enabled: true },
    { key: "remove", label: "Remove", enabled: true },
  ]);
});

test("the last of three accounts cannot move down", () => {
  assert.deepEqual(menuItems(THREE, "codex:acct-maxilr"), [
    { key: "rename", label: "Rename", enabled: true },
    { key: "up", label: "Move up", enabled: true },
    { key: "down", label: "Move down", enabled: false },
    { key: "signin", label: "Sign in again", enabled: true },
    { key: "remove", label: "Remove", enabled: true },
  ]);
});

test("a single account moves neither up nor down", () => {
  assert.deepEqual(menuItems([THREE[0]], "claude:acct-maxi:org-maxi"), [
    { key: "rename", label: "Rename", enabled: true },
    { key: "up", label: "Move up", enabled: false },
    { key: "down", label: "Move down", enabled: false },
    { key: "signin", label: "Sign in again", enabled: true },
    { key: "remove", label: "Remove", enabled: true },
  ]);
});

test("the question before removing names the account and what is lost", () => {
  assert.deepEqual(removeQuestion("maxi · Terac"), {
    title: "Remove maxi · Terac?",
    detail: "Its stored login is deleted from this computer.",
  });
  assert.deepEqual(removeQuestion("maxilr"), {
    title: "Remove maxilr?",
    detail: "Its stored login is deleted from this computer.",
  });
});
