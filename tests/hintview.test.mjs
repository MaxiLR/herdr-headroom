import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading } from "./helpers/fakes.mjs";

// A block fitted to two accounts with both bars and the hint's room under
// them, and the rail fitted the same way.
const LIST = { width: 268, height: 207 };
const RAIL = { width: 76, height: 103 };

const CHEVRON = 'svg "mods/workspace-chrome/chevron-down.svg"';

// `count` accounts with both bars, each under its own label.
function accounts(count) {
  return Array.from({ length: count }, (_, i) =>
    reading({ id: `claude:acct-${i}:org-${i}`, label: `account ${i}` }),
  );
}

// The line of the element with `id` and every line drawn inside it.
function subtree(lines, id) {
  const at = lines.findIndex((line) =>
    line.includes(`:id[Str(${JSON.stringify(id)})]`),
  );
  if (at === -1) return [];
  const depth = (line) => line.length - line.trimStart().length;
  const inside = [lines[at]];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() === "" || depth(line) <= depth(lines[at])) break;
    inside.push(line);
  }
  return inside;
}

const has = (line, key, value) =>
  line.includes(`:${key}[Str(${JSON.stringify(value)})]`);

test("six accounts in a list for two say 4 more, with the chevron, on a 34 px band", (t) => {
  const lines = drawForm(t, "list", { size: LIST, readings: accounts(6) });
  if (!lines) return;
  const all = lines.join("\n");
  const band = subtree(lines, "more-below");
  assert.ok(band.length > 0, all);
  assert.ok(band[0].includes(".h[Number(34.0)]"), band[0]);
  assert.ok(
    has(band[0], "accessibility_label", "4 more accounts below"),
    band[0],
  );
  assert.deepEqual(texts(band), ["4 more"], band.join("\n"));
  assert.ok(
    band.some((line) => line.includes(CHEVRON)),
    band.join("\n"),
  );
  // It is not a control.
  for (const line of band) {
    assert.ok(!line.includes(":on_click"), line);
    assert.ok(!line.includes(".cursor_pointer"), line);
    assert.ok(!has(line, "role", "button"), line);
  }
});

test("six accounts in a rail for two say +4, named 4 more accounts, on a 16 px band", (t) => {
  const lines = drawForm(t, "rail", { size: RAIL, readings: accounts(6) });
  if (!lines) return;
  const all = lines.join("\n");
  const band = subtree(lines, "more-below");
  assert.ok(band.length > 0, all);
  assert.ok(band[0].includes(".h[Number(16.0)]"), band[0]);
  assert.ok(has(band[0], "tooltip", "4 more accounts"), band[0]);
  assert.ok(has(band[0], "accessibility_label", "4 more accounts"), band[0]);
  assert.deepEqual(texts(band), ["+4"], band.join("\n"));
  for (const line of band) {
    assert.ok(!line.includes(":on_click"), line);
    assert.ok(!line.includes(".cursor_pointer"), line);
  }
});

test("two accounts draw no hint in the list or the rail", (t) => {
  for (const [form, size] of [
    ["list", LIST],
    ["rail", RAIL],
  ]) {
    const lines = drawForm(t, form, { size, readings: accounts(2) });
    if (!lines) return;
    const all = lines.join("\n");
    assert.equal(withId(lines, "more-below"), undefined, all);
    assert.ok(!texts(lines).some((text) => /more|^\+\d/.test(text)), all);
    assert.ok(!all.includes(CHEVRON), all);
  }
});

test("six accounts scrolled to the end draw no hint", (t) => {
  // The list's accounts are 6 × 70 + 8 px under an area of 207 − 1 − 41: the
  // end is 263 px down. The rail's are 4 + 6 × 44 + 4 under 103 − 1: 170.
  for (const [form, size, scrolled] of [
    ["list", LIST, 263],
    ["rail", RAIL, 170],
  ]) {
    const lines = drawForm(t, form, {
      size,
      readings: accounts(6),
      ui: { [form]: { scrolled } },
    });
    if (!lines) return;
    const all = lines.join("\n");
    assert.equal(withId(lines, "more-below"), undefined, all);
    assert.ok(!all.includes(CHEVRON), all);
  }
});

test("scrolled by one account, the list says 3 more", (t) => {
  const lines = drawForm(t, "list", {
    size: LIST,
    readings: accounts(6),
    ui: { list: { scrolled: 70 } },
  });
  if (!lines) return;
  const band = subtree(lines, "more-below");
  assert.deepEqual(texts(band), ["3 more"], lines.join("\n"));
  assert.ok(
    has(band[0], "accessibility_label", "3 more accounts below"),
    band[0],
  );
});
