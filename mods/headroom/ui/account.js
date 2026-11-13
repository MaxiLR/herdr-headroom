// The account view: one account alone.
import { v_flex } from "gpui-base";

export function render(view, cx) {
  return v_flex().size_full().bg(view.theme.popover);
}
