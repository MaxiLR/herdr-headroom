// The list: a "Limits" header and, per account, its mark and label, the pair
// of bars (weekly full, 5-hour thin) and one quiet line of numbers. A click on
// an account opens its account view; the header's control opens the detail
// view. The header stays; what does not fit scrolls under it. A 1 px line on
// the top edge shows that the boundary drags. Only a block given `props.fit`
// asks for the height its accounts need, up to two.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { openAccount } from "../logic/account.js";
import { fitTo, HEADER, LINE, listNeeds } from "../logic/fit.js";
import { listRowOf } from "../logic/list.js";
import { open as openConnect } from "./connect.js";
import { open as openDetail } from "./detail.js";
import { levelText, mark, moreIcon, pair } from "./kit.js";

const PLUS = "mods/workspace-chrome/plus.svg";

function header(view) {
  const t = view.theme;
  return h_flex()
    .h(HEADER)
    .flex_none()
    .pt(14)
    .pb(5)
    .pl(16)
    .pr(12)
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
        .size(22)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click(() => openDetail(view))
        .child(moreIcon(14, t)),
    );
}

function empty(view) {
  const t = view.theme;
  return v_flex()
    .child(
      v_flex()
        .px(8)
        .pb(6)
        .gap(2)
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
            .line_height(1.45)
            .text_color(t.muted)
            .child(
              "Connect a Claude or Codex account to see how close it is to its limits.",
            ),
        ),
    )
    .child(
      h_flex()
        .pt(4)
        .pb(2)
        .px(8)
        .child(
          h_flex()
            .id("connect-account")
            .role("button")
            .h(28)
            .pl(8)
            .pr(10)
            .gap(6)
            .items_center()
            .rounded(8)
            .border_1()
            .border_color(t.input)
            .text_size(12.5)
            .font_medium()
            .text_color(t.foreground)
            .cursor_pointer()
            .hover((s) => s.bg(t.hover))
            .on_click(() => openConnect(view, {}))
            .child(svg(PLUS).size(12).flex_none().text_color(t.muted))
            .child("Connect account"),
        ),
    );
}

// The label line: the mark, the label and, on the right, the row's note.
function labelLine(row, index, view) {
  const t = view.theme;
  const signedOut = row.state === "signed-out";
  return h_flex()
    .h(26)
    .gap(8)
    .items_center()
    .child(mark(row.provider, 14, t))
    .child(
      div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_size(13)
        .text_color(signedOut ? t.muted : t.foreground)
        .child(row.label),
    )
    .when(row.note !== null && !signedOut, (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(11)
          .text_color(row.note.tone === "high" ? levelText("high", t) : t.muted)
          .child(row.note.text),
      ),
    )
    .when(signedOut, (el) =>
      el.child(
        div()
          .id(`account-${index}-sign-in`)
          .role("button")
          .accessibility_label(`Sign in again to ${row.label}`)
          .flex_none()
          .text_size(11)
          .text_color(t.accent)
          .cursor_pointer()
          .hover((s) => s.underline())
          .on_click((_event, cx) => {
            cx.stop_propagation();
            openConnect(view, { provider: row.provider, account: row.id });
          })
          .child(row.note.text),
      ),
    );
}

// One side of the numbers line: `5-hour 62% · 1h 48m`, the first part in its
// level's colour, the separators in `dim`.
function numbers({ word, parts, level }, t) {
  const [first, ...rest] = parts;
  return h_flex()
    .min_w(0)
    .gap(4)
    .items_baseline()
    .when(word !== null, (el) => el.child(div().mr(1).child(word)))
    .child(div().text_color(levelText(level, t)).child(first))
    .children(
      rest.flatMap((part) => [
        div().text_color(t.dim).child("·"),
        div().child(part),
      ]),
    );
}

function numbersLine(left, right, t) {
  return h_flex()
    .h(14)
    .mt(6)
    .gap(8)
    .items_center()
    .justify_between()
    .text_size(11)
    .text_color(t.muted)
    .whitespace_nowrap()
    .when(left !== null, (el) => el.child(numbers(left, t)))
    .when(right !== null, (el) => el.child(numbers(right, t)));
}

// Fits a block given `props.fit` to its first two accounts; with none, to
// what its content measures (`content`, null when that did not change).
function fit(view, content) {
  if (view.readings.length > 0) {
    fitTo(view, listNeeds(view.readings, view.now));
  } else if (content !== null) {
    fitTo(view, LINE + HEADER + content);
  }
}

function account(reading, index, view) {
  const t = view.theme;
  const row = listRowOf(reading, view.now, view.size?.width ?? null);
  const id = `account-${index}`;
  return (
    v_flex()
      .id(id)
      .role("button")
      .accessibility_label(row.spoken)
      .flex_none()
      .px(8)
      .pb(9)
      .rounded(8)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => openAccount(view, reading.id))
      // A reorder can change the first two accounts without changing how tall
      // all of them are together.
      .when(Boolean(view.props.fit) && index < 2, (el) =>
        el.on_size_change(() => fit(view, null)),
      )
      .child(labelLine(row, index, view))
      .when(row.ended !== null, (el) =>
        el.child(
          div()
            .h(14)
            .text_size(11)
            .text_color(t.muted)
            .whitespace_nowrap()
            .child(row.ended),
        ),
      )
      .when(row.pair !== null, (el) =>
        el.child(
          pair(
            {
              id,
              full: row.pair.full,
              short: row.pair.short,
              dimmed: row.dimmed,
            },
            t,
          ),
        ),
      )
      .when(row.numbers !== null, (el) =>
        el.child(numbersLine(row.numbers.left, row.numbers.right, t)),
      )
  );
}

export function render(view, cx) {
  const t = view.theme;
  return v_flex()
    .id("list")
    .size_full()
    .min_h(0)
    .bg(t.chrome)
    .border_t(1)
    .border_color(t.border)
    .child(header(view))
    .child(
      v_flex()
        .id("accounts")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .child(
          v_flex()
            .id("accounts-content")
            .flex_none()
            .w_full()
            .px(8)
            .pb(8)
            .when(Boolean(view.props.fit), (el) =>
              el.on_size_change((size) => fit(view, size.height)),
            )
            .when(view.readings.length === 0, (el) => el.child(empty(view)))
            .children(
              view.readings.map((reading, index) =>
                account(reading, index, view),
              ),
            ),
        ),
    );
}
