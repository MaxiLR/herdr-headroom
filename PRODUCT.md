# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The engineer who owns this repository, with two Claude subscriptions and one ChatGPT (Codex) subscription, working in Herdr. Second: anyone who installs the public mod and holds several accounts of a provider.

## Product Purpose

Headroom shows, for every connected account, how close each of its limit windows is to its limit, so the person picks an account with room before starting work and knows before one runs out. It succeeds when one glance at the Herdr sidebar replaces opening each provider's usage screen, one account at a time.

## Positioning

One standalone Herdr mod that holds several accounts of the same provider, signs in to each and reads its usage itself, and fits whatever block a layout gives it. It needs neither OMP nor the Claude Code or Codex CLI.

## Operating Context

- A Herdr mod named `headroom`. In the engineer's window it is the third list of the left sidebar of the `main` layout (268 px wide), after Spaces and Agents, with a line on its top edge as Agents has: a fixed "Limits" header with the accounts under it. It fits up to two accounts above the sidebar's footer; for more it is dragged taller, and the accounts scroll under the header. A hint on its bottom edge ("3 more") says how many accounts are cut off below. A drag holds, across restarts too. It does not collapse.
- With the sidebar folded it is a rail: 76 px wide on macOS, 44 px elsewhere. It fits two accounts too, with "+3" for the rest.
- In the installed layout the strip is in Herdr's status bar, two fifths of its width, behind a switch: hidden until "Show in status bar" in Accounts and settings turns it on. In someone else's layout it can be a one-line strip in any status bar (28 px tall in Herdr's `main`).
- A click on an account opens its account view, a popup of that account alone: its windows, when its login ends and its own actions (Rename, Sign in again, Remove).
- Accounts and settings, the detail view, is the one place to manage accounts. It opens as a popup, dialog or pane, from the list's header and from the account view, and holds every window of every account, the arrows that reorder the accounts, Rename and Remove behind each account's three dots, the notifications switch, Show in status bar and Connect account.
- A view that opens another closes itself first. Remove asks with the mod's own dialog, over the view that asked.
- It is glanced at between other work. It sits among Herdr's shipped mods (Spaces, Agents, the footer, the status bar) and follows Herdr's light and dark themes.
- Herdr's toast mod draws its notifications.

## Capabilities and Constraints

- Drawn with Herdr's gpui-kit and gpui-base (herdr-app 0.1.15). No HTML, CSS or web view exists in a mod. `Platform` above is `web` only because the record's schema has no value for a desktop pane.
- Colours come from `theme()`, except Claude's orange (`#D97757`) on Claude's spark. Animation is native (`.transition`, `.loop`), never a redraw timer.
- The number is percent used, 0 to 100, with a bar that fills left to right.
- Levels: normal below 75 %, high from 75 %, critical from 90 %, at its limit at 100 % or when the provider says so. Levels are never told apart by colour alone.
- Only the windows a plan has are shown. A row in the list, the rail and the strip has two bars at most, the weekly and the 5-hour window; per-model windows are in the account view and the detail view, and one at its limit is said in words on the row (a dot on the mark in the rail and the strip).
- Herdr shows a layout only when its name is letters, digits, `-` and `_`. The installer's default name is `herdr-headroom`, and it refuses a name Herdr would not show.
- Terms: account, window (5-hour, weekly, per-model weekly), reading, pace mark, level, reset, vault. Forms: list, rail, strip, account view, detail.
- This computer's accounts; macOS and Linux. Providers: Claude and Codex.

## Brand Commitments

- The mod must feel Claude-like, as the engineer's run-graph mod does: restraint, few symbols, states written as words, drawn shapes instead of terminal glyphs. Colours are the Herdr theme's, but for Claude's orange on its spark.
- It has no brand of its own: "Headroom" appears only as the mod's name, and the logos it shows are the providers'.
- Each account carries its provider's own logo: the ChatGPT logo in the theme's text colour for Codex, Claude's spark in Claude's orange for Claude.

## Evidence on Hand

- One real Claude usage payload, quoted in the spec: `five_hour: { utilization: 0, resets_at: null }`, `seven_day: { utilization: 0, resets_at: "2026-11-19T06:00:00+00:00" }`, `seven_day_opus: null`, `seven_day_sonnet: null`.
- The payload shapes of both providers, taken from oh-my-pi (MIT).
- No screenshots of the mod exist before the first build. Readings in design drafts are authored examples and say so.
- The mod has been used live in Herdr twice. In the second live use the engineer installed it, switched to its layout and connected a Codex and a Claude account, Claude's with the mod's own SHA-256 for its PKCE challenge.
- What the second live use showed is fixed: the layout name Herdr would not show, the popups that showed no windows or accounts, views piling up, Limits taking a third of the sidebar with nothing to show it drags, a third bar on a Claude row, Rename and the strip that could not be found, and the plan read as `Self_serve_business_prolite`.
- Not tried live: the fixes, which are tested against fake hosts and `herdr-app check`: the fit and the hint in the sidebar, the status row with the strip and its switch (`layout.show` and `layout.hide` from a mod), the popups' heights, the three-dot menu inside a popup, Rename and Remove from it, Remove's dialog and a view closing when it opens another.

## Product Principles

1. Every account at once: the person compares accounts without opening anything.
2. Only what the plan has. A window the provider does not report is never drawn or made up.
3. No number that could be mistaken for current: a failed read shows its age and reason, an ended login shows no bars.
4. Trouble is told before it happens: the pace mark, the toast at 90 %, the warning before a login ends.
5. A login is a secret. No token appears in anything the mod shows, shares or logs.
