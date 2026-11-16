// The account view: one account alone, in a 380 px popup opened by a click on
// it in the list, the rail, the strip or the detail view. Its header (mark,
// label, plan, the age of its reading and its own refresh control, then its
// email and organization), every window the plan has, each with its name over
// its bar and one quiet line of numbers under it, the line about the pace mark
// and when its login ends; then the account's own actions (Rename, Sign in
// again, Remove), and its last row opens the detail view. As a popup it closes
// itself before it opens another view, and when its account is no longer
// connected.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import {
  accountHeight,
  accountOf,
  accountViewOf,
  openRemove,
} from "../logic/account.js";
import { canCut } from "../logic/cut.js";
import { textWidth } from "../logic/strip.js";
import { open as openConnect } from "./connect.js";
import { open as openDetail } from "./detail.js";
import { labelField, labelInput } from "./field.js";
import {
  bar,
  levelText,
  mark,
  pair,
  pressedGround,
  pressedSolid,
  pressedStep,
  spinner,
} from "./kit.js";

const CHEVRON = "mods/workspace-chrome/chevron-right.svg";
const REFRESH = "mods/headroom/icons/refresh.svg";
const PACE_LINE = "The line on a bar marks how much of its time has passed.";

/** The popup's width, and the width drawn before the first layout. */
const WIDTH = 380;
// The header's sides, its mark, its gaps and its refresh control; the font
// sizes of the label, the plan and the age.
const HEADER = { left: 16, right: 10, mark: 16, gap: 8, refresh: 26 };
const LABEL = 14;
const PLAN = 12;
const AGE = 11.5;
// The email line's sides and font size, and what sits between its parts.
const WHO = { left: 40, right: 16, size: 11.5, gap: 4 };
const WHO_BETWEEN = 2 * WHO.gap + textWidth("·", WHO.size);
// The windows' sides and the font size of their names.
const SIDES = 16;
const NAME = 12;

// The tracks of windows not read yet.
const EMPTY = { fraction: 0, level: "normal", pace: null };

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
 * A newly opened account view: the field of a rename given as data is made;
 * a view of an account no longer connected closes. Nothing in a copy that is
 * not an account view.
 */
export function init(view, cx) {
  if (view.form !== "account") return;
  if (accountOf(view) === null) closeOnce(view);
  else if (stateOf(view).renaming && renameInput(view) === null) {
    startRename(view, cx);
  }
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
  const input = labelInput(reading.label, {
    submit: () => submitRename(view),
    focus: (focused) => {
      live.focused = focused;
    },
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

/**
 * Sign in again: the popup closes, then the connect dialog opens with this
 * account's provider chosen.
 */
export function signInAgain(view) {
  const reading = accountOf(view);
  if (reading === null) return;
  closeOnce(view);
  openConnect(view, { provider: reading.provider, account: reading.id });
}

/**
 * Remove asks first, with the mod's own dialog over this view; the dialog
 * removes the account, and this view closes once it is gone.
 */
export function askRemove(view) {
  const reading = accountOf(view);
  if (reading === null) return;
  openRemove(view, reading.id);
}

// Closes the popup, once; a pane or a block has no overlay to close.
function closeOnce(view) {
  const state = stateOf(view);
  if (state.closed || !view.props.overlay) return;
  state.closed = true;
  view.host.closeOverlay(view.props.overlay);
}

/**
 * Reads this account now; while a read runs the control is Herdr's spinner
 * until it is done. A refresh the store skips (a read started less than 30 s
 * ago) changes nothing.
 */
export function refresh(view, cx) {
  const state = stateOf(view);
  const reading = accountOf(view);
  if (state.refreshing || reading === null) return;
  const read = view.store.refresh(reading.id);
  if (!read.started) return;
  state.refreshing = true;
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
    .ml(HEADER.left)
    .mr(HEADER.right)
    .flex_none()
    .gap(HEADER.gap)
    .items_center()
    .child(mark(reading.provider, HEADER.mark, t))
    .child(
      input !== null
        ? renameField(reading, input, view)
        : title(reading, shown, titlePlace(shown, view), t),
    )
    .when(shown.age !== null, (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(AGE)
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
        .size(HEADER.refresh)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .active(pressedGround(t))
        .on_click((_event, cx) => refresh(view, cx))
        .child(
          turning
            ? spinner(14, t)
            : svg(REFRESH).size(14).flex_none().text_color(t.muted),
        ),
    );
}

// The px the title has in the header: the view's width less the header's
// sides, its mark, the age and the refresh control, and the gaps between them.
function titlePlace(shown, view) {
  const age = shown.age === null ? 0 : HEADER.gap + textWidth(shown.age, AGE);
  return (
    (view.size?.width ?? WIDTH) -
    HEADER.left -
    HEADER.right -
    HEADER.mark -
    HEADER.gap -
    age -
    HEADER.gap -
    HEADER.refresh
  );
}

// The label and the plan, on one baseline, in a title `place` px wide. The
// plan is cut before the label is: the label has the place less the gap
// before the plan, the plan what the label leaves. Each that can be cut
// carries its whole text as a tooltip.
function title(reading, shown, place, t) {
  const label = reading.label;
  const labelPlace = place - (shown.plan === null ? 0 : HEADER.gap);
  const planPlace = labelPlace - textWidth(label, LABEL);
  return h_flex()
    .flex_1()
    .min_w(0)
    .gap(HEADER.gap)
    .items_baseline()
    .child(
      div()
        .min_w(0)
        .truncate()
        .role("heading")
        .text_size(LABEL)
        .font_semibold()
        .text_color(shown.state === "signed-out" ? t.muted : t.foreground)
        .when(canCut(label, LABEL, labelPlace), (el) => el.tooltip(label))
        .child(label),
    )
    .when(shown.plan !== null, (el) =>
      el.child(
        div()
          .min_w(0)
          .flex_shrink(1000)
          .truncate()
          .text_size(PLAN)
          .text_color(t.muted)
          .when(canCut(shown.plan, PLAN, planPlace), (el) =>
            el.tooltip(shown.plan),
          )
          .child(shown.plan),
      ),
    );
}

// `maxi@terac.example · Terac`, under the label, in a view `width` px wide.
// The parts give way together: each has the line less the others and what
// sits between them, and carries its whole text as a tooltip when that can
// cut it.
function whoLine(who, width, t) {
  const line = width - WHO.left - WHO.right - WHO_BETWEEN * (who.length - 1);
  const all = who.reduce((sum, part) => sum + textWidth(part, WHO.size), 0);
  return h_flex()
    .flex_none()
    .h(16)
    .mt(1)
    .pl(WHO.left)
    .pr(WHO.right)
    .gap(WHO.gap)
    .items_center()
    .text_size(WHO.size)
    .text_color(t.muted)
    .children(
      who.flatMap((part, i) => {
        const place = line - (all - textWidth(part, WHO.size));
        return [
          ...(i > 0 ? [div().flex_none().text_color(t.dim).child("·")] : []),
          div()
            .min_w(0)
            .truncate()
            .when(canCut(part, WHO.size, place), (el) => el.tooltip(part))
            .child(part),
        ];
      }),
    );
}

// One window: its name, its bar at the full width, then the percentage and
// the time to its reset on the left and the reset's clock time on the right.
// A name that can be cut in a view `width` px wide carries its whole text as
// a tooltip.
function windowView(window, k, dimmed, width, t) {
  return v_flex()
    .flex_none()
    .mt(13)
    .child(
      div()
        .h(16)
        .min_w(0)
        .truncate()
        .text_size(NAME)
        .text_color(t.foreground)
        .when(canCut(window.name, NAME, width - 2 * SIDES), (el) =>
          el.tooltip(window.name),
        )
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
  return labelField(
    input,
    {
      label: reading.label,
      focused: liveOf(view).focused,
      cancel: () => cancelRename(view),
    },
    view.theme,
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
    .active(solid ? pressedSolid() : pressedStep(t))
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
    .active(pressedGround(t))
    .on_click(() => {
      closeOnce(view);
      openDetail(view);
    })
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
  const width = view.size?.width ?? WIDTH;
  return ground
    .text_size(13)
    .child(header(reading, shown, view))
    .when(shown.who.length > 0, (el) => el.child(whoLine(shown.who, width, t)))
    .child(
      v_flex()
        .id("account-windows")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .px(SIDES)
        .pb(15)
        .children(
          shown.windows.map((window, k) =>
            windowView(window, k, shown.dimmed, width, t),
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
