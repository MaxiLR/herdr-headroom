// The three dots on each account's line in the detail view and the menu they
// open: a pencil and Rename, a trash can and Remove. gpui-base's `Popover`
// owns the press on the control, the anchoring and the dismissal (a press
// outside, Escape); the caller holds which menu is open, as plain data.
import { svg } from "gpui-kit";
import { Popover, h_flex, v_flex } from "gpui-base";
import { levelText, moreIcon } from "./kit.js";

const PENCIL = "mods/headroom/icons/pencil.svg";
const TRASH = "mods/headroom/icons/trash.svg";

const NAME = "Rename or remove";

/** The menu's width, as Herdr's own menus of short words are. */
const WIDTH = 176;

// A click stays where it is: neither the control nor its menu opens the
// account view of the account they are drawn in.
const keep = (_event, cx) => cx.stop_propagation();

/**
 * The three dots of the `index`th account, 22 px, and the menu under them:
 * `open` while it is shown; `onOpenChange(open, cx)` when a press or Escape
 * opens or closes it; `onChoose(key, cx)` with `rename` or `remove`.
 */
export function moreMenu({ index, open, onOpenChange, onChoose }, t) {
  const trigger = h_flex()
    .id(`account-${index}-more`)
    .role("button")
    .accessibility_label(NAME)
    .tooltip(NAME)
    .size(22)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .when(open, (el) => el.bg(t.hover))
    .hover((s) => s.bg(t.hover))
    .on_click(keep)
    .child(open ? moreIcon(14, t).text_color(t.foreground) : moreIcon(14, t));
  return Popover.new(`account-${index}-menu`)
    .anchor("top_right")
    .open(open)
    .on_open_change((value, cx) => onOpenChange(value, cx))
    .trigger(trigger)
    .when(open, (el) => el.content(surface(index, onChoose, t)));
}

function surface(index, onChoose, t) {
  const critical = levelText("critical", t);
  return v_flex()
    .id(`account-${index}-menu-items`)
    .role("menu")
    .accessibility_label(NAME)
    .on_click(keep)
    .mt(2)
    .w(WIDTH)
    .p(5)
    .bg(t.popover)
    .border_1()
    .border_color(t.input)
    .rounded(10)
    .shadow_lg()
    .text_size(12.8)
    .child(
      item(
        { index, key: "rename", k: 1, icon: PENCIL, word: "Rename" },
        { icon: t.muted, word: t.foreground },
        onChoose,
        t,
      ),
    )
    .child(
      item(
        { index, key: "remove", k: 2, icon: TRASH, word: "Remove" },
        { icon: critical, word: critical },
        onChoose,
        t,
      ),
    );
}

// One 31 px row: its 14 px icon, 9 px, then its word.
function item({ index, key, k, icon, word }, colors, onChoose, t) {
  return h_flex()
    .id(`account-${index}-menu-${key}`)
    .role("menu_item")
    .accessibility_label(word)
    .set_position(k, 2)
    .flex_none()
    .h(31)
    .px(8)
    .gap(9)
    .items_center()
    .rounded(7)
    .text_color(colors.word)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click((_event, cx) => {
      cx.stop_propagation();
      onChoose(key, cx);
      cx.notify();
    })
    .child(svg(icon).size(14).flex_none().text_color(colors.icon))
    .child(word);
}
