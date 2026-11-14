# What it contacts, stores and runs

[Back to the README](../README.md)

## Hosts

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

## What is stored, and where

- **The vault**, `<Herdr home>/headroom/vault.json`:
  `{ "version": 1, "accounts": [...] }`. Each account holds its `id`
  (`<provider>:<account id>:<organization id>`), `provider`, `label`,
  `position`, `accessToken`, `refreshToken`, `expiresAt`, `signedInAt` and
  `identity` (`accountId`, `organizationId`, `email`, `organization`, `plan`;
  a Codex plan as words, `Self serve business prolite` for
  `self_serve_business_prolite`).
  The folder is made 0700 and the file is created empty and set to 0600 before
  the first token is written; the file's mode is checked after every write and
  set to 0600 again when it is not. When the folder or file cannot be made
  private, the mod empties the file, stores nothing and says "Could not keep
  the login private, so nothing was stored." in the connect dialog, or in an
  error toast when a refresh, rename, move or remove was refused. The vault
  lives outside `mods/`, so copying or sharing the mod folder never carries a
  login. Removing an account deletes its login from the vault.
- **Herdr's shared state**, which Herdr keeps in `<Herdr home>/shared.json` and
  every mod can read:
  - `headroom.readings`: the current readings (see [readings.md](readings.md)).
  - `headroom.prefs`: `{ "notify": false }` when notifications are off; absent
    or anything else means on.
  - `headroom.notified`: `{ "version": 1, "keys": [...] }`, the toasts already
    posted, each `<account id>|<window id>|<reset time>|<90 or limit>`.
  - `headroom.fit`: `{ "<layout name>": { "<block id>": <px> } }`, the height
    last asked for each block given `props.fit`.

  No token or email is in shared state. The label is the only personal text
  there; the ids are made of the provider's own account and organization ids.

- **Nothing in `localStorage`**, and nothing written anywhere else. The mod
  also reads Herdr's shipped icons (`mods/workspace-chrome/spinner.svg`,
  `mods/workspace-chrome/plus.svg`, `mods/workspace-chrome/chevron-left.svg`,
  `mods/workspace-chrome/chevron-right.svg`,
  `mods/workspace-chrome/chevron-down.svg`) and its own in
  `mods/headroom/icons/` (`chatgpt.svg`, `claude.svg`, `arrow-up.svg`,
  `arrow-down.svg`, `more.svg`, `pencil.svg`, `refresh.svg`, `trash.svg`).

## Programs it runs

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
