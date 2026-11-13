import { test } from "node:test";
import assert from "node:assert/strict";
import { drawSource, withId } from "./helpers/draw.mjs";

// Draws the kit's pieces in one column. `pieces`: JavaScript for an array of
// elements, with `t` (the theme) and the kit's exports in scope.
function drawKit(t, pieces) {
  return drawSource(
    t,
    `import { View } from "gpui-kit";
import { v_flex } from "gpui-base";
import { theme } from "herdr";
import { bar, pair, mark, spinner, moreIcon } from "./ui/kit.js";

export default class Draw extends View {
  render() {
    const t = theme();
    return v_flex().id("draw").size_full().gap(12).children(${pieces});
  }
}
`,
  );
}

const labelled = (lines, label) =>
  lines.filter((line) =>
    line.includes(`:accessibility_label[Str(${JSON.stringify(label)})]`),
  );

test("a bar with a pace draws its track, its fill and its pace mark", (t) => {
  const lines = drawKit(
    t,
    `[bar({ id: "weekly", fraction: 0.41, level: "normal", pace: 0.5 }, t)]`,
  );
  if (!lines) return;
  const all = lines.join("\n");
  assert.ok(withId(lines, "weekly"), all);
  assert.ok(withId(lines, "weekly-fill"), all);
  assert.ok(withId(lines, "weekly-pace"), all);
});

test("the fill covers the reading's share of the width", (t) => {
  const lines = drawKit(
    t,
    `[bar({ id: "weekly", fraction: 0.41, level: "high", pace: null }, t)]`,
  );
  if (!lines) return;
  assert.match(withId(lines, "weekly-fill") ?? "", /\.w\[Str\("41%"\)\]/);
});

test("a bar without a pace, or dimmed, has no pace mark", (t) => {
  const lines = drawKit(
    t,
    `[
      bar({ id: "unstarted", fraction: 0, level: "normal", pace: null }, t),
      bar({ id: "old", fraction: 0.62, level: "normal", pace: 0.3, dimmed: true }, t),
    ]`,
  );
  if (!lines) return;
  const all = lines.join("\n");
  assert.ok(withId(lines, "unstarted-fill"), all);
  assert.equal(withId(lines, "unstarted-pace"), undefined, all);
  assert.ok(withId(lines, "old-fill"), all);
  assert.equal(withId(lines, "old-pace"), undefined, all);
  assert.match(withId(lines, "old") ?? "", /\.opacity\[Number\(0\.4\)\]/);
});

test("a pair without a 5-hour window draws the full bar alone", (t) => {
  const lines = drawKit(
    t,
    `[pair({
      id: "a",
      full: { fraction: 0.23, level: "normal", pace: 0.4 },
      short: null,
    }, t)]`,
  );
  if (!lines) return;
  const all = lines.join("\n");
  assert.ok(withId(lines, "a-full"), all);
  assert.ok(withId(lines, "a-full-pace"), all);
  assert.equal(withId(lines, "a-short"), undefined, all);
});

test("a pair without a weekly window draws the thin bar alone", (t) => {
  const lines = drawKit(
    t,
    `[pair({
      id: "a",
      full: null,
      short: { fraction: 0.62, level: "normal", pace: 0.8 },
    }, t)]`,
  );
  if (!lines) return;
  const all = lines.join("\n");
  assert.ok(withId(lines, "a-short"), all);
  assert.ok(withId(lines, "a-short-pace"), all);
  assert.equal(withId(lines, "a-full"), undefined, all);
});

test("a pair with both windows draws the full bar over the thin one", (t) => {
  const lines = drawKit(
    t,
    `[pair({
      id: "a",
      full: { fraction: 0.41, level: "normal", pace: 0.5 },
      short: { fraction: 0.92, level: "critical", pace: 0.7 },
    }, t)]`,
  );
  if (!lines) return;
  const full = lines.findIndex((line) => line.includes(`Str("a-full")`));
  const short = lines.findIndex((line) => line.includes(`Str("a-short")`));
  assert.ok(full >= 0 && short > full, lines.join("\n"));
});

test("each provider's mark carries the provider's name", (t) => {
  const lines = drawKit(t, `[mark("claude", 14), mark("codex", 12)]`);
  if (!lines) return;
  const all = lines.join("\n");
  assert.equal(labelled(lines, "Claude").length, 1, all);
  assert.equal(labelled(lines, "Codex").length, 1, all);
});

test("the spinner and the more icon draw where no asset is installed", (t) => {
  const lines = drawKit(t, `[spinner(12, t), moreIcon(14, t)]`);
  if (!lines) return;
  const all = lines.join("\n");
  assert.match(all, /svg "mods\/workspace-chrome\/spinner\.svg"/);
  assert.match(all, /svg "mods\/headroom\/icons\/more\.svg"/);
});

// The pace mark's halo box reaches `reach` + 1.5 px beyond its bar, above
// (top) and below (bottom): the tick's reach plus the halo.
const measure = (line, name) =>
  Number(
    line?.match(new RegExp(`\\.${name}\\[Number\\((-?[\\d.]+)\\)\\]`))?.[1],
  );

test("a lone pace mark reaches 2 px above and below its bar, in its halo", (t) => {
  const lines = drawKit(
    t,
    `[
      bar({ id: "w", fraction: 0.41, pace: 0.5 }, t),
      bar({ id: "s", fraction: 0.62, pace: 0.7, thin: true }, t),
    ]`,
  );
  if (!lines) return;
  for (const id of ["w-pace", "s-pace"]) {
    const line = withId(lines, id);
    assert.equal(measure(line, "top"), -3.5, `${id}: ${line}`);
    assert.equal(measure(line, "bottom"), -3.5, `${id}: ${line}`);
    assert.equal(measure(line, "w"), 5, `${id}: ${line}`);
    assert.equal(measure(line, "p"), 1.5, `${id}: ${line}`);
  }
});

test("a pair sets its bars 6 px apart, each mark reaching alike", (t) => {
  const lines = drawKit(
    t,
    `[pair({
      id: "a",
      full: { fraction: 0.41, level: "normal", pace: 0.5 },
      short: { fraction: 0.92, level: "critical", pace: 0.5 },
    }, t)]`,
  );
  if (!lines) return;
  const full = lines.findIndex((line) => line.includes(`Str("a-full")`));
  assert.equal(measure(lines[full - 1], "gap"), 6, lines[full - 1]);
  for (const id of ["a-full-pace", "a-short-pace"]) {
    const line = withId(lines, id);
    assert.equal(measure(line, "top"), -3.5, `${id}: ${line}`);
    assert.equal(measure(line, "bottom"), -3.5, `${id}: ${line}`);
  }
});
