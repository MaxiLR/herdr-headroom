// The shared state the mod writes: its readings, the person's preferences
// and the toasts already posted. `publish` is the only writer of readings.

import { toastsFor } from "./toasts.js";

export const READINGS_KEY = "headroom.readings";
// `{ notify: boolean }`; absent means notifications are on.
export const PREFS_KEY = "headroom.prefs";
// `{ version: 1, keys: [...] }`: the toasts already posted, by `toastsFor` key.
export const NOTIFIED_KEY = "headroom.notified";

// Publishes `readings` and, unless notifications are off, posts the toasts
// they call for at `now`.
export function publish(host, readings, now) {
  host.setShared(READINGS_KEY, { version: 1, accounts: readings });
  if (host.shared(PREFS_KEY)?.notify === false) return;
  const before = host.shared(NOTIFIED_KEY)?.keys ?? [];
  const { toasts, keys } = toastsFor(readings, before, now);
  for (const toast of toasts) host.notify(toast);
  const changed =
    keys.length !== before.length || keys.some((key, i) => key !== before[i]);
  if (changed) host.setShared(NOTIFIED_KEY, { version: 1, keys });
}

// The readings last published, or none.
export function published(host) {
  return host.shared(READINGS_KEY)?.accounts ?? [];
}
