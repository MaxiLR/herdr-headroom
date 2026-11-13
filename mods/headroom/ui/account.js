// The account view: one account alone, in a 380 px popup opened by a click on
// it in the list, the rail, the strip or the detail view. Its header (mark,
// label, plan, the age of its reading and its own refresh control, then its
// email and organization), every window the plan has, each with its name over
// its bar and one quiet line of numbers under it, the line about the pace mark
// and when its login ends; then the account's own actions (Rename, Sign in
// again, Remove), and its last row opens the detail view. When its account is
// no longer connected it closes itself.
import { div, svg } from "gpui-kit";
import { Input, InputState, h_flex, v_flex } from "gpui-base";
import {
  accountHeight,
  accountOf,
  accountViewOf,
  removeQuestion,
} from "../logic/account.js";
import { open as openConnect } from "./connect.js";
import { open as openDetail } from "./detail.js";
import { bar, levelText, mark, pair, spinner } from "./kit.js";

const CHEVRON = "mods/workspace-chrome/chevron-right.svg";
const REFRESH = "mods/headroom/icons/refresh.svg";
const PACE_LINE = "The line on a bar marks how much of its time has passed.";

// The tracks of windows not read yet.
const EMPTY = { fraction: 0, level: "normal", pace: null };

// The account a Remove is waiting on Herdr's confirm dialog for, or null.
// Herdr hands the confirmed command to the shown copies of the mod, not to
// the one that asked, and maybe to several; module code is shared by every
// copy, so whichever copy hears it first takes the account, once.
let pending = null;

// This copy's view, plain data: `renaming` while the label is its field,
// `refreshing` while this account is read, `closed` once the popup is asked
// to close.
function stateOf(view) {
  return (view.ui.account ??= {});
}

// What is not plain data: the rename's field and the account it is for.
function liveOf(view) {
  return (view.ui.accountLive ??= { input: null, id: null, focused: false });
}

/**
 * A newly opened account view: a Remove left unanswered asks nothing any
 * more; the field of a rename given as data is made; a view of an account no
 * longer connected closes. Nothing in a copy that is not an account view.
 */
export function init(view, cx) {
  if (view.form !== "account") return;
  pending = null;
  if (accountOf(view) === null) closeOnce(view);
  else if (stateOf(view).renaming && renameInput(view) === null) {
    startRename(view, cx);
  }
}

/** A `headroom.<name>` command: `remove` removes the account waiting for it. */
export function command(name, view, _cx) {
  if (name !== "remove" || pending === null) return;
  const id = pending;
  pending = null;
  view.store.remove(id);
}

/** Rename: the label in the header becomes its field, its text selected. */
export function startRename(view, _cx) {
  const reading = accountOf(view);
  if (reading === null) return;
  const live = liveOf(view);
  if (renameInput(view) !== null) {
    live.input.focus();
    return;
  }
  const input = InputState.new({ value: reading.label });
  input.set_selected_range({ start: 0, end: reading.label.length });
  input.on("submit", (_event, cx) => {
    submitRename(view);
    cx.notify();
  });
  input.on("focus", (_event, cx) => {
    live.focused = true;
    cx.notify();
  });
  input.on("blur", (_event, cx) => {
    live.focused = false;
    cx.notify();
  });
  live.input = input;
  live.id = reading.id;
  live.focused = true;
  stateOf(view).renaming = true;
  input.focus();
}

/** The label's field while this account is renamed, else null. */
export function renameInput(view) {
  const live = liveOf(view);
  if (!stateOf(view).renaming || live.id !== view.props.account) return null;
  return live.input;
}

/** Enter in the field: the account takes the field's text as its label. */
export function submitRename(view) {
  const input = renameInput(view);
  if (input === null) return;
  const id = liveOf(view).id;
  const text = input.value();
  endRename(view);
  view.store.rename(id, text);
}

/** Esc in the field: the label stays as it was. */
export function cancelRename(view) {
  endRename(view);
}

function endRename(view) {
  const live = liveOf(view);
  live.input = null;
  live.id = null;
  live.focused = false;
  stateOf(view).renaming = false;
}

/** Sign in again: the connect dialog, this account's provider chosen. */
export function signInAgain(view) {
  const reading = accountOf(view);
  if (reading === null) return;
  openConnect(view, { provider: reading.provider, account: reading.id });
}

/**
 * Remove asks first, with Herdr's own confirm dialog; the dialog's command
 * comes back to `command` once confirmed.
 */
export function askRemove(view) {
  const reading = accountOf(view);
  if (reading === null) return;
  pending = reading.id;
  view.host.openOverlay({
    mod: "confirm",
    kind: "dialog",
    props: {
      ...removeQuestion(reading.label),
      command: { name: "headroom.remove" },
    },
  });
}

// Closes the popup, once; a pane or a block has no overlay to close.
function closeOnce(view) {
  const state = stateOf(view);
  if (state.closed || !view.props.overlay) return;
  state.closed = true;
  view.host.closeOverlay(view.props.overlay);
}

/** Reads this account now; the control is Herdr's spinner until it is done. */
export function refresh(view, cx) {
  const state = stateOf(view);
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

// The mark, the label and the plan on one 26 px line (while renamed, the
// label's field and no plan); on the right the age of the reading and the
// refresh control.
function header(reading, shown, view) {
  const t = view.theme;
  const turning = view.ui.account?.refreshing === true || shown.empty;
  const input = renameInput(view);
  return h_flex()
    .h(26)
    .mt(12)
    .ml(16)
    .mr(10)
    .flex_none()
    .gap(8)
    .items_center()
    .child(mark(reading.provider, 16, t))
    .child(
      input !== null
        ? renameField(reading, input, view)
        : title(reading, shown, t),
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

// The label and the plan, on one baseline.
function title(reading, shown, t) {
  return h_flex()
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
        div().flex_none().text_size(12).text_color(t.muted).child(shown.plan),
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

// The label's field: Enter renames, Esc leaves the label as it was.
function renameField(reading, input, view) {
  const t = view.theme;
  return div()
    .flex_1()
    .min_w(0)
    .on_key_down((event, cx) => {
      if (event.key !== "escape") return;
      cancelRename(view);
      cx.stop_propagation();
      cx.notify();
    })
    .child(
      Input.new(input)
        .accessibility_label(`Name of ${reading.label}`)
        .h(24)
        .px(6)
        .rounded(6)
        .border_1()
        .border_color(liveOf(view).focused ? t.accent : t.input)
        .bg(t.background)
        .text_size(13)
        .text_color(t.foreground),
    );
}

// The account's own actions, one row of buttons that may wrap: Rename, Sign
// in again (the solid one for an account that must sign in again) and
// Remove, set apart at the right in the critical text colour.
function actions(shown, view) {
  const t = view.theme;
  const signedOut = shown.state === "signed-out";
  return h_flex()
    .id("account-actions")
    .flex_none()
    .flex_wrap()
    .px(16)
    .py(12)
    .gap(8)
    .items_center()
    .border_t(1)
    .border_color(t.border)
    .child(
      action("rename", "Rename", t).on_click((_event, cx) => {
        startRename(view, cx);
        cx.notify();
      }),
    )
    .child(
      action("sign-in", "Sign in again", t, { solid: signedOut }).on_click(() =>
        signInAgain(view),
      ),
    )
    .child(
      action("remove", "Remove", t, { color: levelText("critical", t) })
        .ml_auto()
        .on_click(() => askRemove(view)),
    );
}

// A 30 px button, as Connect account is in the detail view, its text in
// `color`; `solid` makes it the one thing to do.
function action(id, text, t, { solid = false, color = t.foreground } = {}) {
  return div()
    .id(id)
    .role("button")
    .flex_none()
    .h(30)
    .px(12)
    .flex()
    .items_center()
    .rounded(8)
    .border_1()
    .border_color(solid ? t.solid : t.input)
    .bg(solid ? t.solid : t.raised)
    .text_size(12.5)
    .font_medium()
    .text_color(solid ? t.solid_foreground : color)
    .whitespace_nowrap()
    .cursor_pointer()
    .hover((s) => (solid ? s.opacity(0.88) : s.bg(t.selected)))
    .child(text);
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
  const reading = accountOf(view);
  const account =
    reading === null
      ? undefined
      : view.store.accounts().find((entry) => entry.id === reading.id);
  // As a popup the root is as tall as its opener asked Herdr for: Herdr sizes
  // a popup to its content. As a pane or a block it fills its place.
  const root = v_flex().id("account-view");
  const ground = (
    view.props.overlay
      ? root.w_full().h(accountHeight(reading, account))
      : root.size_full()
  )
    .min_h(0)
    .bg(t.popover);
  // The account went away after the view opened: this draw is the first
  // code to see it.
  if (reading === null) {
    closeOnce(view);
    return ground;
  }
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
    .child(actions(shown, view))
    .child(detailRow(view));
}
