import { test } from "node:test";
import assert from "node:assert/strict";
import { FIT_MAX, fitHeight, fitTo } from "../mods/headroom/logic/fit.js";

test("a block asks at most for the height of four accounts", () => {
  assert.equal(FIT_MAX, 320);
});

test("a block asks for the height its content needs, rounded up", () => {
  assert.equal(fitHeight(245, null), 245);
  assert.equal(fitHeight(313.2, null), 314);
  assert.equal(fitHeight(400, null), 320);
  assert.equal(fitHeight(320, undefined), 320);
});

test("a block does not ask again for the height it has", () => {
  assert.equal(fitHeight(245, 245), null);
  assert.equal(fitHeight(313.2, 314), null);
  assert.equal(fitHeight(400, 320), null);
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
    ["headroom-block", 320],
  ]);
  assert.equal(view.ui.fit, 320);
});

test("fitTo asks nothing of a block without props.fit", () => {
  const { view, asked } = fakeView({});
  fitTo(view, 245);
  assert.deepEqual(asked, []);
  assert.equal(view.ui.fit, undefined);
});
