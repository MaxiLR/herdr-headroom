---
name: Headroom
description: How close each Claude or Codex account is to its limits, drawn as a pair of bars in Herdr's own look.
colors:
  chrome: "#101114"
  popover: "#25272b"
  background: "#17191d"
  raised: "#2c2e31"
  foreground: "#eeeeef"
  muted: "#98999b"
  dim: "#696a6d"
  track: "#eeeeef1a"
  working: "#e5c07b"
  working-text: "#e7ca95"
  blocked: "#f0705f"
  blocked-text: "#f08c7f"
  accent: "#96b2d7"
  accent-foreground: "#17191d"
  solid: "#eeeeef"
  solid-foreground: "#111215"
  border: "#ffffff18"
  input: "#ffffff24"
  hover: "#ffffff0e"
  selected: "#ffffff17"
  claude: "#D97757"
typography:
  dialog-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  detail-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  window-line:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  block-header:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 500
  numbers:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  strip:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "11.8px"
    fontWeight: 400
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 500
  address:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 400
rounded:
  badge: "4px"
  strip-item: "5px"
  control: "6px"
  row: "8px"
  field: "9px"
  bar: "9999px"
spacing:
  hair: "3px"
  pair: "6px"
  numbers: "6px"
  inset: "8px"
  account: "9px"
  section: "16px"
  dialog: "18px"
components:
  bar-weekly:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.bar}"
    height: "6px"
    width: "100%"
  bar-five-hour:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.bar}"
    height: "3px"
    width: "100%"
  account-row:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.row}"
    padding: "0 8px 9px"
  account-row-hover:
    backgroundColor: "{colors.hover}"
  block-header:
    textColor: "{colors.dim}"
    typography: "{typography.block-header}"
    height: "41px"
    padding: "14px 12px 5px 16px"
  button-primary:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.solid-foreground}"
    rounded: "{rounded.row}"
    height: "32px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.row}"
    height: "32px"
    padding: "0 14px"
  button-mini:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "26px"
    padding: "0 8px"
  button-action:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.row}"
    height: "30px"
    padding: "0 12px"
  button-action-solid:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.solid-foreground}"
    rounded: "{rounded.row}"
    height: "30px"
    padding: "0 12px"
  button-remove:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.blocked-text}"
    rounded: "{rounded.row}"
    height: "30px"
    padding: "0 12px"
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 10px"
  rename-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "24px"
    padding: "0 6px"
  detail-row:
    textColor: "{colors.muted}"
    height: "38px"
    padding: "0 12px 0 16px"
  detail-row-hover:
    backgroundColor: "{colors.hover}"
  arrow-control:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    width: "22px"
    height: "22px"
  arrow-control-hover:
    backgroundColor: "{colors.hover}"
  switch-on:
    backgroundColor: "{colors.accent}"
    rounded: "9px"
    width: "30px"
    height: "18px"
  switch-off:
    backgroundColor: "{colors.input}"
    rounded: "9px"
    width: "30px"
    height: "18px"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    padding: "18px"
  account-view:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    width: "380px"
---

# Design System: Headroom

## Overview

**Creative North Star: "The Quiet Gauge"**

Headroom is a gauge that lives inside someone else's dashboard. It has no world of its own: every colour but one is a named colour of the running Herdr theme, read from `theme()` at render, and the type is Herdr's UI font (Geist) with its terminal font (JetBrains Mono) for codes and addresses. The one fixed colour is Claude's orange, on Claude's spark. What it owns is a structure, the pair of bars, and a temperament: Claude-like restraint, few symbols, states written as words, shapes drawn rather than typed as terminal glyphs.

The surface is glanced at between other work, in the left sidebar beside Herdr's Spaces and Agents mods. It is dense and calm. Nothing carries colour until something is wrong: at rest every fill and number is `muted`, and the theme's `working` and `blocked` appear only when a window passes 75 % and 90 %. The bar always keeps its full width; the numbers sit in one quiet 11 px line beneath it and never take the bar's room.

The values in the frontmatter are the graphite theme (Herdr's default dark). They are a reference, not constants: the code names the role (`t.chrome`, `t.muted`) and paper, ink, moss and atom-one-dark supply their own values for the same names.

**Key Characteristics:**

- Thickness names the window: a full 6 px bar for a weekly window, a 3 px bar for the 5-hour one, 6 px apart.
- Colour only for trouble; a level is always paired with its number or the words "At limit".
- A 2 px pace tick centred on its bar, reaching 2 px above and below it, with a ground-coloured halo, says whether an account is burning faster than its window.
- The providers' own logos: the ChatGPT logo in `foreground`, Claude's spark in Claude's orange (`#D97757`), the one colour not taken from the theme. Herdr's own spinner, scrollbar, confirm dialog and toasts; no brand, logo or palette of the mod's own.
- Native motion only: fills and ticks slide with `.transition`, waits spin with `.spin(900)`.

## Colors

Herdr's theme, used by role name; the mod adds only two computed values (the track and the level numbers), both derived from theme colours at render, and one fixed colour, Claude's orange.

### Primary

- **Working Amber** (`working`): the fill of a bar from 75 % used (high level), and the tint of the compact "!" badge and the Codex wait spinner.
- **Blocked Coral** (`blocked`): the fill of a bar from 90 % used (critical level) and at its limit.
- **Working Amber, Readable** (`working-text`): the number beside a high bar and the "Login ends in 2 days" warning. Computed as `working` mixed 22 % toward `foreground` (`mix()` in `logic/color.js`), because plain `working` falls to 4.3:1 on paper's `chrome`.
- **Blocked Coral, Readable** (`blocked-text`): the number beside a critical bar, "At limit", and sign-in errors in the connect dialog. `blocked` mixed 22 % toward `foreground`.

### Secondary

- **Herdr Accent** (`accent`): the one interactive colour. "Sign in again" links, the notifications switch when on, and the focused field's border. `accent-foreground` draws the switch knob over it.

### Provider

- **Claude Orange** (`claude`, `#D97757`): Claude's spark, the mark of every Claude account, in every theme. The one colour that does not come from `theme()`, so the spark reads as Claude's whatever the theme. The ChatGPT logo takes `foreground`.

### Neutral

- **Chrome** (`chrome`): the ground of the list, the rail and the strip, the sidebar's own colour. The pace tick's halo is this colour there.
- **Popover** (`popover`): the ground of the detail view, the account view and the connect dialog. The pace tick's halo is this colour in those views.
- **Background** (`background`): the inside of fields and of the Codex code box in the dialog.
- **Raised** (`raised`): secondary buttons and the small Copy/Open buttons.
- **Foreground** (`foreground`): labels and titles; the pace tick itself; the ChatGPT logo.
- **Muted** (`muted`): every number, reset, status word, hint, normal-level fill, and icon. 4.8:1 or better on every ground in graphite and paper.
- **Dim** (`dim`): only where Herdr's own mods use it: the "Limits" header, the "·" separators, "Esc", field labels, the strip separator and the "5h" tag in the rail.
- **Track** (`track`): the empty part of every bar, `foreground` at 10 % alpha, in light and dark alike (`raised` vanishes on paper's `chrome`).
- **Border, Input, Hover, Selected** (`border`, `input`, `hover`, `selected`): section rules in the detail view, control outlines, hover grounds and the pressed secondary button.
- **Solid** (`solid` / `solid-foreground`): the one primary button in a dialog (Connect), and Sign in again in the account view of an account that must sign in again.

### Named Rules

**The Colour Is Trouble Rule.** At rest, everything is `muted` or `foreground`. `working` and `blocked` appear only when a window is high, critical or at its limit, and `accent` only on what can be clicked to fix something.

**The Never By Colour Alone Rule.** A level is always beside its number; at 100 % the number becomes the words "At limit". Nothing is told by hue only.

**The Theme Owns The Values Rule.** Never write a hex value in the mod, with one exception: Claude's orange (`#D97757`) on Claude's spark. Name the theme role; derive anything else (track, level numbers, badge tint) from theme roles with `mix()` and `alpha()`.

## Typography

**Body Font:** Geist (Herdr's `ui_font_family`, with the system sans-serif)
**Label/Mono Font:** JetBrains Mono (Herdr's terminal `font_family`, read from `settings()` at render)

**Character:** One family at small sizes, set apart by weight and colour rather than by size jumps. Mono appears only where a person copies something: the Codex device code and sign-in addresses.

### Hierarchy

- **Dialog title** (600, 15 px): the connect dialog's title, as Herdr's prompt and confirm dialogs.
- **Detail title** (600, 14 px): "Limits" at the top of the detail view, and the account's label at the top of its account view.
- **Label** (400, 13 px; 500 in the detail view): an account's label; dialog body text.
- **Window line** (400, 12 px): each window's name, percentage, reset and clock time in the detail view, and each window's name in the account view; hints run at 12 to 12.8 px.
- **Block header** (500, 11.5 px, `dim`): "Limits" over the list, matching Herdr's "Spaces" and "Agents".
- **Numbers** (400, 11 px, `muted` or a level colour): the quiet line under the bars, the rail's percentage and status words on the label line.
- **Strip** (400, 11.8 px, `muted`): the status-bar line, matching Herdr's status bar.
- **Code** (JetBrains Mono 500, 22 px): the Codex device code. **Address** (JetBrains Mono 400, 11.5 px, `muted`): the sign-in address.

### Named Rules

**The Words Not Glyphs Rule.** States are written: "At limit", "Sign in again", "not started", "12m old · network". No warning triangles, no terminal block characters. The only typed symbol is the "·" separator in `dim`, and the compact "!" badge copied from Herdr.

**The Quiet Number Rule.** Percentages and countdowns are 11 px and `muted` under the bar; they never get a column of their own beside it. Format: "41% · 4d 6h"; alone on a row, "23% · resets in 5d 2h".

## Layout

The mod picks a form from its block's measured size (`logic/form.js`): **rail** narrower than 160 px; otherwise **strip** under 48 px tall; otherwise **list**. The account view, the detail view and the connect dialog are opened as overlays, not picked.

- **List.** A 41 px header, then accounts 8 px in from the block's edges, as Herdr's rows are. Per account: a 26 px label line (14 px mark, 8 px gap, 13 px label, the note right-aligned), the pair of bars 6 px apart, 6 px, a 14 px line of numbers (weekly on the left, "5-hour" on the right), then 9 px. Below about 220 px the 5-hour numbers drop their word. The list fills the block it is given: the header stays and the accounts scroll under it with Herdr's scrollbar. Only with `props.fit` does the block ask its layout for exactly the height its accounts need (via `fitTo`), up to 329 px (four accounts). It never collapses. A click on an account opens its account view.
- **Rail.** 8 px by 6 px per account: a 16 px line with the mark and the tightest window's percentage (plus "5h" in `dim` when that is the 5-hour window), then a 5 px and 3 px pair, 4 px apart. Under 60 px the number drops and the mark centres over the bars.
- **Strip.** One 28 px line, 14 px padding each side, items 16 px apart and their parts 6 px apart: a 12 px mark, the label, a 44 px wide pair (5 px and 3 px, 4 px apart), the percentage. Labels drop first, then bars; marks and percentages always stay. A 1 px by 14 px `dim` rule leads the strip only when another block precedes it in its row.
- **Account view.** A 380 px popup of one account, as tall as its content up to 640 px, on `popover`. A 26 px header 12 px down and 16 px in (16 px mark, the label at 14 px semibold and the plan, the reading's age and a 26 px refresh control), the email and organization under it, 40 px in. Then each window 13 px apart: its name at 12 px, the bar 6 px below, a 14 px line of numbers 6 px below that (percentage and reset on the left, clock time on the right). Then the pace line 14 px below and the login line 12 px below, 16 px in. Then, each after a 1 px `border` rule, the row of 30 px actions (16 px by 12 px, 8 px apart, Remove pushed right) and the 38 px "Accounts and settings" row.
- **Detail view.** A 380 px popup (also a dialog or pane). Sections are 16 px in, separated by 1 px `border` rules; windows stack name-line over bar, 11 px apart. From 520 px each window is one line (name 120 px, bar flexible, percentage 56 px, reset 104 px, clock 66 px); under 340 px the clock time drops. With two accounts or more, each label line ends in an up and a down arrow. A click on an account opens its account view.
- **Connect dialog.** Herdr's dialog layout: 18 px padding, 36 px fields, 32 px buttons, 20 px above the button row.

Accounts stay in the person's own order; nothing is sorted by usage.

## Elevation & Depth

Flat. The list, rail and strip sit on `chrome` with no shadow, border or card around an account; hover lays Herdr's translucent `hover` ground over the row. Depth comes from Herdr's overlay frame: the account view, the detail view and the connect dialog lift onto `popover`, and their frame and shadow are Herdr's, not the mod's. The mod draws no shadow of its own.

### Named Rules

**The No Card Rule.** No borders, pills or containers around an account. The pair of bars and the 9 px gap are the grouping.

## Shapes

Bars are fully rounded capsules (`rounded_full`), and so is every fill; a non-empty fill is drawn at least 3 px wide so 1 % still shows. The pace tick is a 2 px capsule inside a 1.5 px ground-coloured halo box, centred on its bar and reaching 2 px above and below it (1 px in the rail and the strip); the pair's bars are 6 px apart (4 px in the rail and the strip), so the two ticks never touch. Interactive grounds use small, consistent radii: 4 px badge, 5 px strip item, 6 px icon controls and the rename field, 8 px rows and buttons, 9 px fields and choices.

## Components

### The Pair of Bars (signature)

The memorable thing: a full bar over a thin one, thickness naming the window so no label is needed.

- **Shape:** weekly 6 px, 5-hour 3 px, 6 px apart, full width (rail and strip: 5 px and 3 px, 4 px apart; strip pair 44 px wide).
- **Colour:** track `track`; fill `muted` below 75 %, `working` from 75 %, `blocked` from 90 % and at the limit.
- **Pace mark:** 2 px `foreground` tick at the share of the window's time elapsed, centred on its bar and reaching 2 px above and below it (1 px in the rail and the strip), haloed in the ground colour (`chrome` in the sidebar, `popover` in the account view and the detail view). No tick for a window that has not started.
- **States:** a window the plan lacks is not drawn (a weekly-only plan shows one bar). First read: empty tracks, no numbers. Read failed: bars at 40 % opacity, no ticks. Signed out: no bars.
- **Motion:** fill width and tick position transition over 400 ms ease-out.
- **Per-model window:** shown on the row only when more used than the general weekly window, as its own full bar under the pair, 7 px down.

### Account Row

- **List:** 8 px side padding, 8 px radius, `hover` ground on hover, whole row is a button labelled with its spoken summary; a click opens the account's account view.
- **Label line notes:** "12m old · network" in `muted` for a failed read; "Login ends in 2 days" in `working-text`; "Sign in again" in `accent` (underlined on hover) with the label falling to `muted` and "Login ended Nov 9" under it.
- **Rail and strip:** a signed-out mark at 45 % opacity with Herdr's 14 px "!" badge (`working` at 15 % alpha, `working-text` glyph). A tooltip names the account and both windows. A click opens the account's account view.
- **Detail view:** the whole section is a button with the `hover` ground; a click opens the account's account view. Its label line ends in two 22 px arrows (Move up, Move down) with 14 px icons in `muted`, 6 px radius, `hover` ground on hover; an arrow the account cannot move along is at 35 % opacity and does nothing.

### Buttons

- **Shape:** 8 px radius, 32 px tall, 14 px horizontal, 12.5 px medium.
- **Primary:** `solid` ground, `solid-foreground` text and border; one per dialog (Connect). Disabled at 45 % opacity while the code field is empty; shows Herdr's spinner while checking.
- **Secondary:** `raised` ground, `input` border, `foreground` text (Cancel). Hover drops opacity to 0.88.
- **Connect account:** 30 px (28 px in the empty list), `raised` ground (none in the list), `input` border, a 12 to 14 px plus icon in `muted`; `selected` or `hover` on hover.
- **Account actions:** 30 px, 8 px radius, 12 px horizontal, 12.5 px medium, `raised` ground, `input` border, `selected` on hover: Rename, Sign in again and, at the right, Remove in `blocked-text`. Sign in again is solid (`solid` ground and border, `solid-foreground` text, 0.88 opacity on hover) when the account must sign in again.
- **Mini:** 26 px, 6 px radius, `raised`, 12 px: Copy (turns to "Copied") and Open.
- **Icon controls:** 22 to 26 px square, 6 px radius, `hover` ground on hover, a tooltip and accessibility label ("Accounts and settings", "Refresh", "Move up", "Move down").

### Inputs / Fields

- **Style:** 36 px tall, 9 px radius, `background` ground, 1 px `input` border, 12.8 px text (rename field in the account view's header: 24 px, 6 px radius, 13 px, its text selected; Enter keeps, Esc leaves).
- **Focus:** the border turns `accent`.
- **Error:** one 12 px line under the field or code in `blocked-text`, from a known kind ("Claude did not accept the code.").

### Account View

- **Header:** the 16 px mark, the label at 14 px semibold (`muted` when signed out) and the plan at 12 px in `muted`; on the right the reading's age at 11.5 px in `muted` ("Read 2m ago", or "12m old · network" after a failed read) and the 26 px refresh control, Herdr's spinner while this account is read. While renamed, the label is the rename field and the plan goes.
- **Who:** the email and organization at 11.5 px in `muted`, "·" in `dim`.
- **Windows:** each window's name at 12 px in `foreground`, its bar at the full width (thin for the 5-hour window), then the percentage (or "At limit") in its level's text colour, "resets in 4d 6h" or "not started", and the clock time on the right, 11 px in `muted`. A failed read's bars are dimmed with their percentages only; before the first read, a pair of empty tracks; signed out, no bars.
- **Pace line:** when a bar carries its pace mark, an 18 px key (a 6 px bar half full, its tick at its middle) leads "The line on a bar marks how much of its time has passed." at 11.5 px in `muted`, wrapping rather than losing words.
- **Login line:** "Login ends Dec 5" at 11.5 px in `muted`; "Login ends in 2 days" in `working-text` in its last 3 days; "Login ended Nov 9" when signed out.
- **Actions:** Rename, Sign in again, Remove (the account action buttons). Remove confirms through Herdr's own confirm dialog. The view closes itself when its account is no longer connected.
- **Accounts and settings:** the last row, 38 px, 12 px in `muted` with a 14 px chevron on the right, `hover` ground on hover; it opens the detail view.

### Switch

- **Notifications:** 30 by 18 px, 9 px radius; on: `accent` track and `accent-foreground` knob; off: `input` track and `muted` knob. The 14 px knob slides 160 ms ease-out. Its label, "Notify at 90% and at the limit", sits beside it in `muted`.

### Spinner

Herdr's own ring (`mods/workspace-chrome/spinner.svg`), turning with `.spin(900)`, in `muted` (refresh) or `working` (the Codex wait).

## Do's and Don'ts

### Do:

- **Do** name theme roles (`t.chrome`, `t.muted`) and derive the rest with `mix()` and `alpha()`; the mod follows every Herdr theme, light and dark.
- **Do** keep the weekly bar full (6 px) and the 5-hour bar thin (3 px), 6 px apart (4 px in the rail and the strip), at the full width, in every form, and centre each pace tick on its bar, 2 px above and below (1 px in the rail and the strip).
- **Do** put the percentage and reset under the bar in 11 px `muted`, with the level colour only on the percentage.
- **Do** mix level colours 22 % toward `foreground` for text, so every readable number holds 4.5:1 on graphite and paper.
- **Do** draw only the windows a plan reports; a weekly-only account has one bar.
- **Do** draw each account with its provider's own logo: the ChatGPT logo in `foreground`, Claude's spark in Claude's orange.
- **Do** reuse Herdr's assets: spinner, plus and chevron icons, scrollbar, confirm dialog, toasts.
- **Do** move a bar to a new reading with `.transition`; nothing pulses or redraws on a timer for motion.

### Don't:

- **Don't** write a hex value in the mod other than Claude's orange on its spark, or give it a logo, brand colour or palette of its own.
- **Don't** tell a level by colour alone, or colour anything at rest.
- **Don't** give the numbers a column beside the bar, or shorten the bar to fit them.
- **Don't** wrap accounts in cards, borders or pills, or sort them by usage.
- **Don't** use terminal glyphs, block characters or warning symbols; write the state as words.
- **Don't** use `dim` for anything a person must read beyond where Herdr's own mods use it.
- **Don't** add a collapse control to the list, or a grouping setting.
