// The strip: the block in a status bar, under 48 px tall. One line with an
// item per account: its mark, its label, its pair of bars and the percent of
// its tightest window. A rule sets it apart from a block before it in its
// row; labels, then bars, give way when the line is too narrow, and the
// accounts that still do not fit are left out and counted in "+N". A click
// on an account opens its account view; the strip never resizes its block.
import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { openAccount } from "../logic/account.js";
import { alpha } from "../logic/color.js";
import { moreWords } from "../logic/hint.js";
import { railTooltip } from "../logic/rail.js";
import { barOf, rowOf } from "../logic/rows.js";
import {
  STRIP,
  STRIP_LABEL,
  stripFit,
  stripItem,
  stripSeparator,
} from "../logic/strip.js";
import { open as openConnect } from "./connect.js";
import { dotted, levelText, mark, pair, pressedGround } from "./kit.js";

// A signed-out account's mark is faded; a failed read's bars are dimmed by
// the pair itself.
const SIGNED_OUT_MARK = 0.45;

// An empty track, so a first read still shows where its bar will be.
const UNREAD = { fraction: 0, level: "normal", pace: null };

// The hover ground reaches this far past an item without moving it.
const HOVER_REACH = 4;

// Herdr's compact "!" badge, in the high colour: sign in again.
function badge(t) {
  return div()
    .size(STRIP.badge)
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

function bars(reading, row, view) {
  const unread = row.state === "first" && !row.weekly && !row.short;
  return div()
    .w(STRIP.bars)
    .flex_none()
    .child(
      pair(
        {
          id: `bar-${reading.id}`,
          full: row.weekly
            ? barOf(row.weekly, view.now)
            : unread
              ? UNREAD
              : null,
          short: row.short ? barOf(row.short, view.now) : null,
          heights: [5, 3],
          gap: 4,
          reach: 1,
          dimmed: row.state === "failed",
          ground: view.theme.chrome,
        },
        view.theme,
      ),
    );
}

function account(reading, row, item, index, density, view) {
  const t = view.theme;
  const words = railTooltip(reading, view.now);
  return h_flex()
    .id(`account-${index}`)
    .role("button")
    .accessibility_label(words)
    .tooltip(words)
    .flex_none()
    .h(22)
    .px(HOVER_REACH)
    .mx(-HOVER_REACH)
    .gap(STRIP.inner)
    .items_center()
    .rounded(5)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .active(pressedGround(t))
    .on_click(() => openAccount(view, reading.id))
    .child(
      dotted(
        mark(row.provider, STRIP.mark, t).when(item.badge, (el) =>
          el.opacity(SIGNED_OUT_MARK),
        ),
        {
          id: `account-${index}`,
          size: STRIP.mark,
          dot: row.limitWords !== null,
        },
        t,
      ),
    )
    .when(density === "full", (el) =>
      el.child(
        div().flex_none().max_w(STRIP_LABEL).truncate().child(item.label),
      ),
    )
    .when(item.badge, (el) => el.child(badge(t)))
    .when(item.bars && density !== "no-bars", (el) =>
      el.child(bars(reading, row, view)),
    )
    .when(item.percent !== null, (el) =>
      el.child(
        div()
          .flex_none()
          .text_color(levelText(item.level, t))
          .child(item.percent),
      ),
    )
    .when(item.tag !== "", (el) =>
      el.child(div().flex_none().text_size(STRIP.tag).child(item.tag)),
    );
}

// "+3": the accounts left out, in the items' own text, named in full for the
// pointer and screen readers. It is not a control.
function more(count) {
  const words = moreWords(count);
  return div()
    .id("more-accounts")
    .role("label")
    .accessibility_label(words)
    .tooltip(words)
    .flex_none()
    .whitespace_nowrap()
    .child(`+${count}`);
}

// With no account yet: one quiet control that connects the first.
function connect(view) {
  const t = view.theme;
  return div()
    .id("connect-account")
    .role("button")
    .flex_none()
    .h(22)
    .px(HOVER_REACH)
    .mx(-HOVER_REACH)
    .flex()
    .items_center()
    .rounded(5)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .active(pressedGround(t))
    .on_click(() => openConnect(view))
    .child("Connect account");
}

export function render(view, cx) {
  const t = view.theme;
  const separator = stripSeparator(view.host.layout(), view.props);
  const rows = view.readings.map((reading) => rowOf(reading, view.now));
  const items = rows.map(stripItem);
  const fit = stripFit(view.size?.width ?? null, items, separator);
  return h_flex()
    .id("strip")
    .size_full()
    .min_w(0)
    .overflow_hidden()
    .pl(separator ? STRIP.ruledPad : STRIP.pad)
    .pr(STRIP.pad)
    .gap(STRIP.gap)
    .items_center()
    .bg(t.chrome)
    .border_t(1)
    .border_color(t.border)
    .text_size(STRIP.text)
    .text_color(t.muted)
    .when(separator, (el) =>
      el.child(div().id("separator").flex_none().w(STRIP.rule).h(14).bg(t.dim)),
    )
    .children(
      view.readings.length === 0
        ? [connect(view)]
        : view.readings
            .slice(0, fit.shown)
            .map((reading, index) =>
              account(
                reading,
                rows[index],
                items[index],
                index,
                fit.density,
                view,
              ),
            ),
    )
    .when(fit.more > 0, (el) => el.child(more(fit.more)));
}
