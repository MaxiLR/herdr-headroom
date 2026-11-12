import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const SIZE = { width: 268, height: 300 };

test("with no readings the list says No accounts yet and offers to connect", (t) => {
  const lines = drawForm(t, "list", { size: SIZE, readings: [] });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Limits"), lines.join("\n"));
  assert.ok(drawn.includes("No accounts yet"), lines.join("\n"));
  assert.ok(
    drawn.includes(
      "Connect a Claude or Codex account to see how close it is to its limits.",
    ),
    lines.join("\n"),
  );
  assert.ok(drawn.includes("Connect account"), lines.join("\n"));
  assert.match(withId(lines, "connect-account") ?? "", /:on_click/);
  assert.match(
    withId(lines, "open-detail") ?? "",
    /:accessibility_label\[Str\("Accounts and settings"\)\]/,
  );
});

test("one reading draws its label and the percent of each window", (t) => {
  const lines = drawForm(t, "list", { size: SIZE, readings: [reading()] });
  if (!lines) return;
  const drawn = texts(lines);
  const all = drawn.join(" ");
  assert.ok(drawn.includes("maxi"), lines.join("\n"));
  assert.match(all, /41%/);
  assert.match(all, /62%/);
  assert.ok(!drawn.includes("No accounts yet"), lines.join("\n"));
  assert.match(withId(lines, "account-0") ?? "", /:on_click/);
  assert.equal(withId(lines, "account-1"), undefined);
});

test("a percent is whole and rounded down", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        windows: [
          win("7d", 0.29, NOW + 3600000),
          win("5h", 0.999, NOW + 600000),
        ],
      }),
    ],
  });
  if (!lines) return;
  const all = texts(lines).join(" ");
  assert.match(all, /29%/);
  assert.match(all, /99%/);
  assert.doesNotMatch(all, /28%|100%/);
});
