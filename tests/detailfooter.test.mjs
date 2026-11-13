// The detail view's footer: the notifications switch at the left and Connect
// account at the right, a square plus button narrower than 340 px.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading } from "./helpers/fakes.mjs";

const NOTIFY = "Notify at 90% and at the limit";
const CONNECT = "Connect account";

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

function draw(t, size) {
  return drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    ...(size === undefined ? {} : { size }),
    readings: [reading()],
  });
}

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
