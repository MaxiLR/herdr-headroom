// The field an account's label is edited in, in place of the label: in the
// account view's header and on an account's line in the detail view. Enter
// keeps its text, Esc leaves the label as it was.
import { div } from "gpui-kit";
import { Input, InputState } from "gpui-base";

/**
 * The field's state, holding `label` with all of it selected: `submit()`
 * runs on Enter, `focus(focused)` when the field takes or loses the keyboard.
 */
export function labelInput(label, { submit, focus }) {
  const input = InputState.new({ value: label });
  input.set_selected_range({ start: 0, end: label.length });
  input.on("submit", (_event, cx) => {
    submit();
    cx.notify();
  });
  input.on("focus", (_event, cx) => {
    focus(true);
    cx.notify();
  });
  input.on("blur", (_event, cx) => {
    focus(false);
    cx.notify();
  });
  return input;
}

/**
 * The field of `input`, as wide as it is given: 24 px, `background`, its
 * border in `accent` while it has the keyboard. Esc runs `cancel()`.
 */
export function labelField(input, { label, focused, cancel }, t) {
  return div()
    .flex_1()
    .min_w(0)
    .on_key_down((event, cx) => {
      if (event.key !== "escape") return;
      cancel();
      cx.stop_propagation();
      cx.notify();
    })
    .child(
      Input.new(input)
        .accessibility_label(`Name of ${label}`)
        .h(24)
        .px(6)
        .rounded(6)
        .border_1()
        .border_color(focused ? t.accent : t.input)
        .bg(t.background)
        .text_size(13)
        .text_color(t.foreground),
    );
}
