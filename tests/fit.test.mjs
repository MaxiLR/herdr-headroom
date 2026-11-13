import { test } from "node:test";
import assert from "node:assert/strict";
import { FIT_MAX, fitHeight, fitTo } from "../mods/headroom/logic/fit.js";
import { chooseForm } from "../mods/headroom/logic/form.js";

test("a block asks at most for the height of four accounts", () => {
  assert.equal(FIT_MAX, 329);
  assert.equal(fitHeight(41 + 4 * 70 + 8, null), 329);
  assert.equal(fitHeight(41 + 5 * 70 + 8, null), 329);
});

test("a block asks for the height its content needs, rounded up", () => {
  assert.equal(fitHeight(245, null), 245);
  assert.equal(fitHeight(313.2, null), 314);
  assert.equal(fitHeight(400, null), 329);
  assert.equal(fitHeight(329, undefined), 329);
});

test("a block does not ask again for the height it has", () => {
  assert.equal(fitHeight(245, 245), null);
  assert.equal(fitHeight(313.2, 314), null);
  assert.equal(fitHeight(400, 329), null);
  assert.equal(fitHeight(250, 245), 250);
});

// A view as main.js hands it to a form, with a host that records resizes.
function fakeView(props) {
  const asked = [];
  const view = {
    props,
    ui: {},
    host: { resize: (id, px) => asked.push([id, px]) },
  };
  return { view, asked };
}

test("fitTo resizes the block once for the same height", () => {
  const { view, asked } = fakeView({ fit: "headroom-block" });
  fitTo(view, 245);
  fitTo(view, 245);
  assert.deepEqual(asked, [["headroom-block", 245]]);
  assert.equal(view.ui.fit, 245);
  fitTo(view, 400);
  fitTo(view, 512);
  assert.deepEqual(asked, [
    ["headroom-block", 245],
    ["headroom-block", 329],
  ]);
  assert.equal(view.ui.fit, 329);
});

test("fitTo asks nothing of a block without props.fit", () => {
  const { view, asked } = fakeView({});
  fitTo(view, 245);
  assert.deepEqual(asked, []);
  assert.equal(view.ui.fit, undefined);
});

// A folded sidebar's rail can be shorter than a strip: 36 px with no account
// yet, 45 px with one weekly-only account. Fitted to that, the block would
// stay a strip once the sidebar unfolds, and the strip never fits it again.
test("a fitted block is never shorter than a strip, so it unfolds to the list", () => {
  assert.equal(fitHeight(36, null), 48);
  assert.equal(fitHeight(45, null), 48);
  assert.equal(fitHeight(36, 48), null);
  const { view, asked } = fakeView({ fit: "headroom-block" });
  fitTo(view, 36);
  assert.deepEqual(asked, [["headroom-block", 48]]);
  assert.equal(
    chooseForm({ fit: "headroom-block" }, { width: 268, height: 48 }),
    "list",
  );
});
