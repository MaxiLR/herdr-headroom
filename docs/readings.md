# For other mods: `headroom.readings`

[Back to the README](../README.md)

The current readings are published in Herdr's shared state under
`headroom.readings`, rewritten whenever a reading or an account changes. This
shape is the mod's public interface, and `version` is `1`.

```js
{ version: 1, accounts: [reading, ...] }   // in the person's order
```

A reading:

| Field         | Meaning                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | The account's id: `<provider>:<account id>:<organization id>`.                                                                                |
| `provider`    | `"claude"` or `"codex"`.                                                                                                                      |
| `label`       | The account's label, as the person named it.                                                                                                  |
| `plan`        | The plan's name (`"Plus"`, `"Pro"`) as Codex reports it, or `null`. Claude reports none.                                                      |
| `status`      | `"ok"`, `"stale"`, `"error"` or `"signed-out"` (below).                                                                                       |
| `fetchedAt`   | When the windows were read, ms since the epoch; `null` before the first read that worked. For `"signed-out"`: when the ended login was found. |
| `error`       | Only on a failed read: `"network"`, `"auth"` or `"unexpected"`.                                                                               |
| `loginEndsAt` | Claude only: when the login ends, ms since the epoch (sign-in plus 30 days).                                                                  |
| `windows`     | The account's windows; empty before the first read that worked and when signed out.                                                           |

`status`:

- `"ok"`: the last read worked; `windows` are current.
- `"stale"`: with `error`, the last read failed and `windows` and `fetchedAt`
  are those of the last read that worked. Without `error` and with `fetchedAt`
  `null`, the account has not been read yet.
- `"error"`: the last read failed and none has worked yet; no windows.
- `"signed-out"`: the provider rejected the login; no windows until the
  account signs in again.

A window:

| Field          | Meaning                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Its kind (below).                                                                                                                 |
| `label`        | Its name: `"5-hour"`, `"Weekly"`, `"Weekly · Opus"`, `"Review Tasks · 90-minute"`.                                                |
| `durationMs`   | The window's length in ms.                                                                                                        |
| `usedFraction` | The share used, 0 to 1 (the provider's percent over 100).                                                                         |
| `resetsAt`     | When it resets, ms since the epoch; `null` when the window has not started.                                                       |
| `atLimit`      | Claude: the window is at 100 % or more. Codex: the provider says the limit is reached, on its fullest window and on any at 100 %. |

Window ids:

- `5h`: the 5-hour window; `7d`: the weekly window.
- `7d:<model>`: a Claude per-model weekly window, `<model>` the model's name
  in lower case with every run of other characters as `-` (`7d:opus`,
  `7d:sonnet`).
- `<n><unit>`: a Codex window of another length, `<unit>` the largest of `d`,
  `h`, `m`, `s` that divides it (`1d`, `90m`).
- `extra:<name>:<length>`: a Codex additional limit, `<name>` its name in lower
  case with every run of other characters as `-`
  (`extra:review-tasks:90m`).

Claude windows come weekly, then 5-hour, then per model. Codex windows come
longest first, then the additional limits.

Another mod reads it in its render; Herdr re-renders every mod when shared
state changes:

```js
import { shared } from "herdr";

// `work 41%` for each account read with a weekly window.
function weeklyLines() {
  const readings = shared("headroom.readings");
  const accounts = readings?.version === 1 ? readings.accounts : [];
  return accounts.flatMap((account) => {
    const weekly = account.windows.find((window) => window.id === "7d");
    if (account.status !== "ok" || !weekly) return [];
    return [`${account.label} ${Math.floor(weekly.usedFraction * 100)}%`];
  });
}
```
