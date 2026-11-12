// The list: a "Limits" header and one row per account, each window with its
// percent used and a bar filled to it.
import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import * as connect from "./connect.js";
import * as detail from "./detail.js";

// Why a read failed, in one word.
const REASON = {
  auth: "sign-in",
  network: "network",
  unexpected: "unexpected",
};

// Percent used, whole and rounded down.
const percentOf = (fraction) =>
  Math.min(100, Math.max(0, Math.floor(Math.round(fraction * 10000) / 100)));

function header(view) {
  const t = view.theme;
  return h_flex()
    .px(16)
    .h(41)
    .pt(14)
    .pb(5)
    .flex_none()
    .items_center()
    .justify_between()
    .child(
      div().text_size(11.5).font_medium().text_color(t.dim).child("Limits"),
    )
    .child(
      div()
        .id("open-detail")
        .role("button")
        .accessibility_label("Accounts and settings")
        .tooltip("Accounts and settings")
        .px(4)
        .text_size(13)
        .text_color(t.dim)
        .cursor_pointer()
        .hover((s) => s.text_color(t.foreground))
        .on_click(() => detail.open(view))
        .child("…"),
    );
}

function empty(view) {
  const t = view.theme;
  return v_flex()
    .px(16)
    .pt(4)
    .pb(14)
    .gap(6)
    .child(
      div()
        .text_size(13)
        .font_medium()
        .text_color(t.foreground)
        .child("No accounts yet"),
    )
    .child(
      div()
        .text_size(12)
        .text_color(t.muted)
        .child(
          "Connect a Claude or Codex account to see how close it is to its limits.",
        ),
    )
    .child(
      h_flex()
        .pt(6)
        .child(
          div()
            .id("connect-account")
            .role("button")
            .h(28)
            .px(12)
            .flex()
            .items_center()
            .rounded(6)
            .text_size(12.5)
            .font_medium()
            .bg(t.solid)
            .text_color(t.solid_foreground)
            .cursor_pointer()
            .on_click(() => connect.open(view))
            .child("Connect account"),
        ),
    );
}

function windowLine(window, t) {
  const percent = percentOf(window.usedFraction);
  return v_flex()
    .gap(3)
    .child(
      h_flex()
        .justify_between()
        .text_size(11)
        .text_color(t.muted)
        .child(div().child(window.label))
        .child(div().child(`${percent}%`)),
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

// What a screen reader says for a row: the label and each window's use.
function spoken(reading) {
  const used = reading.windows.map(
    (window) => `${window.label} ${percentOf(window.usedFraction)}% used`,
  );
  return [reading.label, ...used].join(", ");
}

function row(reading, index, view) {
  const t = view.theme;
  return v_flex()
    .id(`account-${index}`)
    .role("button")
    .accessibility_label(spoken(reading))
    .px(8)
    .py(6)
    .gap(6)
    .rounded(6)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click(() => detail.open(view))
    .child(
      h_flex()
        .gap(8)
        .justify_between()
        .child(
          div()
            .min_w(0)
            .truncate()
            .text_size(13)
            .text_color(t.foreground)
            .child(reading.label),
        )
        .when(reading.status === "error", (el) =>
          el.child(
            div()
              .flex_none()
              .text_size(11)
              .text_color(t.dim)
              .child(`Read failed · ${REASON[reading.error] ?? "unexpected"}`),
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
    .bg(t.chrome)
    .child(header(view))
    .child(
      view.readings.length === 0
        ? empty(view)
        : v_flex()
            .id("accounts")
            .flex_1()
            .min_h(0)
            .px(8)
            .pb(8)
            .gap(2)
            .overflow_y_scrollbar()
            .children(
              view.readings.map((reading, index) => row(reading, index, view)),
            ),
    );
}
