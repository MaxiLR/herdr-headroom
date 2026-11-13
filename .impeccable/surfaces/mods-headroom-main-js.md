---
version: 1
slug: "mods-headroom-main-js"
primary_target: "mods/headroom/main.js"
related_targets: []
---

# Headroom mod

## Scope and mode

The `headroom` Herdr mod (`mods/headroom/`): one View that takes five forms (list, rail, strip, account view, detail) plus the connect dialog and Remove's dialog. Operate: the person glances at it to see how close each account is to its limits. Built code-led, with gpui-kit and gpui-base; there is no HTML or CSS in a mod.

## Audience, job, task

The engineer, with the list as the third list of the left sidebar of Herdr's `main` layout (268 px), after Spaces and Agents. One glance answers, for every account: how much of the week is used, how much of the current 5 hours, whether either is burning faster than its window, and when each resets. Second task: open an account's view to see everything about it and rename it, sign it in again or remove it; open the detail view, Accounts and settings, the one place to manage accounts, to see every window of every account, reorder accounts, rename or remove one behind its three dots, connect one, set notifications and show the strip in the status bar.

Constraints: colours from the Herdr theme, but for Claude's orange on Claude's spark; native animation only; percent used; levels at 75, 90 and 100 %, never told apart by colour alone; only the windows a plan has.

## Chosen direction

Weekly leads, locked by the engineer on the second hand. The first hand (Tightest first, Stacked meters, By window) was re-rolled with a steer: progress bars; weekly is the most important thing to have present for each subscription; the percentage and the reset time quiet, under or near the bar, never taking the bar's room. After the lock the engineer dropped the grouping setting the steer had asked for: with a full and a thin bar per account, grouping by window adds nothing. On the drafts the engineer also decided: the block in the sidebar does not collapse; the strip starts with a separator when another block comes before it in the same bar, and has none when it is alone. From the first live use the engineer decided: the list is the third list of the sidebar, resizable like Spaces and Agents, its accounts scrolling under a fixed header; each account carries its provider's own logo, Claude's spark in Claude's orange; the pace mark is centred on its bar; a click on an account opens that account's own view, which holds its actions (Rename, Sign in again, Remove); the detail view reorders accounts with an up and a down arrow. From the second live use and its drafts the engineer decided: a line on the top edge of the list, the rail and the strip; the block fits up to two accounts and is dragged for more, a drag holding until the needed height changes; a hint on the bottom edge ("3 more", "+3" in the rail) whenever accounts are cut off; two bars at most on a row, a reached per-model limit said in words in place of the week's reset time, or as a dot on the mark in the rail and the strip; the strip in the installed status bar, two fifths of it, behind a second switch, Show in status bar; Rename and Remove behind three dots in the detail view; Remove asks with the mod's own dialog and a red Remove button; a view that opens another closes itself.

Memorable moment: the pair of bars. Thickness says which window it is, so no label is needed to tell a week from five hours.

## Direction contract

THESIS: Each account is one pair of bars: a full weekly bar and a thin 5-hour bar 6 px under it, with one quiet line of numbers beneath. Thickness names the window. Refused: the usage table of labelled meter lines where each percentage and countdown take a column from the bar.

OWN-WORLD: Herdr theme colours on `chrome`, but for one: Claude's orange (`#D97757`), the colour of Claude's spark and the only one not from `theme()`. Geist, 13 px names and 11 px numbers. Bars fully rounded, 6 px and 3 px, 6 px apart (5 px and 3 px, 4 px apart, in the rail and the strip), on a track of `foreground` at 10 %. A 2 px `foreground` tick with a ground-coloured halo, centred on its bar and reaching 2 px above and below it (1 px in the rail and the strip), is the pace mark. Fill is `muted`, then `working` from 75 %, then `blocked` from 90 %. Provider marks are the providers' own logos, from the mod's own `mods/headroom/icons/`: `chatgpt.svg` in `foreground` and `claude.svg` in Claude's orange. No terminal glyphs, no pills, no borders around accounts. A reached per-model limit is words in the critical text colour, or a 5 px `blocked` dot ringed in the ground colour on the mark's corner in the rail and the strip; never a third bar.

STORY: The person reads the week first, the 5 hours second, sees from the tick whether an account is burning too fast, and picks the account with room. Colour appears only where there is trouble.

FIRST VIEWPORT: At 268 px, under a 1 px `border` line and a "Limits" header with one quiet control that opens the detail view: per account, a 26 px line with the provider's mark and the account's name; the weekly bar at full width; 6 px under it the thin 5-hour bar; then one 11 px line, weekly percentage and reset on the left, "5-hour", its percentage and reset on the right. A weekly-only plan has one bar and one set of numbers. The block is as tall as its first two accounts; when more are cut off, "3 more" and a chevron sit centred on a fading band at its bottom edge. The primary action is a click on an account; it opens that account's account view, a 380 px popup of the account alone with its actions and a last row to the detail view.

FORM: Weekly leads, third of seven on the second-hand list, dealt by the roll and locked by the engineer. seed:2727519b768bcb09

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Layout is first seen when the engineer installs the mod; `herdr-app check` does not lay a mod out.
- Whether gpui-kit sets tabular figures is untried; the numbers are right-aligned in fixed widths either way.
- None from the design step: the engineer confirmed that the rail and the strip show the percentage of the fuller of the weekly and the 5-hour window.
