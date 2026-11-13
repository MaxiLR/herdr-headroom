---
version: 1
slug: "mods-headroom-main-js"
primary_target: "mods/headroom/main.js"
related_targets: []
---

# Headroom mod

## Scope and mode

The `headroom` Herdr mod (`mods/headroom/`): one View that takes four forms (list, rail, strip, detail) plus the connect dialog. Operate: the person glances at it to see how close each account is to its limits. Built code-led, with gpui-kit and gpui-base; there is no HTML or CSS in a mod.

## Audience, job, task

The engineer, with the list in the left sidebar of Herdr's `main` layout (268 px), between the Spaces/Agents lists and the footer. One glance answers, for every account: how much of the week is used, how much of the current 5 hours, whether either is burning faster than its window, and when each resets. Second task: open the detail view to see every window and manage accounts (connect, rename, reorder, remove, sign in again, notifications).

Constraints: colours from the Herdr theme; native animation only; percent used; levels at 75, 90 and 100 %, never told apart by colour alone; only the windows a plan has.

## Chosen direction

Weekly leads, locked by the engineer on the second hand. The first hand (Tightest first, Stacked meters, By window) was re-rolled with a steer: progress bars; weekly is the most important thing to have present for each subscription; the percentage and the reset time quiet, under or near the bar, never taking the bar's room. After the lock the engineer dropped the grouping setting the steer had asked for: with a full and a thin bar per account, grouping by window adds nothing. On the drafts the engineer also decided: the block in the sidebar does not collapse; with more than four accounts it scrolls on its own; the strip starts with a separator when another block comes before it in the same bar, and has none when it is alone.

Memorable moment: the pair of bars. Thickness says which window it is, so no label is needed to tell a week from five hours.

## Direction contract

THESIS: Each account is one pair of bars: a full weekly bar and a thin 5-hour bar directly under it, with one quiet line of numbers beneath. Thickness names the window. Refused: the usage table of labelled meter lines where each percentage and countdown take a column from the bar.

OWN-WORLD: Herdr theme colours only, on `chrome`. Geist, 13 px names and 11 px numbers. Bars fully rounded, 6 px and 3 px, on a track of `foreground` at 10 %. A 2 px `foreground` tick with a ground-coloured halo is the pace mark. Fill is `muted`, then `working` from 75 %, then `blocked` from 90 %. Provider marks are Herdr's own. No terminal glyphs, no pills, no borders around accounts.

STORY: The person reads the week first, the 5 hours second, sees from the tick whether an account is burning too fast, and picks the account with room. Colour appears only where there is trouble.

FIRST VIEWPORT: At 268 px, under a "Limits" header with one quiet control that opens the detail view: per account, a 26 px line with the provider's mark and the account's name; the weekly bar at full width; 4 px under it the thin 5-hour bar; then one 11 px line, weekly percentage and reset on the left, "5-hour", its percentage and reset on the right. A weekly-only plan has one bar and one set of numbers. The primary action is a click on an account; it opens the detail view.

FORM: Weekly leads, third of seven on the second-hand list, dealt by the roll and locked by the engineer. seed:2727519b768bcb09

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Layout is first seen when the engineer installs the mod; `herdr-app check` does not lay a mod out.
- Whether gpui-kit sets tabular figures is untried; the numbers are right-aligned in fixed widths either way.
- None from the design step: the engineer confirmed that the rail and the strip show the percentage of the tightest window.
