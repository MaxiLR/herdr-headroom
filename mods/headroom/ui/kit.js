// The small drawing kit every form is built from: the bar with its pace
// mark, the pair of bars, the provider marks and their dot, the spinner, the
// band on a scrolling area's bottom edge and the fonts.
import { Background, div, PathBuilder, svg } from "gpui-kit";
import { v_flex } from "gpui-base";
import { settings } from "herdr";
import { alpha, levelFill, track } from "../logic/color.js";

export { levelFill, levelText, track } from "../logic/color.js";

/** Herdr's own ring spinner, so a wait reads as it does in Herdr. */
const SPINNER = "mods/workspace-chrome/spinner.svg";
const MORE = "mods/headroom/icons/more.svg";

// Claude's orange, the colour of its spark: the one colour in the mod that
// does not come from `theme()`, so the spark reads as Claude's in every theme.
const CLAUDE_ORANGE = "#D97757";

// The providers' logos, with the spoken name: the ChatGPT logo in the theme's
// text colour for Codex, Claude's spark in Claude's orange.
const MARKS = {
  claude: {
    path: "mods/headroom/icons/claude.svg",
    label: "Claude",
    color: () => CLAUDE_ORANGE,
  },
  codex: {
    path: "mods/headroom/icons/chatgpt.svg",
    label: "Codex",
    color: (t) => t.foreground,
  },
};

// A new reading slides the fill and the pace mark there natively.
const MOTION = { duration: 400, easing: "ease-out" };

// The pace mark: a 2 px tick reaching the same distance beyond its bar above
// and below, in a 1.5 px halo of the ground behind it.
const TICK = 2;
const REACH = 2;
const HALO = 1.5;

// The least a fill that is not empty is drawn at, so 1 % still shows.
const MIN_FILL = 3;

// The dot of a reached limit the row has no bar for: 5 px, its box 2 px above
// the mark's and 3 px beyond it, in a ring of the ground as wide as the pace
// mark's halo.
const DOT = 5;
const DOT_RISE = 2;
const DOT_REACH = 3;

/** A provider's mark, `size` px, in `t`'s colours, named for screen readers. */
export function mark(provider, size, t) {
  const { path, label, color } = MARKS[provider];
  return svg(path)
    .size(size)
    .flex_none()
    .text_color(color(t))
    .accessibility_label(label);
}

/**
 * `icon`, a mark `size` px, with the dot of a reached limit on its upper
 * right corner when `dot`: `<id>-dot`, in `blocked`, ringed by a disc of
 * `ground` (`chrome` by default) behind it. It takes no room; without the
 * dot `icon` is drawn as it is.
 */
export function dotted(icon, { id, size, dot, ground }, t) {
  if (!dot) return icon;
  const ring = div()
    .absolute()
    .top(-(DOT_RISE + HALO))
    .right(-(DOT_REACH + HALO))
    .size(DOT + 2 * HALO)
    .p(HALO)
    .rounded_full()
    .bg(ground ?? t.chrome)
    .child(div().id(`${id}-dot`).size(DOT).rounded_full().bg(t.blocked));
  return div().relative().flex_none().size(size).child(icon).child(ring);
}

/**
 * One bar at the full width. The track is `id`, the fill `<id>-fill`, the
 * pace mark `<id>-pace`. `fraction` and `pace` are shares of the window (0 to
 * 1); `pace` null, or `dimmed`, draws no mark. `reach`: the px the mark
 * reaches beyond the bar, above and below. `ground`: the colour behind the
 * bar, for the mark's halo (`chrome` by default).
 */
export function bar(
  {
    id,
    fraction,
    level = "normal",
    pace = null,
    thin = false,
    height,
    reach = REACH,
    dimmed = false,
    ground,
  },
  t,
) {
  const share = clamp(fraction ?? 0);
  const fill = div()
    .id(`${id}-fill`)
    .h_full()
    .w(percent(share))
    .when(share > 0, (el) => el.min_w(MIN_FILL))
    .rounded_full()
    .bg(levelFill(level, t))
    .transition("width", MOTION);
  return div()
    .id(id)
    .relative()
    .flex_none()
    .w_full()
    .h(height ?? (thin ? 3 : 6))
    .rounded_full()
    .bg(track(t))
    .child(fill)
    .when(pace !== null && pace !== undefined && !dimmed, (el) =>
      el.child(paceMark(id, clamp(pace), reach, ground ?? t.chrome, t)),
    )
    .when(dimmed, (el) => el.opacity(0.4));
}

function paceMark(id, pace, reach, ground, t) {
  return div()
    .id(`${id}-pace`)
    .absolute()
    .top(-(reach + HALO))
    .bottom(-(reach + HALO))
    .left(percent(pace))
    .ml(-(TICK / 2 + HALO))
    .w(TICK + 2 * HALO)
    .p(HALO)
    .rounded(TICK / 2 + HALO)
    .bg(ground)
    .transition("left", MOTION)
    .child(
      div()
        .size_full()
        .rounded(TICK / 2)
        .bg(t.foreground),
    );
}

/**
 * The pair: the full bar (`<id>-full`) over the thin one (`<id>-short`), `gap`
 * px apart, each pace mark reaching `reach` px beyond its bar. `full` and
 * `short` are `{ fraction, level, pace }`, or null for a window the plan does
 * not have: it is not drawn at all.
 */
export function pair(
  {
    id,
    full,
    short,
    heights = [6, 3],
    gap = 6,
    reach = REACH,
    dimmed = false,
    ground,
  },
  t,
) {
  const bars = [];
  if (full) {
    bars.push(
      bar(
        {
          ...full,
          id: `${id}-full`,
          height: heights[0],
          reach,
          dimmed,
          ground,
        },
        t,
      ),
    );
  }
  if (short) {
    bars.push(
      bar(
        {
          ...short,
          id: `${id}-short`,
          thin: true,
          height: heights[1],
          reach,
          dimmed,
          ground,
        },
        t,
      ),
    );
  }
  return v_flex().w_full().gap(gap).children(bars);
}

/** Herdr's ring spinner, turning natively. */
export function spinner(size, t) {
  return svg(SPINNER).size(size).flex_none().text_color(t.muted).spin(900);
}

/** The terminal font, for codes and addresses. */
export function mono() {
  return settings().font_family ?? "JetBrains Mono";
}

/** Three dots, drawn, in the quiet text colour: a menu or settings control. */
export function moreIcon(size, t) {
  return svg(MORE).size(size).flex_none().text_color(t.muted);
}

// A rectangle filling its box, to paint a gradient on.
function fill() {
  return PathBuilder.fill()
    .move_to("0%", "0%")
    .line_to("100%", "0%")
    .line_to("100%", "100%")
    .line_to("0%", "100%")
    .close()
    .build();
}

/**
 * A band `id` on the bottom edge of the box it is put in (made `relative`),
 * over what scrolls there: `height` px, the whole width, in `chrome` with its
 * top `fade` px fading from clear, so what passes under it fades instead of
 * being cut. It takes no press and no wheel; what is under it keeps them.
 */
export function edgeBand({ id, height, fade }, t) {
  const clear = alpha(t.chrome, 0);
  return v_flex()
    .id(id)
    .absolute()
    .left(0)
    .right(0)
    .bottom(0)
    .h(height)
    .child(
      div()
        .relative()
        .flex_none()
        .w_full()
        .h(fade)
        .child(
          window
            .paint_path(
              fill(),
              Background.linear_gradient(180, clear, t.chrome),
            )
            .absolute()
            .top(0)
            .left(0)
            .size_full(),
        ),
    )
    .child(div().flex_1().w_full().bg(t.chrome));
}

function clamp(share) {
  return Math.min(1, Math.max(0, share));
}

// A share as a width: 0.41 → "41%", to a tenth of a percent.
function percent(share) {
  return `${Math.round(share * 1000) / 10}%`;
}
