// The detail view: every window of every account, when each resets and when
// a login ends; a click on an account opens its account view; the refresh
// control, the notifications switch and Connect account. A 380 px popup from the list's header and from the account view's
// last row; also a dialog or a pane, where from 520 px each window is one
// line.
import { div, svg } from "gpui-kit";
import { Switch, h_flex, v_flex } from "gpui-base";
import { openAccount } from "../logic/account.js";
import {
  ageText,
  arrowsOf,
  clockText,
  moveAccount,
  openHeight,
  windowsInOrder,
} from "../logic/detail.js";
import { levelOf } from "../logic/levels.js";
import { untilReset } from "../logic/pace.js";
import { setNotify } from "../logic/publish.js";
import { barOf, isThin, rowOf } from "../logic/rows.js";
import {
  failedText,
  loginText,
  percentText,
  shortDate,
} from "../logic/words.js";
import { open as openConnect } from "./connect.js";
import { bar, levelText, mark, spinner } from "./kit.js";

const REFRESH = "mods/headroom/icons/refresh.svg";
const ARROW_UP = "mods/headroom/icons/arrow-up.svg";
const ARROW_DOWN = "mods/headroom/icons/arrow-down.svg";
const PLUS = "mods/workspace-chrome/plus.svg";

/** The popup's width, and the width drawn before the first layout. */
const WIDTH = 380;
/** From this width each window is one line. */
const WIDE_PX = 520;
/** Below this width the reset's clock time is dropped. */
const NARROW_PX = 340;

const NOTIFY = "Notify at 90% and at the limit";

// The switch's knob slides across natively.
const SLIDE = { duration: 160, easing: "ease-out" };

export function open(view) {
  view.host.openOverlay({
    mod: "headroom",
    kind: "popup",
    width: WIDTH,
    height: openHeight(view.readings, view.store.accounts()),
    props: { form: "detail" },
  });
}

// Reads every account now; the control is Herdr's spinner until it is done.
function refresh(view, cx) {
  const state = (view.ui.detail ??= {});
  if (state.refreshing) return;
  state.refreshing = true;
  cx.notify();
  cx.spawn(async (cx) => {
    try {
      await view.store.refresh();
    } finally {
      state.refreshing = false;
      cx.notify();
    }
  });
}

function header(view) {
  const t = view.theme;
  const age = ageText(view.readings, view.now);
  const refreshing = view.ui.detail?.refreshing === true;
  return h_flex()
    .h(46)
    .flex_none()
    .pl(16)
    .pr(10)
    .gap(6)
    .items_center()
    .child(
      div()
        .flex_1()
        .min_w(0)
        .role("heading")
        .text_size(14)
        .font_semibold()
        .text_color(t.foreground)
        .child("Limits"),
    )
    .when(age !== null, (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(11.5)
          .text_color(t.muted)
          .whitespace_nowrap()
          .child(age),
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
          refreshing
            ? spinner(14, t)
            : svg(REFRESH).size(14).flex_none().text_color(t.muted),
        ),
    );
}

// The account's first line: the mark, the label, the plan and, on the right,
// why the last read failed or the Sign in again control, then its up and
// down arrows.
function labelLine(reading, row, index, view) {
  const t = view.theme;
  const signedOut = row.state === "signed-out";
  const arrows = arrowsOf(view.readings, reading.id);
  return h_flex()
    .h(24)
    .gap(8)
    .items_center()
    .child(mark(reading.provider, 16))
    .child(
      div()
        .min_w(0)
        .truncate()
        .text_size(13)
        .font_medium()
        .text_color(signedOut ? t.muted : t.foreground)
        .child(reading.label),
    )
    .when(Boolean(reading.plan), (el) =>
      el.child(
        div().flex_none().text_size(12).text_color(t.muted).child(reading.plan),
      ),
    )
    .child(div().flex_1())
    .when(row.state === "failed", (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(11.5)
          .text_color(t.muted)
          .whitespace_nowrap()
          .child(failedText(reading, view.now)),
      ),
    )
    .when(signedOut, (el) =>
      el.child(
        div()
          .id(`account-${index}-sign-in`)
          .role("button")
          .accessibility_label(`Sign in again to ${reading.label}`)
          .flex_none()
          .text_size(12)
          .text_color(t.accent)
          .cursor_pointer()
          .hover((s) => s.underline())
          .on_click((_event, cx) => {
            cx.stop_propagation();
            openConnect(view, {
              provider: reading.provider,
              account: reading.id,
            });
          })
          .child("Sign in again"),
      ),
    )
    .when(arrows !== null, (el) =>
      el.child(
        h_flex()
          .flex_none()
          .gap(2)
          .items_center()
          .child(arrow(reading, index, -1, arrows?.up, view))
          .child(arrow(reading, index, 1, arrows?.down, view)),
      ),
    );
}

// The account's up (`delta` -1) or down (1) arrow; dimmed, and doing
// nothing, when the account cannot move that way. Neither lets the click
// reach the account: a dimmed one is disabled, so its own click never runs,
// and it stops the press instead.
function arrow(reading, index, delta, enabled, view) {
  const t = view.theme;
  const up = delta < 0;
  const name = up ? "Move up" : "Move down";
  return div()
    .id(`account-${index}-${up ? "up" : "down"}`)
    .role("button")
    .accessibility_label(name)
    .tooltip(name)
    .disabled(!enabled)
    .size(22)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .when(enabled, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)))
    .when(!enabled, (el) =>
      el
        .opacity(0.35)
        .on_mouse_down("left", (_event, cx) => cx.stop_propagation()),
    )
    .on_click((_event, cx) => {
      cx.stop_propagation();
      moveAccount(view, reading.id, delta);
    })
    .child(
      svg(up ? ARROW_UP : ARROW_DOWN)
        .size(14)
        .flex_none()
        .text_color(t.muted),
    );
}

// `maxi@terac.example · Terac`, under the label.
function whoLine(account, t) {
  const parts = [account?.email, account?.organization].filter(Boolean);
  if (parts.length === 0) return null;
  return h_flex()
    .h(16)
    .mt(1)
    .pl(24)
    .gap(4)
    .items_center()
    .text_size(11.5)
    .text_color(t.muted)
    .children(
      parts.flatMap((part, i) => [
        ...(i > 0 ? [div().flex_none().text_color(t.dim).child("·")] : []),
        div().min_w(0).truncate().child(part),
      ]),
    );
}

// One window: its name, percentage, reset and clock time, and its bar.
function windowView(window, id, view, { dimmed, wide, narrow }) {
  const t = view.theme;
  const level = levelOf(window);
  const { fraction, pace } = barOf(window, view.now);
  const left = untilReset(window, view.now);
  const percent = level === "limit" ? "At limit" : percentText(window);
  const reset = left === null ? "not started" : `resets in ${left}`;
  const clock =
    left === null || narrow ? null : clockText(window.resetsAt, view.now);
  const track = bar(
    {
      id,
      fraction,
      level,
      pace,
      thin: isThin(window),
      dimmed,
      ground: t.popover,
    },
    t,
  );
  const name = div()
    .min_w(0)
    .truncate()
    .text_color(t.muted)
    .child(window.label);
  const number = div()
    .flex_none()
    .text_color(levelText(level, t))
    .whitespace_nowrap()
    .child(percent);
  const resets = div()
    .flex_none()
    .text_size(11.5)
    .text_color(t.muted)
    .whitespace_nowrap()
    .child(reset);
  const time = div()
    .flex_none()
    .text_size(11.5)
    .text_color(t.muted)
    .whitespace_nowrap();

  if (wide) {
    return h_flex()
      .mt(9)
      .h(16)
      .gap(14)
      .items_center()
      .text_size(12)
      .child(name.w(120).flex_none())
      .child(div().flex_1().min_w(0).child(track))
      .child(number.w(56).text_right())
      .child(resets.w(104))
      .child(
        time
          .w(66)
          .text_right()
          .when(clock !== null, (el) => el.child(clock)),
      );
  }
  return v_flex()
    .mt(11)
    .child(
      h_flex()
        .h(16)
        .mb(6)
        .gap(8)
        .items_center()
        .text_size(12)
        .child(name.flex_1())
        .child(number)
        .child(resets)
        .when(clock !== null, (el) => el.child(time.child(clock))),
    )
    .child(track);
}

// `Login ends Dec 5`, in the high colour in its last 3 days; `Login ended
// Nov 9` for an account that must sign in again; nothing before the first
// read, which draws the account's header lines only.
function loginLine(reading, row, view) {
  const t = view.theme;
  const text =
    row.state === "signed-out"
      ? loginText(reading, view.now)
      : row.state !== "first" && reading.loginEndsAt != null
        ? `Login ends ${shortDate(reading.loginEndsAt)}`
        : null;
  if (text === null) return null;
  return div()
    .mt(12)
    .h(16)
    .text_size(11.5)
    .text_color(row.loginWarning ? levelText("high", t) : t.muted)
    .child(text);
}

function section(reading, index, account, view) {
  const t = view.theme;
  const row = rowOf(reading, view.now);
  const width = view.size?.width ?? WIDTH;
  const layout = {
    dimmed: row.state === "failed",
    wide: width >= WIDE_PX,
    narrow: width < NARROW_PX,
  };
  const windows =
    row.state === "signed-out" ? [] : windowsInOrder(reading.windows);
  const who = whoLine(account, t);
  const login = loginLine(reading, row, view);
  return v_flex()
    .id(`account-${index}`)
    .flex_none()
    .pt(11)
    .pb(13)
    .px(16)
    .border_t(1)
    .border_color(t.border)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click(() => openAccount(view, reading.id))
    .child(labelLine(reading, row, index, view))
    .when(who !== null, (el) => el.child(who))
    .children(
      windows.map((window, k) =>
        windowView(window, `account-${index}-window-${k}`, view, layout),
      ),
    )
    .when(login !== null, (el) => el.child(login));
}

function empty(t) {
  return v_flex()
    .flex_none()
    .px(16)
    .pt(14)
    .pb(18)
    .gap(4)
    .border_t(1)
    .border_color(t.border)
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
    );
}

function notifySwitch(view) {
  const t = view.theme;
  const on = view.notify;
  return Switch.new("notify")
    .checked(on)
    .accessibility_label(NOTIFY)
    .relative()
    .flex_none()
    .w(30)
    .h(18)
    .rounded(9)
    .bg(on ? t.accent : t.input)
    .cursor_pointer()
    .on_change((checked, cx) => {
      setNotify(view.host, checked);
      cx.notify();
    })
    .child(
      div()
        .absolute()
        .top(2)
        .left(on ? 14 : 2)
        .size(14)
        .rounded_full()
        .bg(on ? t.accent_foreground : t.muted)
        .transition("left", SLIDE),
    );
}

function footer(view) {
  const t = view.theme;
  return h_flex()
    .flex_none()
    .flex_wrap()
    .px(16)
    .py(12)
    .gap(10)
    .items_center()
    .border_t(1)
    .border_color(t.border)
    .child(notifySwitch(view))
    .child(
      div()
        .flex_1()
        .min_w(120)
        .text_size(12)
        .line_height(1.35)
        .text_color(t.muted)
        .child(NOTIFY),
    )
    .child(
      h_flex()
        .id("connect-account")
        .role("button")
        .flex_none()
        .h(30)
        .pl(9)
        .pr(12)
        .gap(6)
        .items_center()
        .rounded(8)
        .border_1()
        .border_color(t.input)
        .bg(t.raised)
        .text_size(12.5)
        .font_medium()
        .text_color(t.foreground)
        .cursor_pointer()
        .hover((s) => s.bg(t.selected))
        .on_click(() => openConnect(view, {}))
        .child(svg(PLUS).size(14).flex_none().text_color(t.muted))
        .child("Connect account"),
    );
}

export function render(view, cx) {
  const t = view.theme;
  const accounts = view.store.accounts();
  return v_flex()
    .size_full()
    .min_h(0)
    .bg(t.popover)
    .text_size(13)
    .child(header(view))
    .child(
      v_flex()
        .id("detail-accounts")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .when(view.readings.length === 0, (el) => el.child(empty(t)))
        .children(
          view.readings.map((reading, index) =>
            section(
              reading,
              index,
              accounts.find((account) => account.id === reading.id),
              view,
            ),
          ),
        ),
    )
    .child(footer(view));
}
