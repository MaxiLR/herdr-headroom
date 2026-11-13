// The rail: the block folded narrower than 160 px. Each account is its mark
// and the percent of its tightest window over its pair of bars; hovering it
// names the account and gives its numbers, a click opens its account view.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { openAccount } from "../logic/account.js";
import { alpha } from "../logic/color.js";
import { railNumber, railTooltip, showsNumber } from "../logic/rail.js";
import { barOf, rowOf } from "../logic/rows.js";
import { open as openConnect } from "./connect.js";
import { fitTo, levelText, mark, pair } from "./kit.js";

const PLUS = "mods/workspace-chrome/plus.svg";

// A signed-out account's mark is faded; a failed read's bars are dimmed by
// the pair itself.
const SIGNED_OUT_MARK = 0.45;

// An empty track, so a first read still shows where its bar will be.
const UNREAD = { fraction: 0, level: "normal", pace: null };

// Herdr's compact "!" badge, in the high colour: sign in again.
function badge(t) {
  return div()
    .size(14)
    .flex_none()
    .rounded(4)
    .bg(alpha(t.working, 0.15))
    .text_size(10.5)
    .font_bold()
    .text_color(levelText("high", t))
    .flex()
    .items_center()
    .justify_center()
    .child("!");
}

// The 16 px line: the mark, and on the right the number (or the badge).
function line(row, wide, t) {
  const signedOut = row.state === "signed-out";
  const icon = mark(row.provider, 14).when(signedOut, (el) =>
    el.opacity(SIGNED_OUT_MARK),
  );
  const number = wide ? railNumber(row) : null;
  const end = signedOut
    ? badge(t)
    : number &&
      h_flex()
        .flex_none()
        .items_baseline()
        .gap(3)
        .child(
          div()
            .text_size(11)
            .text_color(levelText(number.level, t))
            .child(number.text),
        )
        .when(number.tag !== "", (el) =>
          el.child(div().text_size(10.5).text_color(t.dim).child(number.tag)),
        );
  return h_flex()
    .h(16)
    .gap(5)
    .items_center()
    .map((el) => (wide ? el.justify_between() : el.justify_center()))
    .child(icon)
    .when(Boolean(end), (el) => el.child(end));
}

function bars(row, index, view) {
  const now = view.now;
  const unread = row.state === "first" && !row.weekly && !row.short;
  return pair(
    {
      id: `account-${index}`,
      full: row.weekly ? barOf(row.weekly, now) : unread ? UNREAD : null,
      short: row.short ? barOf(row.short, now) : null,
      heights: [5, 3],
      gap: 3,
      dimmed: row.state === "failed",
      ground: view.theme.chrome,
    },
    view.theme,
  );
}

function account(reading, index, view, wide) {
  const t = view.theme;
  const row = rowOf(reading, view.now);
  const words = railTooltip(reading, view.now);
  return v_flex()
    .id(`account-${index}`)
    .role("button")
    .accessibility_label(words)
    .tooltip(words)
    .px(8)
    .py(6)
    .gap(4)
    .rounded(6)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click(() => openAccount(view, reading.id))
    .child(line(row, wide, t))
    .when(row.state !== "signed-out", (el) => el.child(bars(row, index, view)));
}

// With no account yet: one quiet control that connects the first.
function connect(view) {
  const t = view.theme;
  return div()
    .id("connect-account")
    .role("button")
    .accessibility_label("Connect account")
    .tooltip("Connect account")
    .h(28)
    .mx(8)
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .text_color(t.muted)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_click(() => openConnect(view))
    .child(svg(PLUS).size(14).flex_none());
}

export function render(view, cx) {
  const wide = showsNumber(view.size?.width ?? null);
  return v_flex()
    .size_full()
    .min_h(0)
    .bg(view.theme.chrome)
    .child(
      v_flex()
        .id("accounts")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .child(
          v_flex()
            .id("rail")
            .flex_none()
            .py(4)
            .on_size_change((size) => fitTo(view, size.height))
            .children(
              view.readings.length === 0
                ? [connect(view)]
                : view.readings.map((reading, index) =>
                    account(reading, index, view, wide),
                  ),
            ),
        ),
    );
}
