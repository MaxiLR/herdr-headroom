// The account menu: the three-dot control on each account's first line and
// the menu it opens (Rename, Move up, Move down, Sign in again, Remove), and
// the label's field while the account is renamed. gpui-base's `Popover` owns
// the press on the control, the anchoring and the dismissal (a press outside,
// Escape); this copy holds which menu is open, the highlighted item and the
// account being renamed, as plain data under `view.ui.menu`.
import { div } from "gpui-kit";
import { Input, InputState, Popover, h_flex, v_flex } from "gpui-base";
import { menuItems, removeQuestion } from "../logic/menu.js";
import { open as openConnect } from "./connect.js";
import { levelText, moreIcon } from "./kit.js";

const LABEL = "Account menu";

/** The menu's width, as Herdr's own menus of short words are. */
const MENU_WIDTH = 176;

// The account a Remove is waiting on Herdr's confirm dialog for, or null.
// Herdr hands the confirmed command to the shown copies of the mod, not to
// the one that asked, and maybe to several; module code is shared by every
// copy, so whichever copy hears it first takes the account, once.
let pending = null;

/**
 * This copy's menu, plain data: `open`, the account whose menu is open (or
 * null); `active`, the highlighted item (-1 for none); `renaming`, the
 * account whose label is being edited (or null).
 */
function stateOf(view) {
  const state = (view.ui.menu ??= {});
  state.open ??= null;
  state.active ??= -1;
  state.renaming ??= null;
  return state;
}

// What is not plain data: the keyboard handle the open menu takes, and the
// rename's field with the account it is for.
function liveOf(view) {
  return (view.ui.menuLive ??= {
    focus: null,
    input: null,
    renaming: null,
    focused: false,
  });
}

/** Makes the menu's keyboard handle, and the field of a rename given as data. */
export function init(view, cx) {
  const live = liveOf(view);
  live.focus ??= cx.focus_handle();
  const id = view.ui.menu?.renaming;
  if (id && live.renaming !== id) startRename(view, id, cx);
}

/** A `headroom.<name>` command: `remove` removes the account waiting for it. */
export function command(name, view) {
  if (name !== "remove" || pending === null) return;
  const id = pending;
  pending = null;
  const state = stateOf(view);
  if (state.renaming === id) endRename(view);
  if (state.open === id) closeMenu(view);
  view.store.remove(id);
}

/** Runs the menu item `key` for account `id`; a disabled one does nothing. */
export function choose(view, id, key, cx) {
  closeMenu(view);
  const reading = view.readings.find((item) => item.id === id);
  const item = menuItems(view.readings, id).find((each) => each.key === key);
  if (!reading || !item?.enabled) return;
  if (key === "rename") startRename(view, id, cx);
  else if (key === "up") view.store.move(id, -1);
  else if (key === "down") view.store.move(id, 1);
  else if (key === "signin") {
    openConnect(view, { provider: reading.provider, account: id });
  } else if (key === "remove") askRemove(view, reading);
}

/** Enter in the field: the account takes the field's text as its label. */
export function submitRename(view) {
  const id = stateOf(view).renaming;
  const live = liveOf(view);
  if (!id || !live.input || live.renaming !== id) return;
  const text = live.input.value();
  endRename(view);
  view.store.rename(id, text);
}

/** Esc in the field: the label stays as it was. */
export function cancelRename(view) {
  endRename(view);
}

// Asks first, with Herdr's own confirm dialog; the dialog's command comes
// back to `command` once confirmed.
function askRemove(view, reading) {
  pending = reading.id;
  view.host.openOverlay({
    mod: "confirm",
    kind: "dialog",
    props: {
      ...removeQuestion(reading.label),
      command: { name: "headroom.remove" },
    },
  });
}

function startRename(view, id, cx) {
  const reading = view.readings.find((item) => item.id === id);
  if (!reading) return;
  const live = liveOf(view);
  const input = InputState.new({ value: reading.label });
  input.set_selected_range({ start: 0, end: reading.label.length });
  input.on("submit", (_event, cx) => {
    submitRename(view);
    cx.notify();
  });
  input.on("focus", (_event, cx) => {
    live.focused = true;
    cx.notify();
  });
  input.on("blur", (_event, cx) => {
    live.focused = false;
    cx.notify();
  });
  live.input = input;
  live.renaming = id;
  live.focused = true;
  stateOf(view).renaming = id;
  input.focus();
  // The closing menu hands the keyboard back to its control; take it again.
  cx.spawn(async (cx) => {
    await cx.sleep(50);
    if (live.input === input) input.focus();
  });
}

function endRename(view) {
  const live = liveOf(view);
  live.input = null;
  live.renaming = null;
  live.focused = false;
  stateOf(view).renaming = null;
}

function closeMenu(view) {
  const state = stateOf(view);
  state.open = null;
  state.active = -1;
}

/**
 * The label's field while account `reading` is renamed, or null: Enter
 * renames, Esc leaves the label as it was.
 */
export function renameField(reading, view) {
  const t = view.theme;
  const live = liveOf(view);
  if (stateOf(view).renaming !== reading.id || live.renaming !== reading.id) {
    return null;
  }
  return div()
    .flex_1()
    .min_w(0)
    .on_key_down((event, cx) => {
      if (event.key !== "escape") return;
      cancelRename(view);
      cx.stop_propagation();
      cx.notify();
    })
    .child(
      Input.new(live.input)
        .accessibility_label(`Name of ${reading.label}`)
        .h(24)
        .px(6)
        .rounded(6)
        .border_1()
        .border_color(live.focused ? t.accent : t.input)
        .bg(t.background)
        .text_size(13)
        .font_medium()
        .text_color(t.foreground),
    );
}

/** The account menu's control for account `reading`, the `index`th. */
export function menuControl(reading, index, view) {
  const t = view.theme;
  const state = stateOf(view);
  const { focus } = liveOf(view);
  const open = state.open === reading.id;
  const trigger = div()
    .id(`menu-${index}`)
    .role("button")
    .accessibility_label(LABEL)
    .tooltip(LABEL)
    .size(26)
    .mr(-6)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .when(open, (el) => el.bg(t.hover))
    .hover((s) => s.bg(t.hover))
    .child(open ? moreIcon(14, t).text_color(t.foreground) : moreIcon(14, t));
  return Popover.new(`menu-${index}-popover`)
    .anchor("top_right")
    .open(open)
    .on_open_change((value, cx) => {
      if (value) {
        // A confirm dialog left without an answer asks nothing any more.
        pending = null;
        state.open = reading.id;
        state.active = -1;
      } else if (state.open === reading.id) {
        closeMenu(view);
      }
      cx.notify();
    })
    .when(Boolean(focus), (el) => el.track_focus(focus))
    .trigger(trigger)
    .when(open, (el) => el.content(surface(reading, index, view)));
}

function surface(reading, index, view) {
  const t = view.theme;
  const state = stateOf(view);
  const { focus } = liveOf(view);
  const items = menuItems(view.readings, reading.id);
  const enabled = items
    .map((item, k) => (item.enabled ? k : -1))
    .filter((k) => k >= 0);
  const step = (by) => {
    const at = enabled.indexOf(state.active);
    const from = at < 0 ? (by > 0 ? -1 : enabled.length) : at;
    state.active = enabled[(from + by + enabled.length) % enabled.length];
  };
  return v_flex()
    .id(`menu-${index}-surface`)
    .role("menu")
    .accessibility_label(LABEL)
    .when(Boolean(focus), (el) => el.track_focus(focus))
    .on_key_down((event, cx) => {
      if (event.key === "down" || event.key === "up") {
        step(event.key === "down" ? 1 : -1);
      } else if (
        (event.key === "enter" || event.key === "space") &&
        items[state.active]
      ) {
        choose(view, reading.id, items[state.active].key, cx);
      } else {
        return;
      }
      cx.stop_propagation();
      cx.notify();
    })
    .mt(2)
    .w(MENU_WIDTH)
    .p(5)
    .bg(t.popover)
    .border_1()
    .border_color(t.input)
    .rounded(10)
    .shadow_lg()
    .text_size(12.8)
    .text_color(t.foreground)
    .children(
      items.flatMap((item, k) => [
        ...(item.key === "remove" ? [rule(t)] : []),
        menuItem(item, k, items.length, reading, index, view),
      ]),
    );
}

// The thin line that sets Remove apart.
function rule(t) {
  return div().flex_none().h(1).mx(3).my(4).bg(t.border);
}

function menuItem(item, k, size, reading, index, view) {
  const t = view.theme;
  const active = stateOf(view).active === k;
  const color = !item.enabled
    ? t.dim
    : item.key === "remove"
      ? levelText("critical", t)
      : t.foreground;
  return h_flex()
    .id(`menu-${index}-${item.key}`)
    .role("menu_item")
    .accessibility_label(item.label)
    .set_position(k + 1, size)
    .disabled(!item.enabled)
    .flex_none()
    .h(30)
    .px(8)
    .items_center()
    .rounded(7)
    .text_color(color)
    .when(active, (el) => el.bg(t.hover))
    .when(item.enabled, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)))
    .on_click((_event, cx) => {
      choose(view, reading.id, item.key, cx);
      cx.notify();
    })
    .child(item.label);
}
