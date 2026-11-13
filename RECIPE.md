# Headroom

A quiet block that tells you, for every Claude and Codex account you have
connected, how close each of its limit windows is to its limit. Each account is
a row with its provider's mark and its label, a full bar for its weekly window
over a thin bar for its 5-hour window, a small tick on each bar where the clock
is in that window, and one line of numbers: the percent used and the time until
the window resets. Bars turn the theme's working colour from 75 % and its
blocked colour from 90 %, and a toast says so at 90 % and at the limit. The
same mod folds into a rail of marks and percents, a one-line strip for a status
bar, a view of each account alone with its own actions, and a detail view with
every window of every account.

![Headroom](preview.png)

## What you see

Every colour is a `theme()` colour by name but one: Claude's orange, `#D97757`,
on Claude's spark. Text is the theme's UI font unless it says mono, which is
the terminal font (`settings().font_family`, else `JetBrains Mono`).

**Bars, everywhere.** A rounded track, `foreground` at 10 % opacity, with a
rounded fill from the left. Full bars are 6 px tall (5 px in the rail and the
strip), thin bars 3 px. A fill that is not empty is at least 3 px wide. Fill by
level: normal `muted`, high `working`, critical and limit `blocked`. The number
beside a bar: normal `muted`; the other levels their fill colour mixed 22 %
toward `foreground`. The pace mark is a 2 px wide `foreground` tick in a 1.5 px
halo of the colour behind the bar, centred on the bar: it reaches 2 px beyond
it above and below (1 px in the rail and the strip). A failed read's bars are
at 40 % opacity with no pace mark. Provider marks are the providers' own
logos, from the mod's own `mods/headroom/icons/`: the ChatGPT logo
(`chatgpt.svg`) in `foreground` for Codex, Claude's spark (`claude.svg`) in
`#D97757` for Claude.

**List** (the default; a sidebar block, 268 px wide in Herdr's `main`). Ground
`chrome`.

- Header, 41 px: "Limits" at 11.5 px medium in `dim` on the left (16 px in, 14
  px from the top); on the right a 22 px control with three dots (14 px,
  `muted`), tooltip "Accounts and settings", `hover` ground, that opens the
  detail view.
- Each account, 8 px in from the block and 8 px of its own padding, 9 px below:
  a 26 px label line (14 px mark, 8 px gap, the label at 13 px in `foreground`,
  and on the right a note at 11 px), then the pair of bars 6 px apart, then a
  14 px numbers line 6 px below at 11 px in `muted`: the weekly window's
  numbers on the left (`41% · 4d 6h`), the 5-hour window's on the right
  (`5-hour 62% · 1h 48m`); the percent in its level's number colour, the `·`
  in `dim`. Below 220 px wide the 5-hour numbers drop the word "5-hour". A plan
  with one window shows one bar and `23% · resets in 5d 2h`. A per-model weekly
  window is never a bar on the row, nor the rail's or the strip's percent.
- Notes: a failed read, `12m old · network` in `muted`; a Claude login in its
  last 3 days, `Login ends in 2 days` in the high number colour. A signed-out
  account: the label in `muted`, "Sign in again" at 11 px in `accent` on the
  right, `Login ended Nov 9` on a 14 px line below, and no bars.
- No accounts: "No accounts yet" (13 px medium, `foreground`), "Connect a
  Claude or Codex account to see how close it is to its limits." (12 px,
  `muted`), and a 28 px "Connect account" button with Herdr's plus icon, a
  1 px `input` border and 8 px corners.
- The list fills its block; the header stays and the accounts scroll under it.
  Only with `fit` does the block grow with its accounts, up to 329 px (four
  accounts), past which they scroll.
- A click on an account opens its account view.

**Rail** (a block narrower than 160 px; Herdr's folded sidebar). Ground
`chrome`, 4 px top and bottom. Each account, 8 px by 6 px of padding: a 16 px
line with the 14 px mark on the left and the percent of its tightest window on
the right (11 px, its level's number colour), then `5h` in `dim` at 10.5 px when
the 5-hour window is the tightest; under it the pair of bars, 4 px apart. Below
60 px wide only the mark, centred. A signed-out account: the mark at 45 %
opacity and a 14 px "!" badge (10.5 px bold in the high number colour on
`working` at 15 %), no bars. No accounts: one 28 px control with the plus icon.
A click on an account opens its account view.

**Strip** (a block under 48 px tall; a status bar, 28 px tall in Herdr's
`main`). Ground `chrome`, text 11.8 px in `muted`, 14 px padding each side. One
line of 22 px items, 16 px apart: the 12 px mark, the label, the 44 px wide
pair of bars (5 px and 3 px, 4 px apart), the percent of the tightest window and
the `5h` tag at 10.5 px, 6 px between parts. When another shown block comes
before it in its row, it starts with a 1 px by 14 px rule in `dim` (2 px from
the edge, 16 px before the first item). When the line is too narrow the labels
go first, then the bars. A signed-out account: the faded mark and the "!"
badge. No accounts: the words "Connect account". A click on an account opens
its account view.

**Detail view** (a 380 px popup; also a dialog or a pane). Ground `popover`,
text 13 px.

- Header, 46 px: "Limits" at 14 px semibold, `Read 2m ago` (or `Read just
now`) at 11.5 px in `muted`, and a 26 px refresh control with a 14 px icon.
- Each account, separated by a 1 px `border` rule, 16 px in, 11 px above and 13
  px below, the whole of it a button with the `hover` ground that opens its
  account view: a 24 px line with the 16 px mark, the label at 13 px medium,
  the plan at 12 px in `muted` (`Plus`), a spacer, why the last read failed or
  "Sign in again" in `accent`, and, with two accounts or more, two 22 px arrows
  (14 px icons in `muted`; at 35 % and doing nothing where the account cannot
  move). Then the email and organization at 11.5 px in `muted`
  (`name@example.com · Example`), 24 px in.
- Each window: a 16 px line at 12 px with its name in `muted`, the percent (or
  "At limit") in its level's number colour, `resets in 4d 6h` (or `not
started`) and the reset's clock time (`16:20` today, else `Mon 20:30`) at
  11.5 px in `muted`; the bar 6 px below. From 520 px wide each window is one
  line: name 120 px, bar, percent 56 px, reset 104 px, time 66 px. Below 340 px
  the clock time goes. Windows: the general ones longest first, then per
  model, then the others.
- `Login ends Dec 5` at 11.5 px, 12 px below the windows, in the high number
  colour in its last 3 days; `Login ended Nov 9` for a signed-out account.
- Footer, 1 px `border` rule above, 16 px by 12 px: a 30 by 18 px switch
  (`accent` with an `accent_foreground` knob when on, `input` with a `muted`
  knob when off), "Notify at 90% and at the limit" at 12 px in `muted`; when
  the shown layout has a `headroom-strip` block, 10 px under it the same
  switch and "Show in status bar", on while that block is shown, which shows
  and hides it (28 px more footer); and, centred on them at the right, a 30 px
  "Connect account" button on `raised` with an `input` border.
- The popup is as tall as its accounts, at most 640 px; past that they scroll.

**Account view** (a 380 px popup, as tall as its content up to 640 px; past
that its windows scroll). Ground `popover`, text 13 px.

- Header, 12 px down, 16 px in: a 26 px line with the 16 px mark, the label at
  14 px semibold (`muted` when signed out), the plan at 12 px in `muted`, and
  on the right the age of the reading at 11.5 px in `muted` (`Read 2m ago`, or
  `12m old · network` after a failed read) and a 26 px refresh control. Under
  it, 40 px in, the email and organization at 11.5 px in `muted`.
- Each window, 13 px below the last, 16 px in: its name at 12 px in
  `foreground`, its bar 6 px below (full, or thin for the 5-hour window), and 6
  px below that a 14 px line at 11 px in `muted`: the percent (or "At limit")
  in its level's number colour, `·` in `dim`, `resets in 4d 6h` (or `not
started`), and the clock time on the right. A failed read: the bars dimmed,
  the percents alone. Not read yet: a pair of empty tracks. Signed out: no
  bars.
- When a bar carries its pace mark, 14 px below: an 18 px key (a full bar half
  filled, its tick at the middle) and "The line on a bar marks how much of its
  time has passed." at 11.5 px in `muted`.
- `Login ends Dec 5` at 11.5 px, 12 px below, in the high number colour in its
  last 3 days (`Login ends in 2 days`); `Login ended Nov 9` for a signed-out
  account.
- Actions, after a 1 px `border` rule, 16 px by 12 px, 8 px apart: 30 px
  buttons with 8 px corners on `raised` with an `input` border, 12.5 px medium:
  Rename, Sign in again (on `solid` for a signed-out account) and, at the
  right, Remove in the critical number colour. Rename turns the label into a
  24 px field with the text selected.
- Last, after a 1 px `border` rule, a 38 px row: "Accounts and settings" at 12
  px in `muted`, a chevron on the right.

**Connect dialog** (a 420 px dialog). Ground `popover`, 18 px padding. Title at
15 px semibold ("Connect an account", "Connect Claude", "Connect Codex"), `Esc`
at 11 px in `dim` on the right, a back chevron once a provider is chosen.

- Choose: two 56 px rows with a 1 px `input` border and 9 px corners, the 22 px
  mark, the name, "Sign in with your Claude account" / "Sign in with your
  ChatGPT account" at 12 px in `muted`, and a chevron; under them "You sign in
  on the provider's own page, in your browser. The login stays on this
  computer, in a file only you can read."
- Claude: "Your browser opened Claude's sign-in page. Approve there, then copy
  the code it shows you."; the sign-in address in mono at 11.5 px in a 36 px
  field with Copy and Open; a 36 px field "Paste the code"; "The whole address
  of the page that shows the code works too."; Cancel and Connect (on `solid`,
  disabled at 45 % until a code is pasted, a spinner while it is checked).
- Codex: "Your browser opened OpenAI's sign-in page. Enter this code there.";
  the device code in mono at 22 px medium in a 56 px box with Copy; the address
  with Copy and Open; Herdr's spinner in `working` with "Waiting for you to
  approve" and `stops in 14m`; Cancel.
- A failure is one line at 12 px in the critical number colour, and the
  primary button becomes "Start again".

## How it behaves

**Levels.** Normal below 75 %, high from 75 %, critical from 90 %, at its limit
at 100 % or when the provider says the limit is reached. The percent is rounded
down. Levels are told apart by the number and the words as well as the colour:
a window at its limit reads "At limit" in the list and the detail view.

**Pace mark.** At `1 - (resetsAt - now) / duration`, clamped to the bar. A
window with no reset time has not started: no mark, and `not started`.

**Account states.**

- Not read yet: empty tracks, no numbers.
- Read: the bars and numbers.
- Read failed: the last good bars dimmed, the numbers without the time, and
  the age and reason (`12m old · network`, `sign-in`, `unexpected`).
- Login ending (Claude, last 3 days): the note `Login ends in 2 days`.
- Signed out (the provider refused the refresh): "Sign in again", no bars.

**Clicks.** An account in the list, the rail, the strip or the detail view
opens its account view as a popup. The list's three dots and the account
view's "Accounts and settings" open the detail view as a popup. "Sign in again"
and "Connect account" open the connect dialog (for "Sign in again", straight
at that account's provider). The refresh control reads every account now (in
the account view, that account) and is Herdr's spinner until done; an account
read less than 30 seconds ago is not read again. The switch turns toasts on
and off for every copy. The detail view's arrows move an account up or down.
In the account view: Rename (Enter keeps, Esc leaves it), Sign in again,
Remove (Herdr's confirm dialog: "Remove work?" / "Its stored login is deleted
from this computer."); the view closes itself once its account is no longer
connected. In the connect dialog Esc closes it; Copy reads "Copied"; Open
opens the address in the browser.

**Hovers.** Accounts and controls take the `hover` ground. In the rail and the
strip the hover names the account and gives its numbers:
`work: Weekly 41% · 4d 6h, 5-hour 62% · 1h 48m`; `work: Not read yet`;
`work: Sign in again`; a failed read adds `· Read failed: 12m old · network`.

**What moves.** A new reading slides the fill's width and the pace mark over
400 ms, ease-out. The switch's knob slides over 160 ms. The spinner turns
natively. Countdowns redraw once a minute.

**Freshness.** Each copy checks once a minute and when it starts. An idle
account is read when its last read is 5 minutes old; an active one sooner,
Claude after 2 minutes and Codex after 1. An account is active while an agent
in Herdr is working (`agents()`, any agent), while its last read changed a
window's numbers (its share used, whether it has started or is at its limit,
or which windows there are), or while a window is from 75 % up to, but not
at, its limit. A failed read waits 5 minutes whatever else holds. After a
read that worked, a window whose reset time has passed is read at once. A
read due within 5 seconds of a check is made at that check, so a late timer
never skips a minute. All copies share one store, so one read serves them
all. An access token that expires within 5 minutes is refreshed first, and
once more after a 401.

**Toasts** (Herdr's toast mod draws them). `work is at 91% of its weekly limit`
(warning) at 90 %, `work reached its 5-hour limit` (error) at the limit, each
with `Resets in 2h 5m`. Once per account, window, reset period and threshold;
a jump past both posts the limit toast only. Clicking one does nothing.

## Built from

- `mods/headroom/`: `main.js` (the View), `mod.json` `{ "place": "none" }`,
  `logic/` (plain modules, no gpui-kit or herdr imports: form choice, fit,
  levels, pace, colours, rows, words, toasts, accounts, vault, store, readings,
  publish, host, PKCE, SHA-256, connect, and the data of the list, rail, strip,
  account view and detail view), `providers/` (`claude.js`, `codex.js`,
  `index.js`), `ui/` (`list`, `rail`, `strip`, `account`, `detail`, `connect`,
  `kit`), `icons/` (`chatgpt.svg`, `claude.svg`, `arrow-up.svg`,
  `arrow-down.svg`, `more.svg`, `refresh.svg`).
- One copy per block. `main.js` picks the form: `props.connect` → the connect
  dialog; `props.form` of `list`, `rail`, `strip` or `detail`, or `account`
  with `props.account` → that form; else the root's measured size
  (`on_size_change`): rail below 160 px wide, strip below 48 px tall, list
  otherwise and before the first measure.
- Props: `form` (`auto`, `list`, `rail`, `strip`, `detail`, `account`);
  `account` (the id of the account the account view shows); `fit` (the id of
  the block holding the copy: the list and the rail call
  `run("layout.resize", { id, px })` with their content's height, at least 48
  px so a folded rail unfolds to the list and at most 329 px, once per height,
  from `on_size_change`; without it they never resize their block); `connect`
  (`{ provider?, account? }`, the connect dialog); `overlay` (Herdr's).
- `herdr`: `props`, `theme`, `settings`, `window` (its `platform`), `appHome`,
  `readTextFile`, `writeTextFile(path, text, expected)`, `exec`, `shared`,
  `setShared`, `notify`, `layout`, `run`, `openOverlay`, `closeOverlay`,
  `nextCommand`, `agents` (whether one is working). The global `fetch`,
  `crypto.getRandomValues`, `btoa`, `Buffer`, `URLSearchParams`.
- gpui-kit `View`, `div`, `svg`; gpui-base `h_flex`, `v_flex`, `Switch`,
  `Input`, `InputState`. `cx.spawn`, `cx.sleep`, `cx.timer.every(60000)`,
  `cx.focus_handle`, `cx.write_to_clipboard`.
- Commands: `layout.resize`, `layout.show` and `layout.hide` (`{ id }`, the
  strip's block); overlays `{ mod: "headroom", kind: "popup",
width: 380, height, props: { form: "account", account } }`, `{ mod:
"headroom", kind: "popup", width: 380, height, props: { form: "detail" } }`,
  `{ mod: "headroom", kind: "dialog", width: 420, props: { connect } }` and
  `{ mod: "confirm", kind: "dialog", props: { title, detail, command: { name:
"headroom.remove" } } }`; it receives `remove` from `nextCommand()`.
- Shared state: `headroom.readings` (`{ version: 1, accounts: [reading] }`, the
  public interface in the README), `headroom.prefs` (`{ notify }`),
  `headroom.notified` (`{ version: 1, keys }`), `headroom.fit`
  (`{ <layout name>: { <block id>: px } }`, the height last fitted per layout
  and block).
- The vault `<Herdr home>/headroom/vault.json`, `{ version: 1, accounts }`.
- Programs: `open` (macOS) or `xdg-open`; `mkdir -p`, `chmod 700`, `chmod 600`,
  `stat -f %Lp` (macOS) or `stat -c %a`.
- Hosts: Claude signs in with PKCE (S256) at
  `https://claude.ai/oauth/authorize` (`code=true`, redirect
  `https://platform.claude.com/oauth/code/callback`, which shows the code to
  paste), exchanges and refreshes at `https://api.anthropic.com/v1/oauth/token`
  (JSON; refresh sends `anthropic-beta: oauth-2025-04-20`) and reads
  `https://api.anthropic.com/api/oauth/usage` (`five_hour`, `seven_day`,
  `seven_day_<model>`, and the `limits` list as a fallback). Codex asks
  `https://auth.openai.com/api/accounts/deviceauth/usercode` for a device code,
  opens `https://auth.openai.com/codex/device`, polls
  `https://auth.openai.com/api/accounts/deviceauth/token`, exchanges and
  refreshes at `https://auth.openai.com/oauth/token` (form body, redirect
  `https://auth.openai.com/deviceauth/callback`), takes the account from the
  token's `https://api.openai.com/auth` and `https://api.openai.com/profile`
  claims, and reads `https://chatgpt.com/backend-api/wham/usage` with
  `ChatGPT-Account-Id` (`rate_limit.primary_window`, `secondary_window`, named
  by `limit_window_seconds`, never by slot; `additional_rate_limits`).
- Shipped art: `mods/workspace-chrome/spinner.svg`,
  `mods/workspace-chrome/plus.svg`, `mods/workspace-chrome/chevron-left.svg`,
  `mods/workspace-chrome/chevron-right.svg`; the shipped `confirm` and `toast`
  mods.

## Watch out

- **Runtime (herdr-app 0.1.15).** No `TextEncoder`, `Headers`,
  `AbortController` or `setTimeout`: build PKCE bytes by hand, wait with
  `cx.sleep`. `fetch` exposes no response headers, so a provider's
  `Retry-After` cannot be honored: a failed read waits a flat 5 minutes. A mod
  cannot listen on a port, so Claude's sign-in is the paste-the-code flow. A
  mod may import only from its own folder.
- **Reading too often.** Claude's usage endpoint has answered 429 to tools
  reading it every 30 to 60 seconds, and stays refusing for minutes. Read it
  about every 2 minutes at most (5 seconds less with the check's slack), only
  while the account is active, and compare the share used, not the reset
  times, to tell whether numbers moved: Claude's reset times drift by
  milliseconds from read to read.
- **No `crypto.subtle`.** `crypto.subtle.digest` does not work in Herdr
  0.1.15's mod runtime: its promise never settles. SHA-256 for the PKCE
  challenge is the mod's own (`logic/sha256.js`), synchronous and in plain
  JavaScript.
- **One store for every copy.** Herdr runs a copy per block, a popup and a
  dialog are copies too, and module code is shared between them. Keep the
  accounts, the vault and the reads in one module-level store, one operation
  per account and one vault change at a time; a running operation older than
  2 minutes was abandoned by a closed copy. The refresh token rotates: save the
  new one before using the new access token. Herdr sends `headroom.remove` to
  the shown copies, not the one that asked, so the pending removal is
  module-level and taken once.
- **The vault's modes.** `writeTextFile` replaces the file atomically and may
  not keep its mode. Make the folder 0700 and the file 0600 before the first
  token is written, check with `stat` after every write and `chmod 600` again;
  when it cannot be made 0600, store nothing and say why, on every path that
  saves (a refresh too), not only on sign-in. Programs get paths and modes,
  never the file's content or a token. Keep the vault outside `mods/`.
- **Shared state is not private.** Every mod reads it and Herdr keeps it in
  `shared.json`: only labels, ids, plans, times and windows go there; never a
  token or an email. Nothing goes in `localStorage`.
- **What `herdr-app check` cannot see.** It renders the first state with empty
  shared state: the list with no accounts. The other forms and states need
  `herdr-app check --print-spec` with fake readings, and the live window.
  Sign-ins cannot be tried without a real account.
- **The endpoints.** Undocumented, with the providers' own first-party client
  ids (`9d1c250a-e61b-44d9-88ed-5944d1962f5e`, `app_EMoamEEZ73f0CkXaXp7hrann`),
  not approved for third-party use; they can change without notice. Claude's
  login ends 30 days after sign-in whatever happens. A Codex weekly-only plan
  reports its week in `primary_window`. Error text is built from a known kind,
  never from a response body.
- **Sizes.** Text cannot be measured: the strip estimates a glyph at 0.6 of the
  font size. The strip never resizes its block; the list and the rail resize
  theirs only with `fit`, and stop at 329 px.

## Done when

- `herdr-app check mods/headroom` passes with an empty Herdr home and draws "No
  accounts yet" with "Connect account".
- Connecting a Claude account (pasted code) and a Codex account (device code)
  adds one row each; connecting the same account again replaces its login and
  keeps its row.
- `<Herdr home>/headroom/` is mode 700 and `vault.json` mode 600, and no token
  appears in `shared.json`.
- A Codex plan with only a weekly window shows one bar; a Claude window with no
  reset time shows `not started` and no pace mark.
- The same block draws the rail below 160 px wide and the strip below 48 px
  tall; with `fit`, the list block grows with its accounts up to 329 px.
- A strip after another block in its row starts with the rule; alone, it has
  none.
- A read that fails keeps the last bars dimmed with `… old · network`; a
  rejected refresh shows "Sign in again" and no bars.
- Crossing 90 % posts one toast, a second reading above 90 % none, reaching the
  limit one more; with the switch off, none.
- Another mod's `shared("headroom.readings")` gives
  `{ version: 1, accounts: [...] }`.
- `node --test 'tests/*.test.mjs'` and `npx prettier --check .` pass.
