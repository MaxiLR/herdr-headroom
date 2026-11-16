// The detail view: every window of every account, when each resets and when
// a login ends; a click on an account opens its account view; the refresh
// control, the notifications switch, Show in status bar (when the layout has
// the strip's block) and Connect account. A 380 px popup from
// the list's header and from the account view's last row; also a dialog or a
// pane, where from 520 px each window is one line. As a popup it closes itself
// before it opens another view.
import { div, svg } from "gpui-kit";
import { Switch, h_flex, v_flex } from "gpui-base";
import { accountViewOf, openAccount, openRemove } from "../logic/account.js";
import { canCut } from "../logic/cut.js";
import {
  ageText,
  arrowsOf,
  clockText,
  moveAccount,
  openHeight,
  windowsInOrder,
} from "../logic/detail.js";
import { levelOf } from "../logic/levels.js";
import { listRowOf } from "../logic/list.js";
import { untilReset } from "../logic/pace.js";
import { setNotify } from "../logic/publish.js";
import { barOf, isThin, rowOf } from "../logic/rows.js";
import { STRIP_BLOCK, stripBlock, textWidth } from "../logic/strip.js";
import { failedText, percentText } from "../logic/words.js";
import { open as openConnect } from "./connect.js";
import { labelField, labelInput } from "./field.js";
import {
  bar,
  levelText,
  mark,
  pressedGround,
  pressedStep,
  pressedWord,
  spinner,
} from "./kit.js";
import { moreMenu } from "./menu.js";

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

// An account's sides, and on its first line the mark, the gaps, the arrows and
// the three dots, 2 px apart, and the font sizes of the label, the plan, why
// the last read failed and Sign in again.
const SIDES = 16;
const LINE = { mark: 16, gap: 8, control: 22, between: 2 };
const LABEL = 13;
const PLAN = 12;
const FAILED = 11.5;
const SIGN_IN = 12;
// The email line's indent, font size and gap, and what sits between its parts.
const WHO = { left: 24, size: 11.5, gap: 4 };
const WHO_BETWEEN = 2 * WHO.gap + textWidth("·", WHO.size);
// A window's name and the numbers beside it below WIDE_PX, the font sizes of
// the name (and its percentage) and of the reset and clock time; from WIDE_PX
// the name's column.
const WINDOW_GAP = 8;
const NAME = 12;
const WINDOW_SMALL = 11.5;
const NAME_COLUMN = 120;

const NOTIFY = "Notify at 90% and at the limit";
const STRIP = "Show in status bar";

// The switch's knob slides across natively.
const SLIDE = { duration: 160, easing: "ease-out" };

// The popup's height for what `view` shows.
function heightOf(view) {
  return openHeight(view.readings, view.store.accounts(), {
    strip: stripBlock(view.host.layout()) !== null,
  });
}

export function open(view) {
  view.host.openOverlay({
    mod: "headroom",
    kind: "popup",
    width: WIDTH,
    height: heightOf(view),
    props: { form: "detail" },
  });
}

// This copy's detail view, plain data: `refreshing` while every account is
// read; `menu`, the account whose menu is open, and `renaming`, the account
// whose label is its field, each an account's id or null; `closed` once the
// popup is asked to close.
function stateOf(view) {
  return (view.ui.detail ??= {});
}

// What is not plain data: the rename's field and the account it is for.
function liveOf(view) {
  return (view.ui.detailLive ??= { input: null, id: null, focused: false });
}

/**
 * Makes the field of a rename given as data. Nothing in a copy that is not
 * the detail view.
 */
export function init(view, cx) {
  if (view.form !== "detail") return;
  const id = stateOf(view).renaming;
  if (id && renameInput(view) === null) startRename(view, id, cx);
}

/**
 * Runs the item `key` of the account `id`'s menu, `rename` or `remove`, and
 * closes the menu. Remove asks with the mod's own dialog over this view.
 */
export function chooseMenu(view, id, key, cx) {
  stateOf(view).menu = null;
  if (key === "rename") startRename(view, id, cx);
  else if (key === "remove") openRemove(view, id);
}

// Rename: the account's label and plan become its field, its text selected.
function startRename(view, id, cx) {
  const reading = view.readings.find((entry) => entry.id === id);
  if (!reading) return;
  const live = liveOf(view);
  const input = labelInput(reading.label, {
    submit: () => submitRename(view),
    focus: (focused) => {
      live.focused = focused;
    },
  });
  live.input = input;
  live.id = id;
  live.focused = true;
  stateOf(view).renaming = id;
  input.focus();
  // The closing menu hands the keyboard back to its control; take it again.
  cx.spawn(async (cx) => {
    await cx.sleep(50);
    if (live.input === input) input.focus();
  });
}

/** The field of the account being renamed, else null. */
export function renameInput(view) {
  const id = stateOf(view).renaming;
  const live = liveOf(view);
  return id && live.id === id ? live.input : null;
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
  stateOf(view).renaming = null;
}

// Shows (`checked`) or hides the strip's block in the shown layout.
export function setStrip(view, checked) {
  if (checked) view.host.show(STRIP_BLOCK);
  else view.host.hide(STRIP_BLOCK);
}

// Closes the popup, once, before it opens another view; a pane or a block has
// no overlay to close.
function closeSelf(view) {
  const state = stateOf(view);
  if (state.closed || !view.props.overlay) return;
  state.closed = true;
  view.host.closeOverlay(view.props.overlay);
}

// Reads every account now; while a read runs the control is Herdr's spinner
// until it is done. A refresh the store skips (every read started less than
// 30 s ago) changes nothing.
function refresh(view, cx) {
  const state = stateOf(view);
  if (state.refreshing) return;
  const read = view.store.refresh();
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
        .active(pressedGround(t))
        .on_click((_event, cx) => refresh(view, cx))
        .child(
          refreshing
            ? spinner(14, t)
            : svg(REFRESH).size(14).flex_none().text_color(t.muted),
        ),
    );
}

// The px the label of `reading` has on its first line in a view `width` px
// wide: the line less the mark, the plan's gap, what sits on the right (why
// the last read failed, or Sign in again) and the controls, and the gaps
// between them. The plan, cut before the label is, takes no room here.
function labelPlace(reading, row, view, width) {
  const right =
    row.state === "failed"
      ? [textWidth(failedText(reading, view.now), FAILED)]
      : row.state === "signed-out"
        ? [textWidth("Sign in again", SIGN_IN)]
        : [];
  const controls =
    arrowsOf(view.readings, reading.id) === null
      ? LINE.control
      : 3 * LINE.control + 2 * LINE.between;
  // The mark, the label, the plan, the space, what is on the right and the
  // controls.
  const parts = 4 + (reading.plan ? 1 : 0) + right.length;
  return (
    width -
    2 * SIDES -
    LINE.mark -
    right.reduce((sum, px) => sum + px, 0) -
    controls -
    (parts - 1) * LINE.gap
  );
}

// The account's first line: the mark, the label, the plan and, on the right,
// why the last read failed or the Sign in again control, then its up and
// down arrows and its three dots. The plan is cut before the label is: the
// label has its place, the plan what the label leaves of it; each that can be
// cut carries its whole text as a tooltip. While the account is renamed, its
// field runs from the mark up to the arrows.
function labelLine(reading, row, index, view, width) {
  const t = view.theme;
  const signedOut = row.state === "signed-out";
  const input =
    stateOf(view).renaming === reading.id ? renameInput(view) : null;
  const label = reading.label;
  const place = labelPlace(reading, row, view, width);
  const planPlace = place - textWidth(label, LABEL);
  const line = h_flex()
    .h(24)
    .gap(LINE.gap)
    .items_center()
    .child(mark(reading.provider, LINE.mark, t));
  const named =
    input !== null
      ? line.child(nameField(reading, input, index, view))
      : line
          .child(
            div()
              .min_w(0)
              .truncate()
              .text_size(LABEL)
              .font_medium()
              .text_color(signedOut ? t.muted : t.foreground)
              .when(canCut(label, LABEL, place), (el) => el.tooltip(label))
              .child(label),
          )
          .when(Boolean(reading.plan), (el) =>
            el.child(
              div()
                .min_w(0)
                .flex_shrink(1000)
                .truncate()
                .text_size(PLAN)
                .text_color(t.muted)
                .when(canCut(reading.plan, PLAN, planPlace), (el) =>
                  el.tooltip(reading.plan),
                )
                .child(reading.plan),
            ),
          )
          .child(div().flex_1())
          .when(row.state === "failed", (el) =>
            el.child(
              div()
                .flex_none()
                .text_size(FAILED)
                .text_color(t.muted)
                .whitespace_nowrap()
                .child(failedText(reading, view.now)),
            ),
          )
          .when(signedOut, (el) => el.child(signInAgain(reading, index, view)));
  return named.child(controls(reading, index, view));
}

// The label's field, the account view's own; a press or a click in it stays
// there.
function nameField(reading, input, index, view) {
  return labelField(
    input,
    {
      label: reading.label,
      focused: liveOf(view).focused,
      cancel: () => cancelRename(view),
    },
    view.theme,
  )
    .id(`account-${index}-name`)
    .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
    .on_click((_event, cx) => cx.stop_propagation());
}

// Sign in again, a word in the account's line: neither its press nor its
// click reaches the account.
function signInAgain(reading, index, view) {
  const t = view.theme;
  return (
    div()
      .id(`account-${index}-sign-in`)
      .role("button")
      .accessibility_label(`Sign in again to ${reading.label}`)
      .flex_none()
      .text_size(12)
      .text_color(t.accent)
      // Room around the word, taken back so nothing else moves.
      .px(6)
      .py(5)
      .mx(-6)
      .my(-5)
      .rounded(6)
      .cursor_pointer()
      .hover((s) => s.underline())
      .active(pressedWord())
      .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
      .on_click((_event, cx) => {
        cx.stop_propagation();
        closeSelf(view);
        openConnect(view, {
          provider: reading.provider,
          account: reading.id,
        });
      })
      .child("Sign in again")
  );
}

// The up and down arrows, when there is more than one account, then the
// three dots and their menu, 2 px apart.
function controls(reading, index, view) {
  const state = stateOf(view);
  const arrows = arrowsOf(view.readings, reading.id);
  return h_flex()
    .flex_none()
    .gap(2)
    .items_center()
    .when(arrows !== null, (el) =>
      el
        .child(arrow(reading, index, -1, arrows?.up, view))
        .child(arrow(reading, index, 1, arrows?.down, view)),
    )
    .child(
      moreMenu(
        {
          index,
          open: state.menu === reading.id,
          onOpenChange: (open, cx) => {
            if (open) state.menu = reading.id;
            else if (state.menu === reading.id) state.menu = null;
            cx.notify();
          },
          onChoose: (key, cx) => chooseMenu(view, reading.id, key, cx),
        },
        view.theme,
      ),
    );
}

// The account's up (`delta` -1) or down (1) arrow; dimmed, and doing
// nothing, when the account cannot move that way. Neither lets the press or
// the click reach the account: a dimmed one is disabled, so its own click
// never runs, and the press is stopped either way.
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
    .when(enabled, (el) =>
      el
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .active(pressedGround(t)),
    )
    .when(!enabled, (el) => el.opacity(0.35))
    .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
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

// `maxi@terac.example · Terac`, under the label, in a view `width` px wide.
// The parts give way together: each has the line less the others and what
// sits between them, and carries its whole text as a tooltip when that can
// cut it.
function whoLine(account, width, t) {
  const parts = [account?.email, account?.organization].filter(Boolean);
  if (parts.length === 0) return null;
  const line = width - 2 * SIDES - WHO.left - WHO_BETWEEN * (parts.length - 1);
  const all = parts.reduce((sum, part) => sum + textWidth(part, WHO.size), 0);
  return h_flex()
    .h(16)
    .mt(1)
    .pl(WHO.left)
    .gap(WHO.gap)
    .items_center()
    .text_size(WHO.size)
    .text_color(t.muted)
    .children(
      parts.flatMap((part, i) => {
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

// One window: its name, percentage, reset and clock time, and its bar. A
// failed read's (`dimmed`) keeps its last percentage alone, in the quiet
// colour, as the account view does: its reset may have passed since. In a
// view `width` px wide, a name that can be cut carries its whole text as a
// tooltip: from WIDE_PX it has a column of its own, below it what the
// numbers beside it leave of the account's width.
function windowView(window, id, view, { dimmed, wide, narrow, width }) {
  const t = view.theme;
  const level = levelOf(window);
  const { fraction, pace } = barOf(window, view.now);
  const left = dimmed ? null : untilReset(window, view.now);
  const percent =
    level === "limit" && !dimmed ? "At limit" : percentText(window);
  const reset = dimmed
    ? null
    : left === null
      ? "not started"
      : `resets in ${left}`;
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
  const beside = [
    [percent, NAME],
    [reset, WINDOW_SMALL],
    [clock, WINDOW_SMALL],
  ].filter(([text]) => text !== null);
  const namePlace = wide
    ? NAME_COLUMN
    : beside.reduce(
        (left, [text, size]) => left - WINDOW_GAP - textWidth(text, size),
        width - 2 * SIDES,
      );
  const name = div()
    .min_w(0)
    .truncate()
    .text_color(t.muted)
    .when(canCut(window.label, NAME, namePlace), (el) =>
      el.tooltip(window.label),
    )
    .child(window.label);
  const number = div()
    .flex_none()
    .text_color(levelText(dimmed ? "normal" : level, t))
    .whitespace_nowrap()
    .child(percent);
  const resets = div()
    .flex_none()
    .text_size(WINDOW_SMALL)
    .text_color(t.muted)
    .whitespace_nowrap()
    .when(reset !== null, (el) => el.child(reset));
  const time = div()
    .flex_none()
    .text_size(WINDOW_SMALL)
    .text_color(t.muted)
    .whitespace_nowrap();

  if (wide) {
    return h_flex()
      .mt(9)
      .h(16)
      .gap(14)
      .items_center()
      .text_size(NAME)
      .child(name.w(NAME_COLUMN).flex_none())
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
        .gap(WINDOW_GAP)
        .items_center()
        .text_size(NAME)
        .child(name.flex_1())
        .child(number)
        .when(reset !== null, (el) => el.child(resets))
        .when(clock !== null, (el) => el.child(time.child(clock))),
    )
    .child(track);
}

// The login line of the account view's `login`: `Login ends Dec 5`; `Login
// ends in 2 days` in the high colour in its last 3 days; `Login ended Nov 9`
// for an account that must sign in again; nothing before the first read,
// which draws the account's header lines only.
function loginLine(login, t) {
  if (login === null) return null;
  return div()
    .mt(12)
    .h(16)
    .text_size(11.5)
    .text_color(login.warning ? levelText("high", t) : t.muted)
    .child(login.text);
}

function section(reading, index, account, view) {
  const t = view.theme;
  const row = rowOf(reading, view.now);
  const width = view.size?.width ?? WIDTH;
  const layout = {
    dimmed: row.state === "failed",
    wide: width >= WIDE_PX,
    narrow: width < NARROW_PX,
    width,
  };
  const windows =
    row.state === "signed-out" ? [] : windowsInOrder(reading.windows);
  const who = whoLine(account, width, t);
  const login = loginLine(accountViewOf(reading, account, view.now).login, t);
  return v_flex()
    .id(`account-${index}`)
    .role("button")
    .accessibility_label(listRowOf(reading, view.now, width).spoken)
    .flex_none()
    .pt(11)
    .pb(13)
    .px(SIDES)
    .border_t(1)
    .border_color(t.border)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .active(pressedGround(t))
    .on_click(() => {
      closeSelf(view);
      openAccount(view, reading.id);
    })
    .child(labelLine(reading, row, index, view, width))
    .when(who !== null, (el) => el.child(who))
    .children(
      windows.map((window) =>
        windowView(window, `bar-${reading.id}-${window.id}`, view, layout),
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

// A 30 by 18 px switch on `input`, its knob on `muted` sliding across. Over
// each lies a layer, `accent` on the track and `accent_foreground` on the knob,
// that fades in as the knob slides on and out as it slides off, so the colours
// change in step with it. `turn(cx)` runs when it is turned.
function toggle(id, on, label, turn, t) {
  return Switch.new(id)
    .checked(on)
    .accessibility_label(label)
    .relative()
    .flex_none()
    .w(30)
    .h(18)
    .rounded(9)
    .bg(t.input)
    .cursor_pointer()
    .on_change((_checked, cx) => turn(cx))
    .child(onLayer(`${id}-on`, on, t.accent).rounded(9))
    .child(
      div()
        .absolute()
        .top(2)
        .left(on ? 14 : 2)
        .size(14)
        .rounded_full()
        .bg(t.muted)
        .transition("left", SLIDE)
        .child(
          onLayer(`${id}-knob-on`, on, t.accent_foreground).rounded_full(),
        ),
    );
}

// A layer of `colour` filling its parent, shown while the switch is on.
function onLayer(id, on, colour) {
  return div()
    .id(id)
    .absolute()
    .inset_0()
    .bg(colour)
    .opacity(on ? 1 : 0)
    .transition("opacity", SLIDE);
}

function notifyLine(view) {
  return switchLine(
    "notify",
    view.notify,
    NOTIFY,
    (checked) => setNotify(view.host, checked),
    view.theme,
  );
}

// On while the strip's block is shown; null when the layout has none.
function stripLine(view, block) {
  if (block === null) return null;
  return switchLine(
    "strip",
    !block.hidden,
    STRIP,
    (checked) => setStrip(view, checked),
    view.theme,
  );
}

// A line of the footer's left column: the switch and its label, one target
// that turns the switch. Its room around them is taken back by its margins,
// so the footer keeps its height. The line and the switch both set the value
// opposite to the one drawn, so a press that reaches both turns it once. The
// switch stays the one named control; the hover and pressed grounds are the
// line's, as a `Switch` takes no state styles.
function switchLine(id, on, label, set, t) {
  const turn = (cx) => {
    set(!on);
    cx.notify();
  };
  return h_flex()
    .id(`${id}-line`)
    .px(6)
    .py(4)
    .mx(-6)
    .my(-4)
    .gap(10)
    .items_center()
    .rounded(7)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .active(pressedGround(t))
    .on_click((_event, cx) => turn(cx))
    .child(toggle(id, on, label, turn, t))
    .child(
      div()
        .flex_1()
        .min_w(0)
        .text_size(12)
        .line_height(1.35)
        .text_color(t.muted)
        .child(label),
    );
}

// Connect account: its words, or below NARROW_PX a square with the plus alone.
function connectButton(view) {
  const t = view.theme;
  const narrow = (view.size?.width ?? WIDTH) < NARROW_PX;
  const button = h_flex()
    .id("connect-account")
    .role("button")
    .flex_none()
    .items_center()
    .rounded(8)
    .border_1()
    .border_color(t.input)
    .bg(t.raised)
    .cursor_pointer()
    .hover((s) => s.bg(t.selected))
    .active(pressedStep(t))
    .on_click(() => {
      closeSelf(view);
      openConnect(view, {});
    });
  if (narrow) {
    return button
      .accessibility_label("Connect account")
      .tooltip("Connect account")
      .size(30)
      .justify_center()
      .child(svg(PLUS).size(14).flex_none().text_color(t.foreground));
  }
  return button
    .h(30)
    .pl(9)
    .pr(12)
    .gap(6)
    .text_size(12.5)
    .font_medium()
    .text_color(t.foreground)
    .child(svg(PLUS).size(14).flex_none().text_color(t.muted))
    .child("Connect account");
}

// The switches in a column at the left, which takes the room; Connect account
// at the right, centred on them.
function footer(view, block) {
  const t = view.theme;
  const strip = stripLine(view, block);
  return h_flex()
    .flex_none()
    .px(16)
    .py(12)
    .gap(10)
    .items_center()
    .border_t(1)
    .border_color(t.border)
    .child(
      v_flex()
        .flex_1()
        .min_w(0)
        .gap(10)
        .child(notifyLine(view))
        .when(strip !== null, (el) => el.child(strip)),
    )
    .child(connectButton(view));
}

export function render(view, cx) {
  const t = view.theme;
  const accounts = view.store.accounts();
  const block = stripBlock(view.host.layout());
  // As a popup the root is as tall as its opener asked Herdr for: Herdr sizes
  // a popup to its content. As a pane or a block it fills its place.
  const root = v_flex().id("detail-view");
  return (
    view.props.overlay
      ? root
          .w_full()
          .h(openHeight(view.readings, accounts, { strip: block !== null }))
      : root.size_full()
  )
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
    .child(footer(view, block));
}
