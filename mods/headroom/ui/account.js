// The account view: one account alone, in a 380 px popup opened by a click on
// it in the list, the rail or the strip. Its mark, label and plan, then every
// window the plan has, each with its name over its bar and one quiet line of
// numbers under it; its last row opens the detail view. When its account is
// no longer connected it closes itself.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { accountOf } from "../logic/account.js";
import { clockText, windowsInOrder } from "../logic/detail.js";
import { levelOf } from "../logic/levels.js";
import { untilReset } from "../logic/pace.js";
import { barOf, isThin } from "../logic/rows.js";
import { percentText } from "../logic/words.js";
import { open as openDetail } from "./detail.js";
import { bar, levelText, mark } from "./kit.js";

const CHEVRON = "mods/workspace-chrome/chevron-right.svg";

export function init(view, cx) {
  if (view.form === "account" && accountOf(view) === null) closeOnce(view);
}

// Closes the popup, once; a pane or a block has no overlay to close.
function closeOnce(view) {
  const state = (view.ui.account ??= {});
  if (state.closed || !view.props.overlay) return;
  state.closed = true;
  view.host.closeOverlay(view.props.overlay);
}

// The mark, the label and the plan, on one 26 px line.
function header(reading, t) {
  return h_flex()
    .h(26)
    .mt(12)
    .ml(16)
    .mr(10)
    .flex_none()
    .gap(8)
    .items_center()
    .child(mark(reading.provider, 16))
    .child(
      h_flex()
        .min_w(0)
        .gap(8)
        .items_baseline()
        .child(
          div()
            .min_w(0)
            .truncate()
            .role("heading")
            .text_size(14)
            .font_semibold()
            .text_color(t.foreground)
            .child(reading.label),
        )
        .when(Boolean(reading.plan), (el) =>
          el.child(
            div()
              .flex_none()
              .text_size(12)
              .text_color(t.muted)
              .child(reading.plan),
          ),
        ),
    );
}

// One window: its name, its bar at the full width, then the percentage and
// the time to its reset on the left and the reset's clock time on the right.
function windowView(window, k, view) {
  const t = view.theme;
  const id = `window-${k}`;
  const level = levelOf(window);
  const left = untilReset(window, view.now);
  const reset = left === null ? "not started" : `resets in ${left}`;
  const clock = left === null ? null : clockText(window.resetsAt, view.now);
  return v_flex()
    .mt(13)
    .child(
      div()
        .h(16)
        .min_w(0)
        .truncate()
        .text_size(12)
        .text_color(t.foreground)
        .child(window.label),
    )
    .child(
      div()
        .mt(6)
        .child(
          bar(
            {
              id,
              ...barOf(window, view.now),
              thin: isThin(window),
              ground: t.popover,
            },
            t,
          ),
        ),
    )
    .child(
      h_flex()
        .h(14)
        .mt(6)
        .gap(8)
        .items_center()
        .justify_between()
        .text_size(11)
        .text_color(t.muted)
        .whitespace_nowrap()
        .child(
          h_flex()
            .min_w(0)
            .gap(4)
            .items_baseline()
            .child(
              div().text_color(levelText(level, t)).child(percentText(window)),
            )
            .child(div().text_color(t.dim).child("·"))
            .child(div().child(reset)),
        )
        .when(clock !== null, (el) => el.child(div().flex_none().child(clock))),
    );
}

// The way to the detail view, which the rail and the strip have no other way
// to reach. It carries the list header's control's name: it opens the same
// view.
function detailRow(view) {
  const t = view.theme;
  return h_flex()
    .id("open-detail")
    .role("button")
    .flex_none()
    .h(38)
    .pl(16)
    .pr(12)
    .gap(8)
    .items_center()
    .border_t(1)
    .border_color(t.border)
    .text_size(12)
    .text_color(t.muted)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click(() => openDetail(view))
    .child(div().flex_1().min_w(0).truncate().child("Accounts and settings"))
    .child(svg(CHEVRON).size(14).flex_none().text_color(t.muted));
}

export function render(view, cx) {
  const t = view.theme;
  const ground = v_flex().id("account-view").size_full().min_h(0).bg(t.popover);
  const reading = accountOf(view);
  // The account went away after the view opened: this draw is the first
  // code to see it.
  if (reading === null) {
    closeOnce(view);
    return ground;
  }
  return ground
    .text_size(13)
    .child(header(reading, t))
    .child(
      v_flex()
        .id("account-windows")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .pt(1)
        .px(16)
        .pb(15)
        .children(
          windowsInOrder(reading.windows).map((window, k) =>
            windowView(window, k, view),
          ),
        ),
    )
    .child(detailRow(view));
}
