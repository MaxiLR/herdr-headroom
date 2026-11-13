// What one account of the list draws: its bars, its words and its numbers.

import { levelOf } from "./levels.js";
import { untilReset } from "./pace.js";
import { barOf, rowOf } from "./rows.js";
import { failedText, loginText, numbersText, percentText } from "./words.js";

/** Below this width the 5-hour numbers lose their word. */
export const NARROW_PX = 220;

// The tracks of a reading with nothing to show yet.
const EMPTY = { fraction: 0, level: "normal", pace: null };

/**
 * The row of the list for `reading` at `now`, in a block `width` px wide
 * (null before it is laid out, drawn wide):
 *
 * - `state`: `first`, `ok`, `failed` or `signed-out`, as `rowOf` gives it.
 * - `note`: `{ text, tone }` on the label line, or null; `tone` is `muted`,
 *   `high` or `accent` (the Sign in again control).
 * - `ended`: `Login ended Nov 9` under the label of a signed-out account.
 * - `pair`: `{ full, short }` bars (either null when the plan lacks it), or
 *   null for no bars; `dimmed`: the bars are a failed read's last ones.
 * - `numbers`: `{ left, right }` under the pair, or null; each side is
 *   `{ word, parts, level }`, drawn `word parts[0] · parts[1]`.
 * - `limitWords`: `Fable at limit`, the per-model windows at their limit, or
 *   null; drawn after the week's percent, in place of its reset time.
 * - `spoken`: the row for a screen reader, ending with `limitWords`.
 */
export function listRowOf(reading, now, width) {
  const row = rowOf(reading, now);
  const narrow = width != null && width < NARROW_PX;
  const failed = row.state === "failed";
  const base = {
    id: row.id,
    provider: row.provider,
    label: row.label,
    state: row.state,
    note: null,
    ended: null,
    dimmed: false,
    pair: null,
    numbers: null,
    limitWords: row.limitWords,
  };

  if (row.state === "signed-out") {
    const ended = loginText(reading, now);
    return {
      ...base,
      note: { text: "Sign in again", tone: "accent" },
      ended,
      spoken: [row.label, "Sign in again", ended].join(", "),
    };
  }

  const note = failed
    ? { text: failedText(reading, now), tone: "muted" }
    : row.loginWarning
      ? { text: loginText(reading, now), tone: "high" }
      : null;
  const said = (windows) =>
    [row.label, ...windows.map((w) => spokenOf(w, now, failed))]
      .concat(note ? [note.text] : [])
      .concat(row.limitWords ? [row.limitWords] : [])
      .join(", ");

  if (!row.weekly && !row.short) {
    const empty = row.state === "first" || failed;
    return {
      ...base,
      note,
      pair: empty ? { full: EMPTY, short: EMPTY } : null,
      spoken: said([]),
    };
  }

  // With the words in place of the week's reset time, below NARROW_PX the
  // 5-hour side gives up its own (`untimed`) to leave the words room.
  const withWords = row.limitWords !== null;
  const numbers = (window, word, alone, untimed) => {
    const parts = numbersText(window, now, { alone, failed }).split(" · ");
    return {
      word,
      parts: untimed ? parts.slice(0, 1) : parts,
      level: failed ? "normal" : levelOf(window),
    };
  };
  const shortWord = narrow ? null : row.short?.label;
  const left = row.weekly
    ? numbers(row.weekly, null, !row.short && !narrow, withWords)
    : numbers(row.short, shortWord, !narrow, false);
  const right =
    row.weekly && row.short
      ? numbers(row.short, shortWord, false, withWords && narrow)
      : null;

  return {
    ...base,
    note,
    dimmed: failed,
    pair: {
      full: row.weekly ? barOf(row.weekly, now) : null,
      short: row.short ? barOf(row.short, now) : null,
    },
    numbers: { left, right },
    spoken: said([row.weekly, row.short].filter(Boolean)),
  };
}

// `Weekly 41% used, resets in 4d 6h`: one window for a screen reader.
function spokenOf(window, now, failed) {
  const used =
    levelOf(window) === "limit"
      ? `${window.label} at limit`
      : `${window.label} ${percentText(window)} used`;
  if (failed) return used;
  const left = untilReset(window, now);
  return left == null ? `${used}, not started` : `${used}, resets in ${left}`;
}
