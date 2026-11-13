import { test } from "node:test";
import assert from "node:assert/strict";
import { publish, setNotify } from "../mods/headroom/logic/publish.js";
import { NOW, fakeHost, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// maxi · Terac with its 5-hour window at 91 %, its weekly window at 41 %.
const at91 = () =>
  reading({
    label: "maxi · Terac",
    fetchedAt: NOW,
    windows: [
      win("7d", 0.41, NOW + 4 * DAY + 6 * HOUR),
      win("5h", 0.91, NOW + 2 * HOUR + 31 * MINUTE),
    ],
  });

test("setNotify writes the switch's new state to the preferences", () => {
  const host = fakeHost();
  setNotify(host, false);
  assert.deepEqual(host.sets, [["headroom.prefs", { notify: false }]]);
  setNotify(host, true);
  assert.deepEqual(host.sets, [
    ["headroom.prefs", { notify: false }],
    ["headroom.prefs", { notify: true }],
  ]);
});

test("notifications turned off post no toast", () => {
  const host = fakeHost();
  setNotify(host, false);
  publish(host, [at91()], NOW);
  assert.deepEqual(host.toasts, []);
});

test("notifications turned back on post the toast", () => {
  const host = fakeHost();
  setNotify(host, false);
  setNotify(host, true);
  publish(host, [at91()], NOW);
  assert.equal(host.toasts.length, 1);
  assert.equal(
    host.toasts[0].title,
    "maxi · Terac is at 91% of its 5-hour limit",
  );
});
