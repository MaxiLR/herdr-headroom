import { test } from "node:test";
import assert from "node:assert/strict";
import { drawForm, withId } from "./helpers/draw.mjs";
import { NOW, reading, win } from "./helpers/fakes.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MAXI = "claude:acct-maxi:org-maxi";
const WORK = "claude:acct-work:org-work";

// maxi at 41 % weekly and 62 % 5-hour; work at 78 % and 91 %.
const maxi = reading({ id: MAXI });
const work = reading({
  id: WORK,
  label: "work",
  windows: [win("7d", 0.78, NOW + 2 * DAY), win("5h", 0.91, NOW + 2 * HOUR)],
});

const ACCOUNTS = [
  { id: MAXI, provider: "claude", label: "maxi" },
  { id: WORK, provider: "claude", label: "work" },
];

const show = (lines) => lines.join("\n");

// The lines drawn inside the element with `id`.
function inside(lines, id) {
  const start = lines.findIndex((line) => withId([line], id));
  if (start < 0) return [];
  const depth = lines[start].search(/\S/);
  const found = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.search(/\S/) <= depth) break;
    found.push(line);
  }
  return found;
}

// The width a fill is drawn at, as `41%`.
const widthOf = (line) => line?.match(/\.w\[Str\("([^"]*)"\)\]/)?.[1];

// Every id of a bar: its track, its fill and its pace mark.
const parts = (bar) => [bar, `${bar}-fill`, `${bar}-pace`];

// Each form's bars of maxi and of work, with the width each fill is drawn at.
const FORMS = [
  {
    form: "list",
    size: { width: 268, height: 400 },
    bars: {
      [MAXI]: [
        [`bar-${MAXI}-full`, "41%"],
        [`bar-${MAXI}-short`, "62%"],
      ],
      [WORK]: [
        [`bar-${WORK}-full`, "78%"],
        [`bar-${WORK}-short`, "91%"],
      ],
    },
  },
  {
    form: "rail",
    size: { width: 76, height: 300 },
    bars: {
      [MAXI]: [
        [`bar-${MAXI}-full`, "41%"],
        [`bar-${MAXI}-short`, "62%"],
      ],
      [WORK]: [
        [`bar-${WORK}-full`, "78%"],
        [`bar-${WORK}-short`, "91%"],
      ],
    },
  },
  {
    form: "strip",
    size: { width: 640, height: 28 },
    bars: {
      [MAXI]: [
        [`bar-${MAXI}-full`, "41%"],
        [`bar-${MAXI}-short`, "62%"],
      ],
      [WORK]: [
        [`bar-${WORK}-full`, "78%"],
        [`bar-${WORK}-short`, "91%"],
      ],
    },
  },
  {
    form: "detail",
    size: { width: 380, height: 640 },
    bars: {
      [MAXI]: [
        [`bar-${MAXI}-7d`, "41%"],
        [`bar-${MAXI}-5h`, "62%"],
      ],
      [WORK]: [
        [`bar-${WORK}-7d`, "78%"],
        [`bar-${WORK}-5h`, "91%"],
      ],
    },
  },
];

for (const { form, size, bars } of FORMS) {
  test(`in the ${form}, an account's bars keep their ids when the order changes`, (t) => {
    const fixture = {
      props: { form, overlay: "overlay-1" },
      size,
      accounts: ACCOUNTS,
    };
    const before = drawForm(t, form, { ...fixture, readings: [maxi, work] });
    if (!before) return;
    const after = drawForm(t, form, { ...fixture, readings: [work, maxi] });
    for (const lines of [before, after]) {
      for (const [id, entries] of Object.entries(bars)) {
        for (const [bar, width] of entries) {
          assert.ok(bar.includes(id), bar);
          for (const part of parts(bar)) {
            assert.ok(withId(lines, part), `${part} missing\n${show(lines)}`);
          }
          assert.equal(widthOf(withId(lines, `${bar}-fill`)), width, bar);
        }
      }
    }
    // The row keeps its index and now holds the other account's bars.
    const first = (lines, id) =>
      bars[id].every(([bar]) =>
        inside(lines, "account-0").some((line) => withId([line], bar)),
      );
    assert.ok(first(before, MAXI), show(before));
    assert.ok(!first(before, WORK), show(before));
    assert.ok(first(after, WORK), show(after));
    assert.ok(!first(after, MAXI), show(after));
  });
}
