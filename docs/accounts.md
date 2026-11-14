# Accounts, reads and notifications

[Back to the README](../README.md)

## What it shows

- **Percent used**, 0 to 100, rounded down, beside a bar of the same share.
- **Levels.** A window is normal below 75 %, high from 75 %, critical from
  90 %, and at its limit at 100 % or when the provider says the limit is
  reached. Normal bars take the theme's `muted` colour, high ones `working`,
  critical and limit ones `blocked`. In the list and the detail view a window
  at its limit reads "At limit" instead of a percent.
- **Pace mark.** A tick centred on each bar at the share of the window's time
  that has already passed. A fill past the tick means the account runs out
  before the reset at its current rate. A window the provider reports no reset
  time for (one that has not started) has no tick and reads "not started".
- **Time to reset**, as `<1m`, `42m`, `3h 12m` or `2d 4h`.
- **Only the windows the plan has.** A Codex plan with a weekly window alone
  shows one bar. An account's row draws the weekly and the 5-hour window only
  and names a per-model window at its limit; every per-model weekly window and
  Codex's additional limits are in the account view and the detail view.
- **Account states.** A read that failed keeps the last reading, dimmed, with
  its age and the reason (`12m old · network`). An account whose login has
  ended shows "Sign in again" and no bars. A Claude account warns in its last 3
  days before its login ends.
- **Provider marks.** Each account carries its provider's own logo: the ChatGPT
  logo in the theme's text colour for Codex, Claude's spark in Claude's orange
  (`#D97757`) for Claude.

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
account view and the detail view show the date, and the row warns during the
last 3 days. A Codex login does not end on its own. When a provider rejects a
login, the account shows "Sign in again"; its stored login is kept until it
signs in again or is removed.

An account's view holds its own actions, and the detail view holds Rename and
Remove for every account. "Sign in again" opens the connect dialog at the
account's provider, and signing in replaces the account's login. Rename turns
the label into a field: Enter keeps the new label, Esc leaves it as it was.
Remove asks first, in the mod's own dialog ("Remove work?" / "Its stored login
is deleted from this computer.", Cancel and a red Remove; Enter removes, Esc
cancels), then deletes the account's login from the vault.

Readings are fetched for every account every 5 minutes while it is idle, and
more often while it is active: a Claude account every 2 minutes, a Codex
account every minute. An account is active while an agent in Herdr is working
(any agent: Herdr does not say which account it spends), while its last read
changed a window's numbers, or while one of its windows is from 75 % up to,
but not at, its limit. After a failed read the next one is 5 minutes later
whatever else holds. After a read that worked, an account is also read when
one of its windows' reset time passes. And it is read when asked: the refresh
control in the detail view reads every account again, and the one in an
account view reads that account, except one read in the last 30 seconds. An
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
