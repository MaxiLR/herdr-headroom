// The connect dialog: choose a provider, then sign in on its own page, with
// Claude's pasted code or Codex's device code. It closes itself once the
// account is connected.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex, Input, InputState } from "gpui-base";
import {
  dialogState,
  errorText,
  startSignIn,
  stopsIn,
} from "../logic/connect.js";
import { levelText, mark, mono, spinner } from "./kit.js";

// Herdr's own chevrons, as its sidebar draws them.
const BACK = "mods/workspace-chrome/chevron-left.svg";
const NEXT = "mods/workspace-chrome/chevron-right.svg";

const PROVIDERS = ["claude", "codex"];

const CHOICES = {
  claude: { name: "Claude", line: "Sign in with your Claude account" },
  codex: { name: "Codex", line: "Sign in with your ChatGPT account" },
};

export function open(view, target) {
  view.host.openOverlay({
    mod: "headroom",
    kind: "dialog",
    width: 420,
    props: { connect: target ?? {} },
  });
}

// The parts of the dialog that are not plain data: the code field, the
// keyboard handle and the sign-in in progress.
function liveOf(view) {
  return view.ui.connectLive ?? null;
}

export function init(view, cx) {
  if (!view.props.connect || liveOf(view)) return;
  const input = InputState.new({ placeholder: "Paste the code" });
  const live = {
    input,
    focused: false,
    handle: cx.focus_handle(),
    session: null,
  };
  view.ui.connectLive = live;
  input.on("change", (_event, cx) => cx.notify());
  input.on("focus", (_event, cx) => {
    live.focused = true;
    cx.notify();
  });
  input.on("blur", (_event, cx) => {
    live.focused = false;
    cx.notify();
  });
  input.on("submit", (_event, cx) => {
    submit(view);
    cx.notify();
  });
  if (view.ui.connect) return;
  view.ui.connect = dialogState();
  const provider = view.props.connect.provider;
  if (PROVIDERS.includes(provider)) choose(view, provider, cx);
  else live.handle.focus();
}

/** Starts signing in to `provider`, anew if a sign-in was under way. */
export function choose(view, provider, cx) {
  const live = liveOf(view);
  const state = view.ui.connect;
  if (!live || !state) return;
  live.session?.stop();
  live.input.set_value("");
  const { store, host } = view;
  const overlay = view.props.overlay;
  cx.spawn(async (cx) => {
    const session = startSignIn(state, {
      provider,
      store,
      sleep: (ms) => cx.sleep(ms),
      refresh: () => cx.notify(),
      connected: () => host.closeOverlay(overlay),
    });
    live.session = session;
    await session.done;
  });
  if (provider === "claude") live.input.focus();
  else live.handle.focus();
}

export function close(view, cx) {
  if (view.ui.connect) view.ui.connect.closed = true;
  liveOf(view)?.session?.stop();
}

// Hands the pasted code to Claude's sign-in.
function submit(view) {
  const live = liveOf(view);
  const code = live?.input.value().trim() ?? "";
  if (!code || !live.session) return;
  live.session.submit(code);
}

// Back to the choice; the sign-in under way stops.
function back(view) {
  const live = liveOf(view);
  live?.session?.stop();
  if (live) live.session = null;
  view.ui.connect = dialogState();
  live?.handle.focus();
}

function dismiss(view) {
  liveOf(view)?.session?.stop();
  view.host.closeOverlay(view.props.overlay);
}

// The provider whose step is shown; a device code is only ever Codex's.
function providerOf(state) {
  return state.provider ?? (state.shown?.code ? "codex" : null);
}

export function render(view, cx) {
  const t = view.theme;
  const state = view.ui.connect ?? dialogState();
  const live = liveOf(view);
  const provider = providerOf(state);
  const title = provider
    ? `Connect ${CHOICES[provider].name}`
    : "Connect an account";
  const body =
    provider === "claude"
      ? claudeStep(view, state, live, t)
      : provider === "codex"
        ? codexStep(view, state, t)
        : chooseStep(view, state, t);
  return v_flex()
    .id("connect-dialog")
    .when(Boolean(live), (el) => el.track_focus(live.handle))
    .on_key_down((event, cx) => {
      if (event.key !== "escape") return;
      dismiss(view);
      cx.stop_propagation();
    })
    .w_full()
    .min_h(0)
    .p(18)
    .bg(t.popover)
    .text_size(13)
    .text_color(t.foreground)
    .child(header(view, title, Boolean(provider), t))
    .children(body);
}

function header(view, title, withBack, t) {
  return h_flex()
    .min_h(22)
    .gap(6)
    .items_center()
    .when(withBack, (el) =>
      el.child(
        div()
          .id("back")
          .role("button")
          .accessibility_label("Back to the providers")
          .flex_none()
          .size(22)
          .ml(-5)
          .flex()
          .items_center()
          .justify_center()
          .rounded(6)
          .text_color(t.muted)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click((_event, cx) => {
            back(view);
            cx.notify();
          })
          .child(svg(BACK).size(16).flex_none()),
      ),
    )
    .child(
      div()
        .flex_1()
        .min_w(0)
        .role("heading")
        .text_size(15)
        .font_semibold()
        .child(title),
    )
    .child(div().flex_none().text_size(11).text_color(t.dim).child("Esc"));
}

// 1. The choice of provider.
function chooseStep(view, state, t) {
  const error = state.error ? errorText(state.error, null) : null;
  return [
    div().h(8),
    ...PROVIDERS.map((provider) => choice(view, provider, t)),
    div()
      .pt(14)
      .text_size(11.5)
      .text_color(t.muted)
      .child(
        "You sign in on the provider's own page, in your browser. The login stays on this computer, in a file only you can read.",
      ),
    ...(error ? [errorLine(error, t)] : []),
  ];
}

function choice(view, provider, t) {
  const { name, line } = CHOICES[provider];
  return h_flex()
    .id(`choose-${provider}`)
    .role("button")
    .mt(8)
    .min_h(56)
    .py(8)
    .px(12)
    .gap(12)
    .items_center()
    .rounded(9)
    .border_1()
    .border_color(t.input)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_click((_event, cx) => {
      choose(view, provider, cx);
      cx.notify();
    })
    .child(mark(provider, 22))
    .child(
      v_flex()
        .flex_1()
        .min_w(0)
        .gap(1)
        .child(div().font_medium().child(name))
        .child(div().text_size(12).text_color(t.muted).child(line)),
    )
    .child(svg(NEXT).size(14).flex_none().text_color(t.dim));
}

// 2. Claude: the address, then the pasted code.
function claudeStep(view, state, live, t) {
  const error = state.error ? errorText(state.error, "claude") : null;
  const code = live?.input.value().trim() ?? "";
  return [
    sentence(
      "Your browser opened Claude's sign-in page. Approve there, then copy the code it shows you.",
      t,
    ),
    label("Sign-in address", t),
    address(view, state, t),
    label("Code from Claude", t),
    ...(live
      ? [
          Input.new(live.input)
            .accessibility_label("Code from Claude")
            .h(36)
            .px(10)
            .rounded(9)
            .border_1()
            .border_color(live.focused ? t.accent : t.input)
            .bg(t.background)
            .text_size(12.8)
            .text_color(t.foreground),
        ]
      : []),
    div()
      .pt(6)
      .text_size(11.5)
      .text_color(t.muted)
      .child("The whole address of the page that shows the code works too."),
    ...(error ? [errorLine(error, t)] : []),
    buttons(
      view,
      error
        ? startAgain(view, "claude", t)
        : connectButton(view, !code || state.checking, state.checking, t),
      t,
    ),
  ];
}

// 3. Codex: the device code, the address, and the wait.
function codexStep(view, state, t) {
  const error = state.error ? errorText(state.error, "codex") : null;
  const shown = state.shown;
  const parts = [
    sentence(
      shown
        ? "Your browser opened OpenAI's sign-in page. Enter this code there."
        : "OpenAI's sign-in page opens in your browser with a code to enter.",
      t,
    ),
  ];
  if (shown?.code) parts.push(codeBox(state, Boolean(error), t));
  if (error) parts.push(errorLine(error, t));
  if (shown) {
    parts.push(label("Sign-in address", t), address(view, state, t));
  }
  if (!error) parts.push(waiting(view, state, t));
  parts.push(buttons(view, error ? startAgain(view, "codex", t) : null, t));
  return parts;
}

function sentence(text, t) {
  return div().mt(10).text_color(t.muted).child(text);
}

function label(text, t) {
  return div().pt(16).pb(7).text_size(11.5).text_color(t.dim).child(text);
}

// The sign-in address in the terminal font, with Copy and Open.
function address(view, state, t) {
  const url = state.shown?.url;
  const field = h_flex()
    .h(36)
    .pl(10)
    .pr(4)
    .gap(6)
    .items_center()
    .rounded(9)
    .border_1()
    .border_color(t.input)
    .bg(t.background);
  if (!url) {
    return field
      .gap(8)
      .text_size(12)
      .text_color(t.muted)
      .child(spinner(12, t))
      .child(
        div().flex_1().min_w(0).truncate().child("Opening the sign-in page"),
      );
  }
  return field
    .child(
      div()
        .flex_1()
        .min_w(0)
        .truncate()
        .font_family(mono())
        .text_size(11.5)
        .text_color(t.muted)
        .child(url),
    )
    .child(copyButton("copy-url", "url", url, state, t))
    .child(mini("open-url", "Open", t).on_click(() => view.host.openUrl(url)));
}

// The device code, large, with Copy; dimmed once the sign-in has failed.
function codeBox(state, failed, t) {
  const code = state.shown.code;
  return h_flex()
    .mt(14)
    .h(56)
    .pl(16)
    .pr(8)
    .gap(8)
    .items_center()
    .rounded(9)
    .border_1()
    .border_color(t.input)
    .bg(t.background)
    .child(
      div()
        .flex_1()
        .min_w(0)
        .truncate()
        .font_family(mono())
        .text_size(22)
        .font_medium()
        .when(failed, (el) => el.text_color(t.muted))
        .child(code),
    )
    .when(!failed, (el) =>
      el.child(copyButton("copy-code", "code", code, state, t)),
    );
}

function waiting(view, state, t) {
  const deadline = state.shown?.deadline;
  return h_flex()
    .mt(16)
    .gap(8)
    .items_center()
    .child(spinner(14, t).text_color(t.working))
    .child(
      div()
        .flex_1()
        .min_w(0)
        .child(
          state.shown
            ? "Waiting for you to approve"
            : "Asking OpenAI for a code",
        ),
    )
    .when(typeof deadline === "number", (el) =>
      el.child(
        div()
          .flex_none()
          .text_size(11.5)
          .text_color(t.muted)
          .child(stopsIn(deadline, view.now)),
      ),
    );
}

function errorLine(text, t) {
  return div()
    .role("alert")
    .pt(8)
    .text_size(12)
    .text_color(levelText("critical", t))
    .child(text);
}

// A small control inside a field: Copy or Open.
function mini(id, text, t) {
  return h_flex()
    .id(id)
    .role("button")
    .flex_none()
    .h(26)
    .px(8)
    .gap(5)
    .items_center()
    .rounded(6)
    .bg(t.raised)
    .text_size(12)
    .text_color(t.foreground)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .child(text);
}

function copyButton(id, what, text, state, t) {
  return mini(id, state.copied === what ? "Copied" : "Copy", t).on_click(
    (_event, cx) => {
      cx.write_to_clipboard(text);
      state.copied = what;
      cx.notify();
    },
  );
}

// Cancel, and the primary button when the step has one.
function buttons(view, primary, t) {
  return h_flex()
    .pt(20)
    .gap(8)
    .justify_end()
    .child(
      button("cancel", "Cancel", false, t)
        .cursor_pointer()
        .hover((s) => s.opacity(0.88))
        .on_click(() => dismiss(view)),
    )
    .when(Boolean(primary), (el) => el.child(primary));
}

// A dialog button; `leading` goes before its text.
function button(id, text, primary, t, leading = null) {
  return h_flex()
    .id(id)
    .role("button")
    .h(32)
    .px(14)
    .gap(6)
    .items_center()
    .rounded(8)
    .border_1()
    .border_color(primary ? t.solid : t.input)
    .bg(primary ? t.solid : t.raised)
    .text_color(primary ? t.solid_foreground : t.foreground)
    .text_size(12.5)
    .font_medium()
    .when(Boolean(leading), (el) => el.child(leading))
    .child(text);
}

function connectButton(view, disabled, checking, t) {
  const working = checking
    ? spinner(12, t).text_color(t.solid_foreground)
    : null;
  return button("connect", "Connect", true, t, working)
    .disabled(disabled)
    .when(disabled, (el) => el.opacity(0.45))
    .when(!disabled, (el) =>
      el
        .cursor_pointer()
        .hover((s) => s.opacity(0.88))
        .on_click((_event, cx) => {
          submit(view);
          cx.notify();
        }),
    );
}

function startAgain(view, provider, t) {
  return button("start-again", "Start again", true, t)
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .on_click((_event, cx) => {
      choose(view, provider, cx);
      cx.notify();
    });
}
