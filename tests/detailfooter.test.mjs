// The detail view's footer: the notifications switch at the left, under it
// Show in status bar when the layout has the strip's block, and Connect
// account at the right, a square plus button narrower than 340 px.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawActing, drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading } from "./helpers/fakes.mjs";

const NOTIFY = "Notify at 90% and at the limit";
const CONNECT = "Connect account";
const STRIP = "Show in status bar";

const indent = (line) => line.match(/^\s*/)[0].length;

// The lines of the element whose own line is `at`, its own line first.
function block(lines, at) {
  const end = lines.findIndex(
    (line, i) =>
      i > at && line.trim() !== "" && indent(line) <= indent(lines[at]),
  );
  return lines.slice(at, end === -1 ? lines.length : end);
}

// The index of the footer's own line: the child of the view's root that holds
// the notifications switch.
function footerAt(lines) {
  const root = lines.findIndex((line) =>
    line.includes(':id[Str("detail-view")]'),
  );
  const accounts = lines.findIndex((line) =>
    line.includes(':id[Str("detail-accounts")]'),
  );
  const depth = indent(lines[accounts]);
  const notify = lines.findIndex((line) => /Switch "notify"/.test(line));
  assert.ok(root !== -1 && notify > root, lines.join("\n"));
  for (let i = notify; i > root; i -= 1) {
    if (lines[i].trim() !== "" && indent(lines[i]) === depth) return i;
  }
  assert.fail(`no footer holds the switch\n${lines.join("\n")}`);
}

// The drawn width and height of an element's line, from `.size` or `.w`/`.h`.
function sizeOf(line) {
  const number = (name) => {
    const found = line.match(
      new RegExp(`\\.${name}\\[Number\\(([\\d.]+)\\)\\]`),
    );
    return found ? Number(found[1]) : undefined;
  };
  const size = number("size");
  return { width: number("w") ?? size, height: number("h") ?? size };
}

function draw(t, size, layout) {
  return drawForm(t, "detail", fixture(size, layout));
}

function fixture(size, layout) {
  return {
    props: { form: "detail", overlay: "overlay-1" },
    ...(size === undefined ? {} : { size }),
    ...(layout === undefined ? {} : { layout }),
    readings: [reading()],
  };
}

// The installed layout: the status bar is a row of Herdr's status and the
// strip's block, which is hidden as installed.
function installed({ hidden, id = "headroom-strip" } = {}) {
  return {
    id: "root",
    type: "column",
    children: [
      { id: "panes", type: "block", content: { mod: "workspace-panes" } },
      {
        id: "status-row",
        type: "row",
        size: { px: 28 },
        children: [
          {
            id: "status",
            type: "block",
            size: { weight: 3 },
            content: { mod: "workspace-status" },
          },
          {
            id,
            type: "block",
            ...(hidden ? { hidden: true } : {}),
            size: { weight: 2 },
            content: {
              mod: "headroom",
              props: { form: "strip", fit: "headroom-strip" },
            },
          },
        ],
      },
    ],
  };
}

// The footer's switches, in order.
const switches = (footer) => footer.filter((line) => /Switch "/.test(line));

test("narrower than 340 px Connect account is a 30 px square plus right of the switch", (t) => {
  const lines = draw(t, { width: 300, height: 640 });
  if (!lines) return;
  const all = lines.join("\n");
  const connect = withId(lines, "connect-account");
  assert.ok(connect, all);
  assert.deepEqual(sizeOf(connect), { width: 30, height: 30 }, connect);
  assert.match(connect, /:accessibility_label\[Str\("Connect account"\)\]/);
  assert.match(connect, /:tooltip\[Str\("Connect account"\)\]/);
  assert.match(connect, /:on_click/);
  assert.ok(!texts(lines).includes(CONNECT), all);

  const footer = block(lines, footerAt(lines));
  const notify = footer.findIndex((line) => /Switch "notify"/.test(line));
  const button = footer.indexOf(connect);
  assert.ok(notify !== -1, all);
  assert.ok(button > notify, footer.join("\n"));
});

for (const [name, size] of [
  ["380 px wide", { width: 380, height: 640 }],
  ["before the first layout", undefined],
]) {
  test(`${name} Connect account has its words`, (t) => {
    const lines = draw(t, size);
    if (!lines) return;
    const at = lines.indexOf(withId(lines, "connect-account"));
    assert.ok(at !== -1, lines.join("\n"));
    assert.ok(texts(block(lines, at)).includes(CONNECT), lines.join("\n"));
  });
}

for (const width of [300, 380]) {
  test(`${width} px wide the notifications switch and its label are drawn`, (t) => {
    const lines = draw(t, { width, height: 640 });
    if (!lines) return;
    const footer = block(lines, footerAt(lines));
    assert.ok(
      footer.some((line) => /Switch "notify"/.test(line)),
      footer.join("\n"),
    );
    assert.ok(texts(footer).includes(NOTIFY), footer.join("\n"));
  });
}

for (const [name, hidden, checked, steps, calls] of [
  [
    "hidden",
    true,
    false,
    "form.setStrip(view, true);",
    [["show", "headroom-strip"]],
  ],
  [
    "shown",
    false,
    true,
    "form.setStrip(view, false);",
    [["hide", "headroom-strip"]],
  ],
]) {
  test(`with the strip's block ${name} a second switch reads Show in status bar, ${checked ? "on" : "off"}`, (t) => {
    const lines = draw(t, { width: 380, height: 640 }, installed({ hidden }));
    if (!lines) return;
    const footer = block(lines, footerAt(lines));
    const found = switches(footer);
    assert.equal(found.length, 2, footer.join("\n"));
    assert.match(found[0], /Switch "notify"/);
    assert.match(found[1], new RegExp(`:checked\\[Bool\\(${checked}\\)\\]`));
    assert.match(found[1], /:on_change\(fn\)/);
    assert.match(
      found[1],
      /:accessibility_label\[Str\("Show in status bar"\)\]/,
    );
    const words = texts(footer);
    assert.ok(words.indexOf(STRIP) > words.indexOf(NOTIFY), words.join(" | "));
    assert.ok(words.indexOf(NOTIFY) !== -1, words.join(" | "));
  });

  test(`with the strip's block ${name} turning the switch ${checked ? "off hides" : "on shows"} the block`, (t) => {
    const result = drawActing(
      t,
      "detail",
      fixture({ width: 380, height: 640 }, installed({ hidden })),
      steps,
    );
    if (!result) return;
    assert.deepEqual(result.calls, calls);
  });
}

for (const [name, layout] of [
  ["a layout without the strip's block", installed({ id: "limits" })],
  ["no layout", undefined],
]) {
  test(`with ${name} the footer has no second switch`, (t) => {
    const lines = draw(t, { width: 380, height: 640 }, layout);
    if (!lines) return;
    const footer = block(lines, footerAt(lines));
    assert.equal(switches(footer).length, 1, footer.join("\n"));
    assert.ok(!texts(lines).includes(STRIP), lines.join("\n"));
  });
}

test("300 px wide with the strip's block both switches and the square Connect account are drawn", (t) => {
  const lines = draw(
    t,
    { width: 300, height: 640 },
    installed({ hidden: true }),
  );
  if (!lines) return;
  const footer = block(lines, footerAt(lines));
  assert.equal(switches(footer).length, 2, footer.join("\n"));
  assert.ok(texts(footer).includes(NOTIFY), footer.join("\n"));
  assert.ok(texts(footer).includes(STRIP), footer.join("\n"));
  const connect = withId(lines, "connect-account");
  assert.ok(footer.includes(connect), footer.join("\n"));
  assert.deepEqual(sizeOf(connect), { width: 30, height: 30 }, connect);
});
