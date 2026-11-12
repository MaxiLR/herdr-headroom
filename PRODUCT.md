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

- A Herdr mod named `headroom`. In the engineer's window it is a block in the left sidebar of the `main` layout (268 px wide), between the Spaces/Agents lists and the Settings/Add machine footer, as tall as its accounts need. It does not collapse; with more than four accounts it scrolls on its own.
- With the sidebar folded it is a rail: 76 px wide on macOS, 44 px elsewhere.
- In someone else's layout it can be a one-line strip in a status bar (28 px tall in Herdr's `main`).
- The detail view opens as a popup, dialog or pane. It holds everything about each account and the account management.
- It is glanced at between other work. It sits among Herdr's shipped mods (Spaces, Agents, the footer, the status bar) and follows Herdr's light and dark themes.
- Herdr's toast mod draws its notifications.

## Capabilities and Constraints

- Drawn with Herdr's gpui-kit and gpui-base (herdr-app 0.1.15). No HTML, CSS or web view exists in a mod. `Platform` above is `web` only because the record's schema has no value for a desktop pane.
- Colours come from `theme()` only. Animation is native (`.transition`, `.loop`), never a redraw timer.
- The number is percent used, 0 to 100, with a bar that fills left to right.
- Levels: normal below 75 %, high from 75 %, critical from 90 %, at its limit at 100 % or when the provider says so. Levels are never told apart by colour alone.
- Only the windows a plan has are shown.
- Terms: account, window (5-hour, weekly, per-model weekly), reading, pace mark, level, reset, vault. Forms: list, rail, strip, detail.
- This computer's accounts; macOS and Linux. Providers: Claude and Codex.

## Brand Commitments

- The mod must feel Claude-like, as the engineer's run-graph mod does: restraint, few symbols, states written as words, drawn shapes instead of terminal glyphs. Colours are still the Herdr theme's.
- It carries no brand of its own: no logo and no colours of its own. "Headroom" appears only as the mod's name.
- Each account row carries its provider's mark, in the look of Herdr's own `icons/claude.svg` and `icons/codex.svg`.

## Evidence on Hand

- One real Claude usage payload, quoted in the spec: `five_hour: { utilization: 0, resets_at: null }`, `seven_day: { utilization: 0, resets_at: "2026-11-19T06:00:00+00:00" }`, `seven_day_opus: null`, `seven_day_sonnet: null`.
- The payload shapes of both providers, taken from oh-my-pi (MIT).
- No screenshots of the mod exist before the first build. Readings in design drafts are authored examples and say so.
- No live sign-in has been done; both sign-in flows are built against fake responses.

## Product Principles

1. Every account at once: the person compares accounts without opening anything.
2. Only what the plan has. A window the provider does not report is never drawn or made up.
3. No number that could be mistaken for current: a failed read shows its age and reason, an ended login shows no bars.
4. Trouble is told before it happens: the pace mark, the toast at 90 %, the warning before a login ends.
5. A login is a secret. No token appears in anything the mod shows, shares or logs.
