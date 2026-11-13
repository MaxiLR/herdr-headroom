// The toasts a window posts when it reaches 90 % and when it hits its limit:
// once per account, window, reset period and threshold.

import { levelOf } from "./levels.js";
import { countdown } from "./pace.js";
import { percentText } from "./words.js";

// `account|window|resetsAt|threshold`; the threshold is `90` or `limit`.
function keyOf(reading, window, threshold) {
  return [reading.id, window.id, window.resetsAt ?? "", threshold].join("|");
}

// Whether the window `key` was posted for has reset at `now`.
function hasReset(key, now) {
  const parts = key.split("|");
  const resetsAt = parts[parts.length - 2];
  return resetsAt !== "" && Number(resetsAt) <= now;
}

// The words of the toast `window` of `reading` posts for `threshold` at `now`.
function toastOf(reading, window, threshold, now) {
  const name = window.label.charAt(0).toLowerCase() + window.label.slice(1);
  const toast =
    threshold === "limit"
      ? { title: `${reading.label} reached its ${name} limit`, level: "error" }
      : {
          title: `${reading.label} is at ${percentText(window)} of its ${name} limit`,
          level: "warning",
        };
  if (window.resetsAt != null) {
    toast.body = `Resets in ${countdown(window.resetsAt - now)}`;
  }
  return toast;
}

// The toasts `readings` post at `now` given the `keys` already posted, and
// the keys posted after them.
export function toastsFor(readings, keys, now) {
  const posted = new Set(keys.filter((key) => !hasReset(key, now)));
  const toasts = [];
  for (const reading of readings) {
    if (reading.status !== "ok") continue;
    for (const window of reading.windows) {
      const level = levelOf(window);
      const at90 = keyOf(reading, window, "90");
      const atLimit = keyOf(reading, window, "limit");
      if (level === "limit" && !posted.has(atLimit)) {
        toasts.push(toastOf(reading, window, "limit", now));
        posted.add(at90).add(atLimit);
      } else if (level === "critical" && !posted.has(at90)) {
        toasts.push(toastOf(reading, window, "90", now));
        posted.add(at90);
      }
    }
  }
  return { toasts, keys: [...posted] };
}
