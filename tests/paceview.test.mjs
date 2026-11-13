import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, withId } from "./helpers/draw.mjs";
import { reading } from "./helpers/fakes.mjs";

// A number the element's line sets, as `.top[Number(-3.5)]` sets top to -3.5;
// NaN when it sets none.
const measure = (line, name) =>
  Number(
    line?.match(new RegExp(`\\.${name}\\[Number\\((-?[\\d.]+)\\)\\]`))?.[1],
  );

// The pace mark's halo box reaches beyond its bar by the tick's reach plus
// the 1.5 px halo, above (top) and below (bottom).
function assertReach(lines, id, px) {
  const line = withId(lines, id);
  assert.ok(line, `${id} missing\n${lines.join("\n")}`);
  assert.equal(measure(line, "top"), -px, `${id}: ${line}`);
  assert.equal(measure(line, "bottom"), -px, `${id}: ${line}`);
}

// The pair's column: the line just above its full bar.
function column(lines, id) {
  const at = lines.findIndex((line) => withId([line], `${id}-full`));
  return lines[at - 1];
}

test("in the list both marks reach 2 px each way and the bars sit 6 px apart", (t) => {
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 300 },
    readings: [reading()],
  });
  if (!lines) return;
  assertReach(lines, "account-0-full-pace", 3.5);
  assertReach(lines, "account-0-short-pace", 3.5);
  assert.equal(measure(withId(lines, "account-0-full"), "h"), 6);
  assert.equal(measure(withId(lines, "account-0-short"), "h"), 3);
  assert.equal(measure(column(lines, "account-0"), "gap"), 6);
});

test("the detail view's bars follow the list", (t) => {
  const lines = drawForm(t, "detail", {
    size: { width: 380, height: 640 },
    readings: [reading()],
  });
  if (!lines) return;
  assertReach(lines, "account-0-window-0-pace", 3.5);
});

for (const [form, size] of [
  ["rail", { width: 76, height: 300 }],
  ["strip", { width: 640, height: 28 }],
]) {
  test(`in the ${form} both marks reach 1 px each way and the bars sit 4 px apart`, (t) => {
    const lines = drawForm(t, form, { size, readings: [reading()] });
    if (!lines) return;
    assertReach(lines, "account-0-full-pace", 2.5);
    assertReach(lines, "account-0-short-pace", 2.5);
    assert.equal(measure(withId(lines, "account-0-full"), "h"), 5);
    assert.equal(measure(withId(lines, "account-0-short"), "h"), 3);
    assert.equal(measure(column(lines, "account-0"), "gap"), 4);
  });
}
