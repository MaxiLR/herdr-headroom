// What the rail shows of an account: the percent of its tightest window, the
// words its hover gives, and whether the rail is wide enough for the number.

import { levelOf } from "./levels.js";
import { modelName, rowOf } from "./rows.js";
import { failedText, numbersText, percentText, tagOf } from "./words.js";

/** The narrowest rail, in px, with room for the number beside the mark. */
export const NUMBER_MIN_WIDTH = 60;

/**
 * The number on `row`'s line: `{ text: "62%", tag: "5h", level }`, or null
 * when the account has nothing to count (signed out, or not read yet).
 */
export function railNumber(row) {
  if (row.state === "signed-out" || row.tightest === null) return null;
  return {
    text: percentText(row.tightest),
    tag: tagOf(row),
    level: levelOf(row.tightest),
  };
}

/**
 * The tooltip, and the spoken name, of `reading`'s account at `now`:
 * `maxi: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m`.
 */
export function railTooltip(reading, now) {
  const row = rowOf(reading, now);
  if (row.state === "signed-out") return `${row.label}: Sign in again`;
  const windows = [row.weekly, row.short, ...row.models].filter(Boolean);
  if (row.state === "first" || windows.length === 0) {
    return `${row.label}: Not read yet`;
  }
  const failed = row.state === "failed";
  const alone = windows.length === 1;
  const numbers = windows
    .map((window) => {
      const name = row.models.includes(window)
        ? modelName(window)
        : window.label;
      return `${name} ${numbersText(window, now, { alone, failed })}`;
    })
    .join(", ");
  return failed
    ? `${row.label}: ${numbers} · Read failed: ${failedText(reading, now)}`
    : `${row.label}: ${numbers}`;
}

/** True when a rail `width` px wide (null: not measured yet) has the number. */
export function showsNumber(width) {
  return width == null || width >= NUMBER_MIN_WIDTH;
}
