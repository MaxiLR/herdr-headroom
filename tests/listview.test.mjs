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

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEKLY_RESET = NOW + 4 * DAY + 6 * HOUR;
const SHORT_RESET = NOW + HOUR + 48 * MINUTE;

// Every drawn text joined by spaces, so `41%`, `·` and `4d 6h` drawn apart
// read `41% · 4d 6h`.
const sentence = (lines) => texts(lines).join(" ");

// True when the element with `id` is drawn inside the one with `outer`.
function inside(lines, outer, id) {
  const start = lines.findIndex((line) =>
    line.includes(`:id[Str(${JSON.stringify(outer)})]`),
  );
  if (start < 0) return false;
  const depth = lines[start].search(/\S/);
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.search(/\S/) <= depth) return false;
    if (line.includes(`:id[Str(${JSON.stringify(id)})]`)) return true;
  }
  return false;
}

const ids = (lines) =>
  lines
    .map((line) => line.match(/:id\[Str\("([^"]*)"\)\]/)?.[1])
    .filter(Boolean);

test("a pair row draws both bars with pace marks and the numbers under them", (t) => {
  const lines = drawForm(t, "list", { size: SIZE, readings: [reading()] });
  if (!lines) return;
  const all = sentence(lines);
  assert.match(all, /41% · 4d 6h/, lines.join("\n"));
  assert.match(all, /5-hour 62% · 1h 48m/, lines.join("\n"));
  for (const id of [
    "account-0-full",
    "account-0-full-pace",
    "account-0-short",
    "account-0-short-pace",
  ]) {
    assert.ok(withId(lines, id), `${id} missing\n${lines.join("\n")}`);
  }
  assert.match(
    lines.join("\n"),
    /:accessibility_label\[Str\("Claude"\)\]/,
    "the provider's mark",
  );
  assert.match(
    withId(lines, "account-0") ?? "",
    /:accessibility_label\[Str\("maxi, Weekly 41% used, resets in 4d 6h, 5-hour 62% used, resets in 1h 48m"\)\]/,
  );
});

test("weekly only draws one full bar and says resets in", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        provider: "codex",
        windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)],
      }),
    ],
  });
  if (!lines) return;
  assert.match(sentence(lines), /23% · resets in 5d 2h/, lines.join("\n"));
  assert.ok(withId(lines, "account-0-full"), lines.join("\n"));
  assert.equal(withId(lines, "account-0-short"), undefined);
  assert.ok(!texts(lines).includes("5-hour"), lines.join("\n"));
});

test("5-hour only draws the thin bar alone, its numbers under 5-hour", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [reading({ windows: [win("5h", 0.62, SHORT_RESET)] })],
  });
  if (!lines) return;
  assert.match(
    sentence(lines),
    /5-hour 62% · resets in 1h 48m/,
    lines.join("\n"),
  );
  assert.ok(withId(lines, "account-0-short"), lines.join("\n"));
  assert.equal(withId(lines, "account-0-full"), undefined);
});

test("at 180 px the 5-hour numbers lose their word", (t) => {
  const size = { width: 180, height: 300 };
  const pairLines = drawForm(t, "list", { size, readings: [reading()] });
  if (!pairLines) return;
  const all = sentence(pairLines);
  assert.match(all, /41% · 4d 6h/, pairLines.join("\n"));
  assert.match(all, /62% · 1h 48m/, pairLines.join("\n"));
  assert.ok(!texts(pairLines).includes("5-hour"), pairLines.join("\n"));
  const weekly = drawForm(t, "list", {
    size,
    readings: [
      reading({ windows: [win("7d", 0.23, NOW + 5 * DAY + 2 * HOUR)] }),
    ],
  });
  assert.match(sentence(weekly), /23% · 5d 2h/, weekly.join("\n"));
  assert.doesNotMatch(sentence(weekly), /resets in/);
});

test("at its limit the numbers read At limit and the time left", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        windows: [
          win("7d", 0.81, WEEKLY_RESET),
          win("5h", 0.97, NOW + 38 * MINUTE, { atLimit: true }),
        ],
      }),
    ],
  });
  if (!lines) return;
  const all = sentence(lines);
  assert.match(all, /81% · 4d 6h/, lines.join("\n"));
  assert.match(all, /5-hour At limit · 38m/, lines.join("\n"));
  assert.doesNotMatch(all, /97%/);
});

test("a per-model window ahead of weekly gets a bar and numbers of its own", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        windows: [
          win("7d", 0.41, WEEKLY_RESET),
          win("5h", 0.62, SHORT_RESET),
          win("7d:opus", 0.67, WEEKLY_RESET, { label: "Weekly · Opus" }),
        ],
      }),
    ],
  });
  if (!lines) return;
  assert.match(sentence(lines), /Opus 67% · 4d 6h/, lines.join("\n"));
  assert.ok(withId(lines, "account-0-model-0"), lines.join("\n"));
  assert.ok(withId(lines, "account-0-model-0-pace"), lines.join("\n"));
});

test("a per-model window behind weekly is not on the row", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        windows: [
          win("7d", 0.41, WEEKLY_RESET),
          win("5h", 0.62, SHORT_RESET),
          win("7d:opus", 0.18, WEEKLY_RESET, { label: "Weekly · Opus" }),
        ],
      }),
    ],
  });
  if (!lines) return;
  assert.doesNotMatch(sentence(lines), /Opus|18%/, lines.join("\n"));
  assert.equal(withId(lines, "account-0-model-0"), undefined);
});

test("a window that has not started has no pace mark and says so", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        windows: [win("7d", 0, NOW + 6 * DAY + 20 * HOUR), win("5h", 0, null)],
      }),
    ],
  });
  if (!lines) return;
  assert.match(sentence(lines), /0% · not started/, lines.join("\n"));
  assert.ok(withId(lines, "account-0-short"), lines.join("\n"));
  assert.equal(withId(lines, "account-0-short-pace"), undefined);
  assert.ok(withId(lines, "account-0-full-pace"), lines.join("\n"));
});

test("a first read draws the label and empty tracks, no numbers", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [reading({ status: "stale", fetchedAt: null, windows: [] })],
  });
  if (!lines) return;
  assert.ok(texts(lines).includes("maxi"), lines.join("\n"));
  assert.ok(withId(lines, "account-0-full"), lines.join("\n"));
  assert.ok(withId(lines, "account-0-short"), lines.join("\n"));
  assert.doesNotMatch(sentence(lines), /%/, lines.join("\n"));
  assert.ok(!ids(lines).some((id) => id.endsWith("-pace")), lines.join("\n"));
});

test("a failed read dims the last bars, drops resets and pace marks, says its age", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        status: "stale",
        fetchedAt: NOW - 12 * MINUTE,
        error: "network",
      }),
    ],
  });
  if (!lines) return;
  const all = sentence(lines);
  assert.ok(texts(lines).includes("12m old · network"), lines.join("\n"));
  assert.match(all, /41%/);
  assert.match(all, /62%/);
  assert.doesNotMatch(all, /4d 6h|1h 48m|resets/, lines.join("\n"));
  assert.ok(!ids(lines).some((id) => id.endsWith("-pace")), lines.join("\n"));
  assert.match(
    withId(lines, "account-0-full") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
  );
  assert.match(
    withId(lines, "account-0-short") ?? "",
    /\.opacity\[Number\(0\.4\)\]/,
  );
});

test("a failed read with no earlier reading shows empty tracks and the reason", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        status: "error",
        fetchedAt: null,
        error: "network",
        windows: [],
      }),
    ],
  });
  if (!lines) return;
  assert.ok(texts(lines).includes("network"), lines.join("\n"));
  assert.ok(withId(lines, "account-0-full"), lines.join("\n"));
  assert.doesNotMatch(sentence(lines), /%/, lines.join("\n"));
});

test("sign in again: no bars, the control and when the login ended", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [
      reading({
        status: "signed-out",
        loginEndsAt: new Date(2026, 10, 9, 15, 0).getTime(),
      }),
    ],
  });
  if (!lines) return;
  const drawn = texts(lines);
  assert.ok(drawn.includes("Sign in again"), lines.join("\n"));
  assert.ok(drawn.includes("Login ended Nov 9"), lines.join("\n"));
  assert.doesNotMatch(sentence(lines), /%/, lines.join("\n"));
  assert.ok(
    !ids(lines).some((id) => /-(full|short|model|fill|pace)/.test(id)),
    lines.join("\n"),
  );
  const control = withId(lines, "account-0-sign-in") ?? "";
  assert.match(control, /:role\[Str\("button"\)\]/, lines.join("\n"));
  assert.match(control, /:on_click/);
});

test("a login ending within 3 days is said on the label line, bars as usual", (t) => {
  const lines = drawForm(t, "list", {
    size: SIZE,
    readings: [reading({ loginEndsAt: NOW + 2 * DAY })],
  });
  if (!lines) return;
  assert.ok(texts(lines).includes("Login ends in 2 days"), lines.join("\n"));
  assert.ok(withId(lines, "account-0-full-pace"), lines.join("\n"));
  assert.match(sentence(lines), /41% · 4d 6h/);
});

test("six accounts scroll under the header, in the person's order", (t) => {
  const labels = [
    "maxi",
    "maxi · Terac",
    "ana",
    "team-ci",
    "maxi · Lab",
    "maxilr",
  ];
  const lines = drawForm(t, "list", {
    size: { width: 268, height: 320 },
    readings: labels.map((label, index) =>
      reading({
        id: `claude:acct-${index}:org`,
        label,
        windows: [
          win("7d", 0.9 - index * 0.1, WEEKLY_RESET),
          win("5h", 0.1 + index * 0.1, SHORT_RESET),
        ],
      }),
    ),
  });
  if (!lines) return;
  assert.match(withId(lines, "accounts") ?? "", /:overflow_y_scrollbar/);
  for (let index = 0; index < 6; index += 1) {
    assert.ok(
      inside(lines, "accounts", `account-${index}`),
      `account-${index} outside the scroll area\n${lines.join("\n")}`,
    );
  }
  assert.ok(withId(lines, "open-detail"), lines.join("\n"));
  assert.ok(!inside(lines, "accounts", "open-detail"), lines.join("\n"));
  const drawn = texts(lines);
  assert.ok(drawn.indexOf("Limits") < drawn.indexOf("maxi"));
  assert.deepEqual(
    drawn.filter((text) => labels.includes(text)),
    labels,
  );
});
