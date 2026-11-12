import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { reading } from "./helpers/fakes.mjs";

test("the detail view draws each account and Connect account", (t) => {
  const lines = drawForm(t, "detail", {
    props: { form: "detail", overlay: "overlay-1" },
    size: { width: 380, height: 400 },
    readings: [reading()],
  });
  if (!lines) return;
  const drawn = texts(lines);
  const all = drawn.join(" ");
  assert.ok(drawn.includes("Limits"), lines.join("\n"));
  assert.ok(drawn.includes("maxi"), lines.join("\n"));
  assert.match(all, /41%/);
  assert.match(all, /62%/);
  assert.ok(drawn.includes("Connect account"), lines.join("\n"));
  assert.match(withId(lines, "connect-account") ?? "", /:on_click/);
});
