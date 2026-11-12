// The connect dialog: signs in to a Codex account with OpenAI's device code
// and closes itself once the account is connected.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { settings } from "herdr";

// Herdr's own ring spinner.
const SPINNER = "mods/workspace-chrome/spinner.svg";

export function open(view, target) {
  view.host.openOverlay({
    mod: "headroom",
    kind: "dialog",
    width: 420,
    props: { connect: target ?? {} },
  });
}

export function init(view, cx) {
  if (!view.props.connect || view.ui.connect) return;
  const state = { shown: null, error: null, closed: false };
  view.ui.connect = state;
  const { store, host } = view;
  const overlay = view.props.overlay;
  cx.spawn(async (cx) => {
    const result = await store.connect("codex", {
      async sleep(ms) {
        try {
          await cx.sleep(ms);
        } catch {
          // The dialog is gone: the next look at `cancelled` stops the sign-in.
          state.closed = true;
        }
      },
      present(shown) {
        state.shown = shown;
        cx.notify();
      },
      readCode: async () => null,
      cancelled: () => state.closed,
    });
    if (state.closed) return;
    if (result.ok) {
      host.closeOverlay(overlay);
      return;
    }
    if (result.kind === "cancelled") return;
    state.error = result.kind;
    cx.notify();
  });
}

export function close(view, cx) {
  if (view.ui.connect) view.ui.connect.closed = true;
}

export function render(view, cx) {
  const t = view.theme;
  const state = view.ui.connect ?? { shown: null, error: null, closed: false };
  const mono = settings().font_family ?? "JetBrains Mono";
  const shown = state.shown;
  return v_flex()
    .size_full()
    .p(18)
    .gap(14)
    .bg(t.popover)
    .text_size(13)
    .text_color(t.foreground)
    .child(
      h_flex()
        .justify_between()
        .items_center()
        .child(
          div()
            .role("heading")
            .text_size(15)
            .font_semibold()
            .child("Connect Codex"),
        )
        .child(div().text_size(12).text_color(t.dim).child("Esc")),
    )
    .when(Boolean(shown), (el) =>
      el.child(
        v_flex()
          .gap(6)
          .child(
            div()
              .text_color(t.muted)
              .child("Enter this code at the address below."),
          )
          .child(
            div()
              .font_family(mono)
              .text_size(22)
              .font_semibold()
              .child(shown.code ?? ""),
          )
          .child(
            div()
              .font_family(mono)
              .text_size(12)
              .text_color(t.muted)
              .child(shown.url),
          ),
      ),
    )
    .when(!state.error, (el) =>
      el.child(
        h_flex()
          .gap(8)
          .items_center()
          .text_color(t.muted)
          .child(
            svg(SPINNER).size(12).flex_none().text_color(t.muted).spin(900),
          )
          .child(
            shown ? "Waiting for you to approve" : "Asking OpenAI for a code",
          ),
      ),
    )
    .when(Boolean(state.error), (el) =>
      el.child(
        div()
          .role("alert")
          .text_color(t.blocked)
          .child("Could not reach the provider."),
      ),
    )
    .child(
      h_flex()
        .justify_end()
        .child(
          div()
            .id("cancel")
            .role("button")
            .h(32)
            .px(12)
            .flex()
            .items_center()
            .rounded(6)
            .border(1)
            .border_color(t.input)
            .cursor_pointer()
            .hover((s) => s.bg(t.hover))
            .on_click(() => view.host.closeOverlay(view.props.overlay))
            .child("Cancel"),
        ),
    );
}

export function choose(view, provider, cx) {}
