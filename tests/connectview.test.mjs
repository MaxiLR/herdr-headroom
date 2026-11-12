import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, texts, withId } from "./helpers/draw.mjs";

test("the connect dialog draws the code and the address to approve it at", (t) => {
  const lines = drawForm(t, "connect", {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 300 },
    ui: {
      connect: {
        shown: {
          url: "https://auth.openai.com/codex/device",
          code: "WDJB-MJHT",
        },
        error: null,
        closed: false,
      },
    },
  });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("WDJB-MJHT"), lines.join("\n"));
  assert.ok(
    drawn.includes("https://auth.openai.com/codex/device"),
    lines.join("\n"),
  );
  assert.ok(!drawn.includes("Could not reach the provider."), lines.join("\n"));
  assert.match(withId(lines, "cancel") ?? "", /:on_click/);
});

test("a failed sign-in says the provider could not be reached", (t) => {
  const lines = drawForm(t, "connect", {
    props: { connect: {}, overlay: "overlay-1" },
    size: { width: 420, height: 300 },
    ui: { connect: { shown: null, error: "network", closed: false } },
  });
  if (!lines) return;
  assert.ok(
    texts(lines).includes("Could not reach the provider."),
    lines.join("\n"),
  );
});
