import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFIED_KEY,
  PREFS_KEY,
  publish,
} from "../mods/headroom/logic/publish.js";
import { NOW, fakeHost, reading, win } from "./helpers/fakes.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The 5-hour window resets in 2h 31m; a later reading 38 minutes before
// that reset says it resets in 38m.
const RESET = NOW + 2 * HOUR + 31 * MINUTE;
const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;

// maxi · Terac with its 5-hour window at `used`, read at `at`; its weekly
// window stays at 41 %.
const terac = (used, { at = NOW, resetsAt = RESET, ...flags } = {}) =>
  reading({
    label: "maxi · Terac",
    fetchedAt: at,
    windows: [win("7d", 0.41, WEEKLY_RESET), win("5h", used, resetsAt, flags)],
  });

const AT_90 = {
  title: "maxi · Terac is at 91% of its 5-hour limit",
  body: "Resets in 2h 31m",
  level: "warning",
};
const AT_LIMIT = {
  title: "maxi · Terac reached its 5-hour limit",
  body: "Resets in 2h 31m",
  level: "error",
};

// The keys last recorded as posted, sorted.
const notified = (host) => [...host.shared(NOTIFIED_KEY).keys].sort();

test("crossing 90 % posts once, and a second reading above 90 % posts nothing", () => {
  const host = fakeHost();
  publish(host, [terac(0.5)], NOW);
  assert.deepEqual(host.toasts, []);

  publish(host, [terac(0.91)], NOW);
  assert.deepEqual(host.toasts, [AT_90]);

  publish(host, [terac(0.95, { at: NOW + 5 * MINUTE })], NOW + 5 * MINUTE);
  assert.deepEqual(host.toasts, [AT_90]);
  assert.deepEqual(host.shared(NOTIFIED_KEY), {
    version: 1,
    keys: ["claude:acct-maxi:org-maxi|5h|1794483060000|90"],
  });
});

test("crossing to the limit after 90 % posts the limit toast", () => {
  const host = fakeHost();
  publish(host, [terac(0.91)], NOW);
  const later = RESET - 38 * MINUTE;
  publish(host, [terac(1, { at: later })], later);

  assert.deepEqual(host.toasts, [
    AT_90,
    {
      title: "maxi · Terac reached its 5-hour limit",
      body: "Resets in 38m",
      level: "error",
    },
  ]);
});

test("a jump from 50 % to 100 % posts the limit toast only, once", () => {
  const host = fakeHost();
  publish(host, [terac(0.5)], NOW);
  publish(host, [terac(1)], NOW);
  publish(host, [terac(1)], NOW);
  publish(host, [terac(0.95)], NOW);

  assert.deepEqual(host.toasts, [AT_LIMIT]);
  assert.deepEqual(notified(host), [
    "claude:acct-maxi:org-maxi|5h|1794483060000|90",
    "claude:acct-maxi:org-maxi|5h|1794483060000|limit",
  ]);
});

test("the provider's limit flag at 60 % posts the limit toast", () => {
  const host = fakeHost();
  publish(host, [terac(0.6, { atLimit: true })], NOW);

  assert.deepEqual(host.toasts, [AT_LIMIT]);
});

test("a weekly window is named in lower case", () => {
  const host = fakeHost();
  publish(
    host,
    [
      reading({
        label: "maxi · Terac",
        windows: [win("7d", 0.93, NOW + 4 * DAY + 6 * HOUR)],
      }),
    ],
    NOW,
  );

  assert.deepEqual(host.toasts, [
    {
      title: "maxi · Terac is at 93% of its weekly limit",
      body: "Resets in 4d 6h",
      level: "warning",
    },
  ]);
});

test("a window with no reset time posts a toast without a body", () => {
  const host = fakeHost();
  publish(host, [terac(1, { resetsAt: null })], NOW);

  assert.deepEqual(host.toasts, [
    { title: "maxi · Terac reached its 5-hour limit", level: "error" },
  ]);
});

test("a new reset period can post again, and the old period's keys are gone", () => {
  const host = fakeHost();
  publish(host, [terac(0.91)], NOW);

  // Half an hour after the reset, the new period ends 5 hours after the old.
  const later = RESET + 30 * MINUTE;
  const next = RESET + 5 * HOUR;
  publish(host, [terac(0.91, { at: later, resetsAt: next })], later);

  assert.deepEqual(host.toasts, [
    AT_90,
    {
      title: "maxi · Terac is at 91% of its 5-hour limit",
      body: "Resets in 4h 30m",
      level: "warning",
    },
  ]);
  assert.deepEqual(host.shared(NOTIFIED_KEY), {
    version: 1,
    keys: ["claude:acct-maxi:org-maxi|5h|1794501060000|90"],
  });
});

test("with the switch off nothing is posted and nothing is recorded", () => {
  const host = fakeHost();
  host.state[PREFS_KEY] = { notify: false };
  publish(host, [terac(0.91)], NOW);
  publish(host, [terac(1)], NOW);

  assert.deepEqual(host.toasts, []);
  assert.equal(
    host.sets.some(([key]) => key === NOTIFIED_KEY),
    false,
  );
});

test("with the switch on, toasts are posted", () => {
  const host = fakeHost();
  host.state[PREFS_KEY] = { notify: true };
  publish(host, [terac(0.91)], NOW);

  assert.deepEqual(host.toasts, [AT_90]);
});

test("a stale or signed-out reading posts nothing", () => {
  for (const status of ["stale", "signed-out"]) {
    const host = fakeHost();
    publish(
      host,
      [{ ...terac(1), status, error: status === "stale" ? "network" : "auth" }],
      NOW,
    );

    assert.deepEqual(host.toasts, [], status);
    assert.equal(
      host.sets.some(
        ([key, value]) => key === NOTIFIED_KEY && value.keys.length > 0,
      ),
      false,
      status,
    );
  }
});

test("toasts and the record hold only labels, ids, numbers and the toast words", () => {
  const host = fakeHost();
  const account = {
    ...terac(1),
    plan: "Max",
    loginEndsAt: NOW + 30 * DAY,
    secret: "sk-should-never-leave",
  };
  publish(host, [account], NOW);

  assert.deepEqual(host.toasts, [AT_LIMIT]);
  const notifiedSets = host.sets.filter(([key]) => key === NOTIFIED_KEY);
  assert.deepEqual(notifiedSets, [
    [
      NOTIFIED_KEY,
      {
        version: 1,
        keys: [
          "claude:acct-maxi:org-maxi|5h|1794483060000|90",
          "claude:acct-maxi:org-maxi|5h|1794483060000|limit",
        ],
      },
    ],
  ]);
});
