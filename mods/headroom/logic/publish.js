// The shared state the mod writes: its readings, the person's preferences
// and the toasts already posted. `publish` is the only writer of readings.

export const READINGS_KEY = "headroom.readings";
// `{ notify: boolean }`; absent means notifications are on.
export const PREFS_KEY = "headroom.prefs";
export const NOTIFIED_KEY = "headroom.notified";

export function publish(host, readings, now) {
  host.setShared(READINGS_KEY, { version: 1, accounts: readings });
}

// The readings last published, or none.
export function published(host) {
  return host.shared(READINGS_KEY)?.accounts ?? [];
}
