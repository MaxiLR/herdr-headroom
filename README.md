# Headroom

One Herdr mod, `headroom`, that shows how close each connected Claude and Codex
account is to its usage limits. For every account it shows each limit window
that account's plan has (5-hour, weekly, and per-model weekly where the
provider reports one): the percent used, a bar that fills left to right, a pace
mark, and the time until the window resets. It signs in to each account and
reads its usage itself, so it needs neither OMP nor the Claude Code or Codex
CLI. Terms are defined in [`CONTEXT.md`](CONTEXT.md); the brief to build it
from scratch is [`RECIPE.md`](RECIPE.md).

## What it shows

- **Percent used**, 0 to 100, rounded down, beside a bar of the same share.
- **Levels.** A window is normal below 75 %, high from 75 %, critical from
  90 %, and at its limit at 100 % or when the provider says the limit is
  reached. Normal bars take the theme's `muted` colour, high ones `working`,
  critical and limit ones `blocked`. In the list and the detail view a window
  at its limit reads "At limit" instead of a percent.
- **Pace mark.** A tick on each bar at the share of the window's time that has
  already passed. A fill past the tick means the account runs out before the
  reset at its current rate. A window the provider reports no reset time for
  (one that has not started) has no tick and reads "not started".
- **Time to reset**, as `<1m`, `42m`, `3h 12m` or `2d 4h`.
- **Only the windows the plan has.** A Codex plan with a weekly window alone
  shows one bar. Per-model weekly windows are in the detail view, and on an
  account's row only when one is more used than the general weekly window.
- **Account states.** A read that failed keeps the last reading, dimmed, with
  its age and the reason (`12m old · network`). An account whose login has
  ended shows "Sign in again" and no bars. A Claude account warns in its last 3
  days before its login ends.

## Install

Install Herdr and start it once, so its home exists: `$HERDR_APP_HOME` when
set, else `~/.config/herdr-app`.

```sh
scripts/install.sh --dry-run          # what it would do; changes nothing
scripts/install.sh                    # install the mod
scripts/install.sh --layout           # and add the layout main-headroom
scripts/install.sh --layout my-name   # or a layout of another name
```

`scripts/install.sh [--dry-run] [--layout [name]]` prints one line per step: a
mark (`✔` done, `•` would do, `!` left for you, `✖` failed), the step and what
happened. On a terminal the lines are coloured; piped output is plain, and
`NO_COLOR` turns colours off. It refuses, changing nothing, when the Herdr home
does not exist.

- **Back up.** A previous install in `<Herdr home>/mods/headroom/` is moved to
  `<Herdr home>/backups/headroom-<YYYYmmdd-HHMMSS>/` (with `-2`, `-3`, … when
  that name is taken), outside `mods/` so Herdr does not load the backup as a
  mod. A first install makes no backup.
- **Copy.** `mods/headroom/` of this checkout is copied to
  `<Herdr home>/mods/headroom/`, leaving out the `gpui-kit.d.ts` and
  `jsconfig.json` Herdr writes itself. On a reinstall it reports how many files
  changed, were added or were removed; `--dry-run` lists each one.
- **Check.** When `herdr-app` is on `PATH`, it runs `herdr-app check` on the
  installed folder. A failed check prints what `herdr-app` said and exits 1;
  without `herdr-app` the check is skipped with a warning.
- **Layout** (`--layout`, default name `main-headroom`). It needs `jq`. It
  writes `<Herdr home>/layouts/<name>.json`: a copy of the home's
  `layouts/main.json` with one Headroom block added to the `sidebar` column,
  right after `sidebar-lists` and before `sidebar-footer`. It never overwrites a
  layout and never switches to it; it prints the command that does:

  ```sh
  herdr-app do layout.switch --name main-headroom
  ```

  Without `jq`, without `layouts/main.json`, with a `main.json` that is not
  valid JSON or has no `sidebar` node holding `sidebar-lists` then
  `sidebar-footer`, or when the layout already exists, it says so, writes no
  layout and still installs the mod.

The installer binds no key and never reads, copies or removes the vault
(`<Herdr home>/headroom/`).

To undo: remove `<Herdr home>/mods/headroom/`, and the layout file if one was
written. To go back to an earlier version, copy the backup folder back to
`<Herdr home>/mods/headroom/`. Remove `<Herdr home>/headroom/` to delete every
stored login.

## Using it in your own layout

The block the installer adds:

```json
{
  "id": "headroom",
  "type": "block",
  "content": { "mod": "headroom", "props": { "fit": "headroom" } }
}
```

`mod.json` is `{ "place": "none" }`: Herdr docks no copy by itself; the mod
appears only where a layout puts it.

### Props

| Prop   | Values                                              | What it does                                                                                                                                                                                 |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form` | `auto` (default), `list`, `rail`, `strip`, `detail` | The form to draw. With `auto`, or none, the block's measured size decides.                                                                                                                   |
| `fit`  | the `id` of the block holding this copy             | The list and the rail resize that block (`layout.resize`) to the height their accounts need, up to 320 px (four accounts); past that the accounts scroll. The strip never resizes its block. |

The connect dialog is the same mod opened as a dialog with a `connect` prop
(`{ provider, account }` when it signs an account in again), and Herdr gives
every overlay an `overlay` prop; a layout sets neither.

The mod binds no key. Its one command, `headroom.remove`, is the one Herdr's
confirm dialog sends once a removal is confirmed; sent at any other time it
does nothing.

### Forms

With `form` set to `auto`, before its first measure the block is a list; after:

- **Rail** when the block is narrower than 160 px (Herdr's folded sidebar):
  each account's mark and the percent of its tightest window, over its pair of
  bars. Below 60 px wide the percent is left out and the mark is centred.
  Hovering an account names it and gives its numbers.
- **Strip** when the block is under 48 px tall (a status bar): one line with an
  item per account. When the line is too narrow the labels go first, then the
  bars; the marks and percents stay.
- **List** otherwise: a "Limits" header and, per account, its mark and label,
  a full bar for the weekly window over a thin one for the 5-hour window, and
  one line of numbers. Below 220 px wide the 5-hour numbers lose their word.
- **Detail**, only when `form` is `detail`: every window of every account, the
  reset's clock time, when a login ends, the refresh control, the
  notifications switch, Connect account and each account's menu (Rename, Move
  up, Move down, Sign in again, Remove). From 520 px wide each window is one
  line; below 340 px the clock time is left out.

A click on an account in the list, the rail or the strip, and the list's
header control, open the detail view as a 380 px popup.

### The strip's separator

A strip starts with a 1 px rule when its block follows a shown block in the
same `row` of the layout, and has none when it is alone or first in its row.
The copy finds its own block by `props.fit`; without `fit`, by being the only
block of the `headroom` mod in the layout. When it cannot tell (no layout, two
Headroom blocks and no `fit`), it draws no rule.

A strip in a status bar row:

```json
{
  "type": "block",
  "id": "headroom-strip",
  "size": { "px": 28 },
  "content": {
    "mod": "headroom",
    "props": { "form": "strip", "fit": "headroom-strip" }
  }
}
```

### The detail view as a pane or a dialog

As a pane, from a shell:

```sh
herdr-app do pane.split --direction right --mod headroom --props '{"form":"detail"}'
```

As a dialog, from another mod:

```js
import { openOverlay } from "herdr";

openOverlay({
  mod: "headroom",
  kind: "dialog",
  width: 520,
  props: { form: "detail" },
});
```

## Connecting accounts

"Connect account" (in the detail view's footer, or in an empty list, rail or
strip) opens the connect dialog. Choose a provider; the mod opens the
provider's sign-in page in the browser and shows its address with Copy and
Open.

- **Claude** (a Claude Pro or Max subscription): approve on Claude's page,
  copy the code it shows and paste it into the dialog. The code with its
  `#state`, the bare code, or the whole address of the page that shows the code
  all work. A code from another sign-in is refused.
- **Codex** (a ChatGPT subscription): the dialog shows a device code; enter it
  on OpenAI's page. The mod waits for the approval, asking as often as OpenAI
  says (every 5 seconds when it does not say), and gives up after 15 minutes.
  Closing the dialog stops the wait.

Connecting an account that is already connected (the same provider account and
organization) replaces its login and keeps its label and place. A new account
goes last, labelled with its email's name part; when another account already
has that label, its organization, or its plan, is added. One email with several
organizations gives one account per organization.

A Claude login ends 30 days after sign-in, whatever happens in between: the
detail view shows the date, and the row warns during the last 3 days. A Codex
login does not end on its own. When a provider rejects a login, the account
shows "Sign in again"; its stored login is kept until it signs in again or is
removed.

Readings are fetched for every account every 5 minutes, when one of its
windows' reset time passes, and when asked: the refresh control in the detail
view reads every account again, except one read in the last 30 seconds. An
access token that expires within 5 minutes is refreshed before a read, and
once more after a read the provider refuses (401). An account showing "Sign in
again" is not read.

## Notifications

A Herdr toast when an account's window reaches 90 % ("work is at 91% of its
weekly limit", a warning) and when it hits its limit ("work reached its 5-hour
limit", an error), each with "Resets in …" when the reset time is known. Each
is posted once per account, window, reset period and threshold; a jump straight
past both posts the limit toast only. A window that resets can post again. The
switch "Notify at 90% and at the limit" in the detail view turns them off for
every copy. Clicking a toast does nothing.

## What it contacts, stores and runs

### Hosts

| Host                  | Address                                                         | When                                                                                            |
| --------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `claude.ai`           | `https://claude.ai/oauth/authorize`                             | In the browser only, when a Claude sign-in starts.                                              |
| `platform.claude.com` | `https://platform.claude.com/oauth/code/callback`               | In the browser only: the page Claude sends it to after approval, which shows the code to paste. |
| `api.anthropic.com`   | `POST https://api.anthropic.com/v1/oauth/token`                 | Exchanging the pasted code for tokens; refreshing a Claude token.                               |
| `api.anthropic.com`   | `GET https://api.anthropic.com/api/oauth/usage`                 | Each read of a Claude account.                                                                  |
| `auth.openai.com`     | `POST https://auth.openai.com/api/accounts/deviceauth/usercode` | When a Codex sign-in starts, for the device code.                                               |
| `auth.openai.com`     | `https://auth.openai.com/codex/device`                          | In the browser only: the page where the device code is entered.                                 |
| `auth.openai.com`     | `POST https://auth.openai.com/api/accounts/deviceauth/token`    | While waiting for the approval, at OpenAI's interval, for at most 15 minutes.                   |
| `auth.openai.com`     | `POST https://auth.openai.com/oauth/token`                      | Exchanging the approval for tokens; refreshing a Codex token.                                   |
| `chatgpt.com`         | `GET https://chatgpt.com/backend-api/wham/usage`                | Each read of a Codex account.                                                                   |

`https://auth.openai.com/deviceauth/callback` is sent as the Codex redirect
address and is never opened. `https://api.openai.com/auth` and
`https://api.openai.com/profile` are only the names of claims read from the
Codex token; nothing is sent there. The mod contacts no other host, and only
when an account is connected, read or refreshed.

### What is stored, and where

- **The vault**, `<Herdr home>/headroom/vault.json`:
  `{ "version": 1, "accounts": [...] }`. Each account holds its `id`
  (`<provider>:<account id>:<organization id>`), `provider`, `label`,
  `position`, `accessToken`, `refreshToken`, `expiresAt`, `signedInAt` and
  `identity` (`accountId`, `organizationId`, `email`, `organization`, `plan`).
  The folder is made 0700 and the file is created empty and set to 0600 before
  the first token is written; the file's mode is checked after every write and
  set to 0600 again when it is not. When the folder or file cannot be made
  private, the mod empties the file, stores nothing and says "Could not keep
  the login private, so nothing was stored." The vault lives outside `mods/`,
  so copying or sharing the mod folder never carries a login. Removing an
  account deletes its login from the vault.
- **Herdr's shared state**, which Herdr keeps in `<Herdr home>/shared.json` and
  every mod can read:
  - `headroom.readings`: the current readings (see below).
  - `headroom.prefs`: `{ "notify": false }` when notifications are off; absent
    or anything else means on.
  - `headroom.notified`: `{ "version": 1, "keys": [...] }`, the toasts already
    posted, each `<account id>|<window id>|<reset time>|<90 or limit>`.

  No token or email is in shared state. The label is the only personal text
  there; the ids are made of the provider's own account and organization ids.

- **Nothing in `localStorage`**, and nothing written anywhere else. The mod
  also reads Herdr's shipped icons (`icons/claude.svg`, `icons/codex.svg`,
  `mods/workspace-chrome/spinner.svg`, `mods/workspace-chrome/plus.svg`,
  `mods/workspace-chrome/chevron-left.svg`,
  `mods/workspace-chrome/chevron-right.svg`) and its own
  (`mods/headroom/icons/more.svg`, `mods/headroom/icons/refresh.svg`).

### Programs it runs

| Program                | Arguments                                         | Why                                                        |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `open` (macOS)         | the sign-in address                               | Opens the provider's sign-in page in the browser.          |
| `xdg-open` (elsewhere) | the sign-in address                               | The same on Linux.                                         |
| `mkdir`                | `-p <Herdr home>/headroom`                        | Creates the vault's folder before the mod first saves it.  |
| `chmod`                | `700 <Herdr home>/headroom`                       | Makes the folder readable by its owner only.               |
| `chmod`                | `600 <Herdr home>/headroom/vault.json`            | Makes the vault readable and writable by its owner only.   |
| `stat`                 | `-f %Lp <vault>` (macOS), `-c %a <vault>` (Linux) | Checks the vault's mode after it is set and after a write. |

The browser gets the sign-in address; the other programs get paths and modes.
No program is given a token. The browser is opened when a sign-in starts and
from the dialog's Open control; the address is always shown with a Copy
control as well, and nothing else is opened.

## For other mods: `headroom.readings`

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

## Said plainly

- **Undocumented endpoints, first-party client ids.** The usage and sign-in
  endpoints above are not documented by either provider, and the client ids
  the mod signs in with are the providers' own first-party ones (Claude Code's
  and Codex's), which neither provider has approved for third-party use. Either
  provider can change or close them without notice. That shows as that
  provider's reads failing, or its sign-in failing; the other provider's
  accounts are unaffected.
- **A vault file is a login.** The Claude token carries inference scope
  (`user:inference`, among the scopes Claude Code's own sign-in asks for), so a
  leaked `vault.json` equals a leaked Claude Code login. Every installed Herdr
  mod runs as you and could read it.
- **Version.** Written against herdr-app 0.1.15 and its generated type files; a
  later version can change the mod interface.
- **Scope.** This computer's accounts only; macOS and Linux.

## Development

```sh
npm ci
node --test 'tests/*.test.mjs'
npx prettier --check .
herdr-app check mods/headroom
```

The tests run the logic and the providers under node against fakes of Herdr
and of the providers' responses, draw the forms with
`herdr-app check --print-spec`, and run the installer against temporary Herdr
homes, never the live one. `herdr-app check` loads the mod with empty shared
state, the state with no accounts.

```
mods/headroom/
  main.js          the View: picks a form from props and the measured size
  mod.json         { "place": "none" }
  logic/           plain modules, no gpui-kit or herdr imports
  providers/       claude.js, codex.js, index.js: one adapter per provider
  ui/              one module per form and dialog, and the shared kit
  icons/           the mod's own SVGs
scripts/install.sh copies the mod into a Herdr home; optional layout
tests/             node --test, with fixtures and helpers
```

## Licence

MIT, see [`LICENSE`](LICENSE). The sign-in, refresh and usage-read method, its
constants and the knowledge of the payloads come from oh-my-pi (MIT); see
[`NOTICE`](NOTICE).
