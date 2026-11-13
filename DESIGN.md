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
  menu-item: "7px"
  row: "8px"
  field: "9px"
  menu: "10px"
  bar: "9999px"
spacing:
  hair: "3px"
  pair: "4px"
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
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 10px"
  menu:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.menu}"
    width: "176px"
  menu-item:
    rounded: "{rounded.menu-item}"
    height: "30px"
    padding: "0 8px"
  menu-item-active:
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
---

# Design System: Headroom

## Overview

**Creative North Star: "The Quiet Gauge"**

Headroom is a gauge that lives inside someone else's dashboard. It has no world of its own: every colour is a named colour of the running Herdr theme, read from `theme()` at render, and the type is Herdr's UI font (Geist) with its terminal font (JetBrains Mono) for codes and addresses. What it owns is a structure, the pair of bars, and a temperament: Claude-like restraint, few symbols, states written as words, shapes drawn rather than typed as terminal glyphs.

The surface is glanced at between other work, in the left sidebar beside Herdr's Spaces and Agents mods. It is dense and calm. Nothing carries colour until something is wrong: at rest every fill and number is `muted`, and the theme's `working` and `blocked` appear only when a window passes 75 % and 90 %. The bar always keeps its full width; the numbers sit in one quiet 11 px line beneath it and never take the bar's room.

The values in the frontmatter are the graphite theme (Herdr's default dark). They are a reference, not constants: the code names the role (`t.chrome`, `t.muted`) and paper, ink, moss and atom-one-dark supply their own values for the same names.

**Key Characteristics:**

- Thickness names the window: a full 6 px bar for a weekly window, a 3 px bar for the 5-hour one, 4 px apart.
- Colour only for trouble; a level is always paired with its number or the words "At limit".
- A 2 px pace tick with a ground-coloured halo says whether an account is burning faster than its window.
- Herdr's own provider marks, spinner, scrollbar, confirm dialog and toasts; no brand, logo or palette of the mod's own.
- Native motion only: fills and ticks slide with `.transition`, waits spin with `.spin(900)`.

## Colors

Herdr's theme, used by role name; the mod adds only two computed values (the track and the level numbers), both derived from theme colours at render.

### Primary

- **Working Amber** (`working`): the fill of a bar from 75 % used (high level), and the tint of the compact "!" badge and the Codex wait spinner.
- **Blocked Coral** (`blocked`): the fill of a bar from 90 % used (critical level) and at its limit.
- **Working Amber, Readable** (`working-text`): the number beside a high bar and the "Login ends in 2 days" warning. Computed as `working` mixed 22 % toward `foreground` (`mix()` in `logic/color.js`), because plain `working` falls to 4.3:1 on paper's `chrome`.
- **Blocked Coral, Readable** (`blocked-text`): the number beside a critical bar, "At limit", and sign-in errors in the connect dialog. `blocked` mixed 22 % toward `foreground`.

### Secondary

- **Herdr Accent** (`accent`): the one interactive colour. "Sign in again" links, the notifications switch when on, and the focused field's border. `accent-foreground` draws the switch knob over it.

### Neutral

- **Chrome** (`chrome`): the ground of the list, the rail and the strip, the sidebar's own colour. The pace tick's halo is this colour there.
- **Popover** (`popover`): the ground of the detail view, the connect dialog and the account menu. The pace tick's halo is this colour in the detail view.
- **Background** (`background`): the inside of fields and of the Codex code box in the dialog.
- **Raised** (`raised`): secondary buttons and the small Copy/Open buttons.
- **Foreground** (`foreground`): labels and titles; the pace tick itself.
- **Muted** (`muted`): every number, reset, status word, hint, normal-level fill, and icon. 4.8:1 or better on every ground in graphite and paper.
- **Dim** (`dim`): only where Herdr's own mods use it: the "Limits" header, the "·" separators, "Esc", field labels, the strip separator and the "5h" tag in the rail.
- **Track** (`track`): the empty part of every bar, `foreground` at 10 % alpha, in light and dark alike (`raised` vanishes on paper's `chrome`).
- **Border, Input, Hover, Selected** (`border`, `input`, `hover`, `selected`): section rules in the detail view, control outlines, hover grounds and the pressed secondary button.
- **Solid** (`solid` / `solid-foreground`): the one primary button in a dialog (Connect).

### Named Rules

**The Colour Is Trouble Rule.** At rest, everything is `muted` or `foreground`. `working` and `blocked` appear only when a window is high, critical or at its limit, and `accent` only on what can be clicked to fix something.

**The Never By Colour Alone Rule.** A level is always beside its number; at 100 % the number becomes the words "At limit". Nothing is told by hue only.

**The Theme Owns The Values Rule.** Never write a hex value in the mod. Name the theme role; derive anything else (track, level numbers, badge tint) from theme roles with `mix()` and `alpha()`.

## Typography

**Body Font:** Geist (Herdr's `ui_font_family`, with the system sans-serif)
**Label/Mono Font:** JetBrains Mono (Herdr's terminal `font_family`, read from `settings()` at render)

**Character:** One family at small sizes, set apart by weight and colour rather than by size jumps. Mono appears only where a person copies something: the Codex device code and sign-in addresses.

### Hierarchy

- **Dialog title** (600, 15 px): the connect dialog's title, as Herdr's prompt and confirm dialogs.
- **Detail title** (600, 14 px): "Limits" at the top of the detail view.
- **Label** (400, 13 px; 500 in the detail view): an account's label; dialog body text.
- **Window line** (400, 12 px): each window's name, percentage, reset and clock time in the detail view; hints and menu items run at 12 to 12.8 px.
- **Block header** (500, 11.5 px, `dim`): "Limits" over the list, matching Herdr's "Spaces" and "Agents".
- **Numbers** (400, 11 px, `muted` or a level colour): the quiet line under the bars, the rail's percentage and status words on the label line.
- **Strip** (400, 11.8 px, `muted`): the status-bar line, matching Herdr's status bar.
- **Code** (JetBrains Mono 500, 22 px): the Codex device code. **Address** (JetBrains Mono 400, 11.5 px, `muted`): the sign-in address.

### Named Rules

**The Words Not Glyphs Rule.** States are written: "At limit", "Sign in again", "not started", "12m old · network". No warning triangles, no terminal block characters. The only typed symbol is the "·" separator in `dim`, and the compact "!" badge copied from Herdr.

**The Quiet Number Rule.** Percentages and countdowns are 11 px and `muted` under the bar; they never get a column of their own beside it. Format: "41% · 4d 6h"; alone on a row, "23% · resets in 5d 2h".

## Layout

The mod picks a form from its block's measured size (`logic/form.js`): **rail** narrower than 160 px; otherwise **strip** under 48 px tall; otherwise **list**. The detail view and the connect dialog are opened as overlays, not picked.

- **List.** A 41 px header, then accounts 8 px in from the block's edges, as Herdr's rows are. Per account: a 26 px label line (14 px mark, 8 px gap, 13 px label, the note right-aligned), the pair of bars, 6 px, a 14 px line of numbers (weekly on the left, "5-hour" on the right), then 9 px. Below about 220 px the 5-hour numbers drop their word. The block asks its layout for exactly the height its accounts need (`props.fit`, via `fitTo`), up to 320 px (four accounts); past that the header stays and the accounts scroll under it with Herdr's scrollbar. It never collapses.
- **Rail.** 8 px by 6 px per account: a 16 px line with the mark and the tightest window's percentage (plus "5h" in `dim` when that is the 5-hour window), then a 5 px and 3 px pair, 3 px apart. Under 60 px the number drops and the mark centres over the bars.
- **Strip.** One 28 px line, 14 px padding each side, items 16 px apart and their parts 6 px apart: a 12 px mark, the label, a 44 px wide pair, the percentage. Labels drop first, then bars; marks and percentages always stay. A 1 px by 14 px `dim` rule leads the strip only when another block precedes it in its row.
- **Detail view.** A 380 px popup (also a dialog or pane). Sections are 16 px in, separated by 1 px `border` rules; windows stack name-line over bar, 11 px apart. From 520 px each window is one line (name 120 px, bar flexible, percentage 56 px, reset 104 px, clock 66 px); under 340 px the clock time drops.
- **Connect dialog.** Herdr's dialog layout: 18 px padding, 36 px fields, 32 px buttons, 20 px above the button row.

Accounts stay in the person's own order; nothing is sorted by usage.

## Elevation & Depth

Flat. The list, rail and strip sit on `chrome` with no shadow, border or card around an account; hover lays Herdr's translucent `hover` ground over the row. Depth comes from Herdr's overlay frame: the detail view and connect dialog lift onto `popover`, and their frame and shadow are Herdr's, not the mod's. The single shadow the mod draws itself is gpui's `shadow_lg` under the account menu, which floats over the detail view.

### Named Rules

**The No Card Rule.** No borders, pills or containers around an account. The pair of bars and the 9 px gap are the grouping.

## Shapes

Bars are fully rounded capsules (`rounded_full`), and so is every fill; a non-empty fill is drawn at least 3 px wide so 1 % still shows. The pace tick is a 2 px capsule inside a 1.5 px ground-coloured halo box, reaching 3 px beyond its bar on the outer side (above the weekly bar, below the 5-hour one) and 1 px on the inner, so the two ticks never touch. Interactive grounds use small, consistent radii: 4 px badge, 5 px strip item, 6 px icon controls, 7 px menu items, 8 px rows and buttons, 9 px fields and choices, 10 px the menu.

## Components

### The Pair of Bars (signature)

The memorable thing: a full bar over a thin one, thickness naming the window so no label is needed.

- **Shape:** weekly 6 px, 5-hour 3 px, 4 px apart, full width (rail and strip: 5 px and 3 px, 3 px apart; strip pair 44 px wide).
- **Colour:** track `track`; fill `muted` below 75 %, `working` from 75 %, `blocked` from 90 % and at the limit.
- **Pace mark:** 2 px `foreground` tick at the share of the window's time elapsed, haloed in the ground colour (`chrome` in the sidebar, `popover` in the detail view). No tick for a window that has not started.
- **States:** a window the plan lacks is not drawn (a weekly-only plan shows one bar). First read: empty tracks, no numbers. Read failed: bars at 40 % opacity, no ticks. Signed out: no bars.
- **Motion:** fill width and tick position transition over 400 ms ease-out.
- **Per-model window:** shown on the row only when more used than the general weekly window, as its own full bar under the pair, 7 px down.

### Account Row

- **List:** 8 px side padding, 8 px radius, `hover` ground on hover, whole row is a button labelled with its spoken summary; a click opens the detail view.
- **Label line notes:** "12m old · network" in `muted` for a failed read; "Login ends in 2 days" in `working-text`; "Sign in again" in `accent` (underlined on hover) with the label falling to `muted` and "Login ended Nov 9" under it.
- **Rail and strip:** a signed-out mark at 45 % opacity with Herdr's 14 px "!" badge (`working` at 15 % alpha, `working-text` glyph). A tooltip names the account and both windows.

### Buttons

- **Shape:** 8 px radius, 32 px tall, 14 px horizontal, 12.5 px medium.
- **Primary:** `solid` ground, `solid-foreground` text and border; one per dialog (Connect). Disabled at 45 % opacity while the code field is empty; shows Herdr's spinner while checking.
- **Secondary:** `raised` ground, `input` border, `foreground` text (Cancel). Hover drops opacity to 0.88.
- **Connect account:** 30 px (28 px in the empty list), `raised` ground (none in the list), `input` border, a 12 to 14 px plus icon in `muted`; `selected` or `hover` on hover.
- **Mini:** 26 px, 6 px radius, `raised`, 12 px: Copy (turns to "Copied") and Open.
- **Icon controls:** 22 to 26 px square, 6 px radius, `hover` ground on hover, a tooltip and accessibility label ("Accounts and settings", "Refresh").

### Inputs / Fields

- **Style:** 36 px tall, 9 px radius, `background` ground, 1 px `input` border, 12.8 px text (rename field: 24 px, 6 px radius, 13 px).
- **Focus:** the border turns `accent`.
- **Error:** one 12 px line under the field or code in `blocked-text`, from a known kind ("Claude did not accept the code.").

### Menu

- **Account menu:** 176 px, `popover` ground, `input` border, 10 px radius, `shadow_lg`, 12.8 px. Items 30 px, 7 px radius, `hover` ground when active or hovered; 1 px `border` divider. Rename, Move up, Move down, Sign in again, Remove; Remove confirms through Herdr's own confirm dialog.

### Switch

- **Notifications:** 30 by 18 px, 9 px radius; on: `accent` track and `accent-foreground` knob; off: `input` track and `muted` knob. The 14 px knob slides 160 ms ease-out. Its label, "Notify at 90% and at the limit", sits beside it in `muted`.

### Spinner

Herdr's own ring (`mods/workspace-chrome/spinner.svg`), turning with `.spin(900)`, in `muted` (refresh) or `working` (the Codex wait).

## Do's and Don'ts

### Do:

- **Do** name theme roles (`t.chrome`, `t.muted`) and derive the rest with `mix()` and `alpha()`; the mod follows every Herdr theme, light and dark.
- **Do** keep the weekly bar full (6 px) and the 5-hour bar thin (3 px), 4 px apart, at the full width, in every form.
- **Do** put the percentage and reset under the bar in 11 px `muted`, with the level colour only on the percentage.
- **Do** mix level colours 22 % toward `foreground` for text, so every readable number holds 4.5:1 on graphite and paper.
- **Do** draw only the windows a plan reports; a weekly-only account has one bar.
- **Do** reuse Herdr's assets: provider marks (`icons/claude.svg`, `icons/codex.svg`), spinner, plus and chevron icons, scrollbar, confirm dialog, toasts.
- **Do** move a bar to a new reading with `.transition`; nothing pulses or redraws on a timer for motion.

### Don't:

- **Don't** write a hex value in the mod or give it a logo, brand colour or palette of its own.
- **Don't** tell a level by colour alone, or colour anything at rest.
- **Don't** give the numbers a column beside the bar, or shorten the bar to fit them.
- **Don't** wrap accounts in cards, borders or pills, or sort them by usage.
- **Don't** use terminal glyphs, block characters or warning symbols; write the state as words.
- **Don't** use `dim` for anything a person must read beyond where Herdr's own mods use it.
- **Don't** add a collapse control to the list, or a grouping setting.
