// The account view: one account alone, in a 380 px popup opened by a click on
// it in the list, the rail or the strip. Its header (mark, label, plan, the
// age of its reading and its own refresh control, then its email and
// organization), every window the plan has, each with its name over its bar
// and one quiet line of numbers under it, the line about the pace mark and
// when its login ends; its last row opens the detail view. When its account
// is no longer connected it closes itself.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { accountOf, accountViewOf } from "../logic/account.js";
import { open as openDetail } from "./detail.js";
import { bar, levelText, mark, pair, spinner } from "./kit.js";

const CHEVRON = "mods/workspace-chrome/chevron-right.svg";
const REFRESH = "mods/headroom/icons/refresh.svg";
const PACE_LINE = "The line on a bar marks how much of its time has passed.";

// The tracks of windows not read yet.
const EMPTY = { fraction: 0, level: "normal", pace: null };

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

/** Reads this account now; the control is Herdr's spinner until it is done. */
export function refresh(view, cx) {
  const state = (view.ui.account ??= {});
  const reading = accountOf(view);
  if (state.refreshing || reading === null) return;
  state.refreshing = true;
  const read = view.store.refresh(reading.id);
  cx.notify();
  cx.spawn(async (cx) => {
    try {
      await read;
    } finally {
      state.refreshing = false;
      cx.notify();
    }
  });
}

// The mark, the label and the plan on one 26 px line; on the right the age
// of the reading and the refresh control.
function header(reading, shown, view) {
  const t = view.theme;
  const turning = view.ui.account?.refreshing === true || shown.empty;
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
        .flex_1()
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
            .text_color(shown.state === "signed-out" ? t.muted : t.foreground)
            .child(reading.label),
        )
        .when(shown.plan !== null, (el) =>
          el.child(
            div()
              .flex_none()
              .text_size(12)
              .text_color(t.muted)
              .child(shown.plan),
          ),
        ),
    )
    .when(shown.age !== null, (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(11.5)
          .text_color(t.muted)
          .whitespace_nowrap()
          .child(shown.age),
      ),
    )
    .child(
      div()
        .id("refresh")
        .role("button")
        .accessibility_label("Refresh")
        .tooltip("Refresh")
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click((_event, cx) => refresh(view, cx))
        .child(
          turning
            ? spinner(14, t)
            : svg(REFRESH).size(14).flex_none().text_color(t.muted),
        ),
    );
}

// `maxi@terac.example · Terac`, under the label.
function whoLine(who, t) {
  return h_flex()
    .flex_none()
    .h(16)
    .mt(1)
    .pl(40)
    .pr(16)
    .gap(4)
    .items_center()
    .text_size(11.5)
    .text_color(t.muted)
    .children(
      who.flatMap((part, i) => [
        ...(i > 0 ? [div().flex_none().text_color(t.dim).child("·")] : []),
        div().min_w(0).truncate().child(part),
      ]),
    );
}

// One window: its name, its bar at the full width, then the percentage and
// the time to its reset on the left and the reset's clock time on the right.
function windowView(window, k, dimmed, t) {
  return v_flex()
    .flex_none()
    .mt(13)
    .child(
      div()
        .h(16)
        .min_w(0)
        .truncate()
        .text_size(12)
        .text_color(t.foreground)
        .child(window.name),
    )
    .child(
      div()
        .mt(6)
        .child(
          bar(
            {
              id: `window-${k}`,
              ...window.bar,
              thin: window.thin,
              dimmed,
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
              div()
                .flex_none()
                .text_color(levelText(window.level, t))
                .child(window.percent),
            )
            .when(window.reset !== null, (el) =>
              el
                .child(div().flex_none().text_color(t.dim).child("·"))
                .child(div().min_w(0).truncate().child(window.reset)),
            ),
        )
        .when(window.clock !== null, (el) =>
          el.child(div().flex_none().child(window.clock)),
        ),
    );
}

// The first read's pair of empty tracks, no names and no numbers.
function firstTracks(t) {
  return div()
    .flex_none()
    .mt(16)
    .child(
      pair(
        {
          id: "first",
          full: EMPTY,
          short: EMPTY,
          heights: [6, 3],
          gap: 6,
          ground: t.popover,
        },
        t,
      ),
    );
}

// What the line on a bar is, led by a drawn key: a bar with its tick at its
// middle. It wraps rather than lose words at a narrow width.
function paceLine(t) {
  return h_flex()
    .flex_none()
    .mt(14)
    .gap(8)
    .items_start()
    .text_size(11.5)
    .text_color(t.muted)
    .child(
      h_flex()
        .h(16)
        .w(18)
        .flex_none()
        .items_center()
        .child(
          bar(
            { id: "pace-key", fraction: 0.5, pace: 0.5, ground: t.popover },
            t,
          ),
        ),
    )
    .child(div().flex_1().min_w(0).line_height("16px").child(PACE_LINE));
}

// `Login ends Dec 5`; `Login ends in 2 days` in the high colour in its last
// 3 days; `Login ended Nov 9` for an account that must sign in again.
function loginLine(login, t) {
  return div()
    .flex_none()
    .mt(12)
    .h(16)
    .min_w(0)
    .truncate()
    .text_size(11.5)
    .text_color(login.warning ? levelText("high", t) : t.muted)
    .child(login.text);
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
  const account = view.store
    .accounts()
    .find((entry) => entry.id === reading.id);
  const shown = accountViewOf(reading, account, view.now);
  return ground
    .text_size(13)
    .child(header(reading, shown, view))
    .when(shown.who.length > 0, (el) => el.child(whoLine(shown.who, t)))
    .child(
      v_flex()
        .id("account-windows")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .px(16)
        .pb(15)
        .children(
          shown.windows.map((window, k) =>
            windowView(window, k, shown.dimmed, t),
          ),
        )
        .when(shown.empty, (el) => el.child(firstTracks(t)))
        .when(shown.paced, (el) => el.child(paceLine(t)))
        .when(shown.login !== null, (el) =>
          el.child(loginLine(shown.login, t)),
        ),
    )
    .child(detailRow(view));
}

export function command(_name, _view, _cx) {}
export function startRename(_view, _cx) {}
export function renameInput(_view) {
  return null;
}
export function submitRename(_view) {}
export function cancelRename(_view) {}
export function signInAgain(_view) {}
export function askRemove(_view) {}
