// The detail view: every account with its windows, and Connect account.
import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import * as connect from "./connect.js";

// Percent used, whole and rounded down.
const percentOf = (fraction) =>
  Math.min(100, Math.max(0, Math.floor(Math.round(fraction * 10000) / 100)));

export function open(view) {
  view.host.openOverlay({
    mod: "headroom",
    kind: "popup",
    width: 380,
    props: { form: "detail" },
  });
}

function windowLine(window, t) {
  const percent = percentOf(window.usedFraction);
  return v_flex()
    .gap(4)
    .child(
      h_flex()
        .justify_between()
        .text_size(12)
        .child(div().text_color(t.foreground).child(window.label))
        .child(div().text_color(t.muted).child(`${percent}%`)),
    )
    .child(
      div()
        .role("meter")
        .accessibility_label(`${window.label}: ${percent}% used`)
        .h(4)
        .w_full()
        .rounded_full()
        .bg(t.border)
        .child(div().h_full().w(`${percent}%`).rounded_full().bg(t.muted)),
    );
}

function section(reading, t) {
  return v_flex()
    .py(12)
    .gap(8)
    .border_t(1)
    .border_color(t.border)
    .child(
      h_flex()
        .gap(8)
        .items_center()
        .child(
          div()
            .min_w(0)
            .truncate()
            .text_size(13)
            .font_medium()
            .text_color(t.foreground)
            .child(reading.label),
        )
        .when(Boolean(reading.plan), (el) =>
          el.child(
            div()
              .flex_none()
              .text_size(12)
              .text_color(t.dim)
              .child(reading.plan),
          ),
        ),
    )
    .children(reading.windows.map((window) => windowLine(window, t)));
}

export function render(view, cx) {
  const t = view.theme;
  return v_flex()
    .size_full()
    .min_h(0)
    .bg(t.popover)
    .text_size(13)
    .child(
      div()
        .px(16)
        .pt(14)
        .pb(10)
        .flex_none()
        .role("heading")
        .text_size(15)
        .font_semibold()
        .text_color(t.foreground)
        .child("Limits"),
    )
    .child(
      v_flex()
        .id("detail-accounts")
        .flex_1()
        .min_h(0)
        .px(16)
        .overflow_y_scrollbar()
        .children(view.readings.map((reading) => section(reading, t))),
    )
    .child(
      h_flex()
        .px(16)
        .py(12)
        .flex_none()
        .border_t(1)
        .border_color(t.border)
        .justify_end()
        .child(
          div()
            .id("connect-account")
            .role("button")
            .h(32)
            .px(12)
            .flex()
            .items_center()
            .rounded(6)
            .text_size(13)
            .font_medium()
            .bg(t.solid)
            .text_color(t.solid_foreground)
            .cursor_pointer()
            .on_click(() => connect.open(view))
            .child("Connect account"),
        ),
    );
}
