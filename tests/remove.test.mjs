import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelRemove, confirmRemove } from "../mods/headroom/logic/remove.js";
import { fakeHost, reading } from "./helpers/fakes.mjs";

const MAXI = "claude:acct-maxi:org-maxi";
const TERAC = "claude:acct-maxi:org-terac";

// The remove dialog's view of `id`, its store's `remove` answering only when
// `answer()` is called; `log` holds the store's removes and the host's closes
// in the order they came.
function dialog({ id = TERAC, readings } = {}) {
  const log = [];
  const host = fakeHost();
  const closeOverlay = host.closeOverlay;
  host.closeOverlay = (overlay) => {
    log.push(["closeOverlay", overlay]);
    return closeOverlay(overlay);
  };
  const answers = [];
  const store = {
    accounts: () => [],
    remove(one) {
      log.push(["remove", one]);
      return new Promise((resolve) =>
        answers.push(() => resolve({ ok: true })),
      );
    },
  };
  const view = {
    form: "remove",
    props: { remove: id, overlay: "overlay-1" },
    readings: readings ?? [
      reading({ id: MAXI }),
      reading({ id: TERAC, label: "maxi · Terac" }),
    ],
    ui: {},
    store,
    host,
  };
  return { view, log, answer: () => answers.forEach((resolve) => resolve()) };
}

test("Remove removes the account named, then closes once the store answers", async () => {
  const { view, log, answer } = dialog();
  const done = confirmRemove(view);
  assert.deepEqual(log, [["remove", TERAC]]);
  answer();
  await done;
  assert.deepEqual(log, [
    ["remove", TERAC],
    ["closeOverlay", "overlay-1"],
  ]);
});

test("a second Remove while the first runs does nothing", async () => {
  const { view, log, answer } = dialog();
  const first = confirmRemove(view);
  const second = confirmRemove(view);
  answer();
  await Promise.all([first, second]);
  assert.deepEqual(log, [
    ["remove", TERAC],
    ["closeOverlay", "overlay-1"],
  ]);
});

test("Remove after the first one finished removes nothing more", async () => {
  const { view, log, answer } = dialog();
  const first = confirmRemove(view);
  answer();
  await first;
  await confirmRemove(view);
  assert.deepEqual(
    log.filter(([name]) => name === "remove"),
    [["remove", TERAC]],
  );
});

test("Cancel closes the dialog and keeps the account", async () => {
  const { view, log } = dialog();
  await cancelRemove(view);
  assert.deepEqual(log, [["closeOverlay", "overlay-1"]]);
});

test("Remove for an account no longer connected removes nothing and closes", async () => {
  const { view, log } = dialog({ readings: [reading({ id: MAXI })] });
  await confirmRemove(view);
  assert.deepEqual(log, [["closeOverlay", "overlay-1"]]);
});
