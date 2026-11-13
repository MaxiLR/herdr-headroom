# Glossary

**Account** — One sign-in to one provider, for one organization: its login,
its identity, a label and a place in the person's order. Its id is
`<provider>:<account id>:<organization id>`, so one email with several
organizations is several accounts. Connecting the same account again replaces
its login.

**Provider** — A service whose usage limits Headroom reads: `claude` (a Claude
Pro or Max subscription) or `codex` (a ChatGPT subscription). Each is one
adapter in `mods/headroom/providers/` with `login`, `refresh`, `read` and
`activeEveryMs`, how often its active accounts are read (without one, every
5 minutes).

**Active** — An account worth reading more often than every 5 minutes: an
agent in Herdr is working, its last read changed a window's numbers, or one
of its windows is from 75 % up to, but not at, its limit. An account that is
not active is **idle**; one whose last read failed is read as if idle.

**Window** — One usage limit of an account over a stretch of time, as the
provider reports it: its length, the share used and when it resets. The
**5-hour** window (`5h`) and the **weekly** window (`7d`) are the general ones;
a **per-model weekly** window (`7d:<model>`, Claude only) limits one model's
use over the week. Codex can report windows of other lengths and additional
named limits. Only the windows a plan has exist.

**Reading** — What the last read of an account says, as `headroom.readings`
holds it: the account's id, provider, label and plan, a status (`ok`, `stale`,
`error`, `signed-out`), when it was read, why a read failed, when a Claude
login ends, and its windows.

**Level** — How full a window is: normal below 75 %, high from 75 %, critical
from 90 %, and limit at 100 % or when the provider says the limit is reached.
The level sets a bar's colour and decides the toasts.

**Pace mark** — The tick on a bar at the share of the window's time that has
passed. Usage past it means the window runs out before it resets at the
current rate. A window that has not started has none.

**Reset** — The moment a window's usage starts again from zero. A window with
no reset time has not started.

**Label** — The name an account goes by in every form and toast. It starts as
the email's name part, with the organization or plan added when another
account already has that name; the person can rename it. It is the only
personal text in shared state.

**Vault** — The file that keeps the accounts and their logins,
`<Herdr home>/headroom/vault.json`, readable by its owner only (0600, in a 0700
folder) and outside `mods/`.

**Store** — The one module-level owner of the accounts, the vault and the
reads, shared by every copy of the mod: it signs in, refreshes tokens, reads
each account when its reading is due, runs one operation per account at a
time, and publishes the readings.

**Form** — The shape a copy of the mod takes, from its `form` prop or its
block's size. The **list** is a 1 px line on its top edge, a header and a row
per account with its weekly and 5-hour bars and numbers (the default); a block
given `fit` is as tall as the first two accounts, and with more a hint on the
bottom edge says how many are cut off below. The **rail** is each account's
mark and the percent of the fuller of its weekly and 5-hour window over its
bars, in a block narrower than 160 px, with the same line and a shorter hint.
The **strip** is one line with an item per account, in a block under 48 px
tall; the installer puts it, hidden, in the status bar, behind the switch Show
in status bar. The **account view** is a form too (`form: "account"` with an
`account`). The **detail** view is the one place to manage everything: every
window of every account, the arrows that reorder the accounts, Rename and
Remove behind each account's three dots, the notifications switch, Show in
status bar and Connect account. It is opened from the list's header control
and from the account view, as a popup, dialog or pane.

**Account view** — The view of one account alone, with everything known about
it and its own actions (Rename, Sign in again, Remove), opened by a click on
an account, as a popup. Remove asks first, in the mod's own dialog over the
view. It closes itself when it opens another view (the detail view, or the
connect dialog to sign in again) and when its account is no longer connected.

**Connect dialog** — The dialog that signs an account in: choose Claude or
Codex, then approve on the provider's page in the browser, pasting Claude's
code or entering Codex's device code. It also signs an account in again.
