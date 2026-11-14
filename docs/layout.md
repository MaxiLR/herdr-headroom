# Using it in your own layout

[Back to the README](../README.md)

`mod.json` is `{ "place": "none" }`: Herdr docks no copy by itself; the mod
appears only where a layout puts it. It binds no key and has no command of its
own.

## The block and `fit`

The block the installer adds:

```json
{
  "id": "headroom",
  "type": "block",
  "size": { "px": 111 },
  "min": 90,
  "content": { "mod": "headroom", "props": { "fit": "headroom" } }
}
```

`props.fit` names the block the copy is in, and the list and the rail resize
it (`layout.resize`) to the line on their top edge, the list's header and the
first two accounts. In the list that is 111 px for one account with one bar,
120 px for one with both bars and 190 px for two; with three or more it is
207 px, 17 px taller for the hint ("3 more"). In the rail it is 97 px for two
accounts with both bars, 103 px with the hint ("+3"). An empty list fits its
"No accounts yet" and its button. Further accounts scroll under the header, or
you drag the block taller. A layout of your own gets the same from `fit`: room
for two accounts.

The mod remembers the height it last asked for, per layout and block, in
`headroom.fit`, and fits the block again only when the height it needs
changes: an account connected, removed or moved into the first two, one
gaining or losing a bar, or a third account arriving or the last one past two
leaving. A boundary you drag stays where you put it, across restarts too,
until then. Folding the sidebar turns the list into the rail, which needs
another height, so the block is fitted again and a dragged size is lost.

Without `fit` the list and the rail never resize their block: they fill the
block they are given, the header stays and the accounts scroll under it.

## Props

| Prop      | Values                                                         | What it does                                                                                                                                                                                                                                                                                                 |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `form`    | `auto` (default), `list`, `rail`, `strip`, `detail`, `account` | The form to draw. With `auto`, or none, the block's measured size decides.                                                                                                                                                                                                                                   |
| `account` | the account's id, `<provider>:<account id>:<organization id>`  | The account the account view shows, with `form: "account"`. The ids are in [`headroom.readings`](readings.md).                                                                                                                                                                                               |
| `fit`     | the `id` of the block holding this copy                        | The list and the rail resize that block (`layout.resize`) to the line, the header and their first two accounts, at least 48 px (a strip's height, so a folded rail unfolds to the list again); with three or more accounts, 17 px more for the hint, and the rest scroll. The strip never resizes its block. |

The connect dialog is the same mod opened as a dialog with a `connect` prop
(`{ provider, account }` when it signs an account in again), the remove dialog
the same with a `remove` prop (the id of the account it asks about), and Herdr
gives every overlay an `overlay` prop; a layout sets none of them.

## Forms

With `form` set to `auto`, before its first measure the block is a list; after:

- **Rail** when the block is narrower than 160 px (Herdr's folded sidebar): a
  1 px line on its top edge, then each account's mark and the percent of the
  fuller of its weekly and 5-hour window (`5h` beside it when that is the
  5-hour one), over its pair of bars. A red dot on the mark says a per-model
  window is at its limit. When accounts are cut off below, `+3` on the bottom
  edge says how many. Below 60 px wide the percent is left out and the mark is
  centred. Hovering an account names it and gives its numbers, and the model
  at its limit.
- **Strip** when the block is under 48 px tall (a status bar): a 1 px line on
  its top edge and one line with an item per account: its mark, label, bars
  and the percent of the fuller of its weekly and 5-hour window, and the red
  dot on the mark for a per-model window at its limit. When the line is too
  narrow the labels go first, then the bars; the marks and percents stay.
- **List** otherwise: a 1 px line on its top edge, a "Limits" header and, per
  account, its mark and label, two bars at most (a full bar for the weekly
  window over a thin one for the 5-hour window), and one line of numbers. A
  per-model window has no bar on the row: when one is at its limit, its words
  follow the week's percent in place of the reset time (`41% · Fable at
limit`, or `2 models at limit`). When accounts are cut off below, "3 more"
  and a chevron on the bottom edge say how many; the count follows the wheel.
  Below 220 px wide the 5-hour numbers lose their word.
- **Account**, only when `form` is `account` with an `account`: that account
  alone. Its mark, label and plan, the age of its reading (`Read 2m ago`, or a
  failed read's `12m old · network`) with a refresh control that reads it
  again, and its email and organization. Then every window the plan has, per
  model and Codex's additional limits too, each with its percentage, its time
  to reset and the reset's clock time; when a Claude login ends; each account
  state as the list shows it (empty tracks before the first read, the last
  bars dimmed after a failed read, no bars and "Login ended …" for an account
  that must sign in again); and, when a bar has its pace mark, the line "The
  line on a bar marks how much of its time has passed." Under them its
  actions, Rename, Sign in again and Remove, and a last row, "Accounts and
  settings", that opens the detail view. Remove asks first with the mod's own
  dialog, over the view, with Cancel and a red Remove. The view closes itself
  when it opens another view (the connect dialog, the detail view) and when
  its account is no longer connected.
- **Detail**, only when `form` is `detail`: the one place to manage every
  account. Every window of every account, per model and Codex's additional
  limits too, the reset's clock time, when a login ends, the refresh control,
  the notifications switch, "Show in status bar" (only when the shown layout
  has a block with the id `headroom-strip`; it shows and hides that block) and
  Connect account. Each account has an up and a down arrow that move it in
  the order, and beside them Rename and Remove behind three dots ("Rename or
  remove"): Rename turns the label into a field in place, Remove asks as the
  account view does. From 520 px wide each window is one line; below 340 px
  the clock time is left out and Connect account is a square with the plus
  alone. It closes itself when it opens an account view or the connect
  dialog.

A click on an account in the list, the rail, the strip or the detail view
opens its account view as a 380 px popup. The list's header control and the
account view's last row, "Accounts and settings", open the detail view as a
380 px popup.

## The strip's separator

A strip starts with a 1 px rule when its block follows a shown block in the
same `row` of the layout, and has none when it is alone or first in its row.
The copy finds its own block by `props.fit`; without `fit`, by being the only
block of the `headroom` mod in the layout. When it cannot tell (no layout, two
Headroom blocks and no `fit`), it draws no rule.

The status row the installer writes from Herdr's 28 px status block. The strip
follows `status`, so once "Show in status bar" shows it, it starts with the
rule:

```json
{
  "id": "status-row",
  "type": "row",
  "size": { "px": 28 },
  "children": [
    {
      "id": "status",
      "type": "block",
      "size": { "weight": 3 },
      "content": { "mod": "workspace-status" }
    },
    {
      "id": "headroom-strip",
      "type": "block",
      "hidden": true,
      "size": { "weight": 2 },
      "min": 120,
      "max": 720,
      "content": {
        "mod": "headroom",
        "props": { "form": "strip", "fit": "headroom-strip" }
      }
    }
  ]
}
```

## The account view and the detail view from elsewhere

The detail view as a pane, from a shell:

```sh
herdr-app do pane.split --direction right --mod headroom --props '{"form":"detail"}'
```

The detail view as a dialog, from another mod:

```js
import { openOverlay } from "herdr";

openOverlay({
  mod: "headroom",
  kind: "dialog",
  width: 520,
  props: { form: "detail" },
});
```

An account's view as a popup, from another mod, with an id from
[`headroom.readings`](readings.md):

```js
import { openOverlay } from "herdr";

openOverlay({
  mod: "headroom",
  kind: "popup",
  width: 380,
  props: { form: "account", account: "<id>" },
});
```
