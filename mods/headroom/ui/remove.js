// The remove dialog: the question asked before an account's stored login is
// deleted, laid out as Herdr's confirm dialog is, with Cancel and a red
// Remove. Enter removes, Esc cancels; it closes itself once the store has
// removed the account, and when its account is no longer connected.
import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { removeQuestion } from "../logic/account.js";
import {
  cancelRemove,
  closeRemove,
  confirmRemove,
  removedOf,
} from "../logic/remove.js";

// The keyboard handle, which is not plain data.
function liveOf(view) {
  return view.ui.removeLive ?? null;
}

/**
 * A newly opened remove dialog takes the keyboard; one whose account is no
 * longer connected closes. Nothing in a copy that is not this dialog.
 */
export function init(view, cx) {
  if (view.form !== "remove" || liveOf(view)) return;
  const live = { handle: cx.focus_handle() };
  view.ui.removeLive = live;
  live.handle.focus();
  if (removedOf(view) === null) closeRemove(view);
}

export function render(view, _cx) {
  const t = view.theme;
  const live = liveOf(view);
  const ground = v_flex()
    .id("remove-dialog")
    .when(Boolean(live), (el) => el.track_focus(live.handle))
    .w_full()
    .min_h(0)
    .bg(t.popover);
  const reading = removedOf(view);
  // The account went away after the dialog opened.
  if (reading === null) {
    closeRemove(view);
    return ground;
  }
  const { title, detail } = removeQuestion(reading.label);
  return ground
    .on_key_down((event, cx) => {
      if (event.key === "enter") confirmRemove(view);
      else if (event.key === "escape") cancelRemove(view);
      else return;
      cx.stop_propagation();
    })
    .p(18)
    .text_size(13)
    .text_color(t.foreground)
    .child(
      h_flex()
        .gap(8)
        .items_center()
        .child(
          div()
            .flex_1()
            .min_w(0)
            .role("heading")
            .text_size(15)
            .font_semibold()
            .child(title),
        )
        .child(div().flex_none().text_size(11).text_color(t.dim).child("Esc")),
    )
    .child(div().mt(6).line_height("19px").text_color(t.muted).child(detail))
    .child(
      h_flex()
        .mt(20)
        .gap(8)
        .justify_end()
        .child(
          button("cancel", "Cancel", {
            ground: t.raised,
            border: t.input,
            text: t.foreground,
          }).on_click(() => cancelRemove(view)),
        )
        .child(
          button("remove", "Remove", {
            ground: t.blocked,
            border: t.blocked,
            text: t.solid_foreground,
          }).on_click(() => confirmRemove(view)),
        ),
    );
}

// A 32 px dialog button, as the connect dialog's.
function button(id, text, colours) {
  return h_flex()
    .id(id)
    .role("button")
    .flex_none()
    .h(32)
    .px(14)
    .items_center()
    .rounded(8)
    .border_1()
    .border_color(colours.border)
    .bg(colours.ground)
    .text_color(colours.text)
    .text_size(12.5)
    .font_medium()
    .whitespace_nowrap()
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .child(text);
}
