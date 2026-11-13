// A block that is as tall as its content: the height to ask its layout for.
import { STRIP_BELOW } from "./form.js";

/** The most a block asks for: the height that holds four accounts. */
export const FIT_MAX = 320;

/**
 * The least a block asks for: a strip's height. A folded sidebar's rail can be
 * shorter, and a block fitted to it would stay a strip once the sidebar
 * unfolds, since the strip never fits its block.
 */
export const FIT_MIN = STRIP_BELOW;

/** The px to ask for `needed`, or null when that is `last`, the height asked. */
export function fitHeight(needed, last) {
  const px = Math.min(Math.max(Math.ceil(needed), FIT_MIN), FIT_MAX);
  return px === last ? null : px;
}

/**
 * Resizes the layout block named by `view.props.fit` to `needed`, once per
 * height. Call it from an event handler (`on_size_change`), never in render.
 */
export function fitTo(view, needed) {
  if (!view.props.fit) return;
  const px = fitHeight(needed, view.ui.fit);
  if (px === null) return;
  view.host.resize(view.props.fit, px);
  view.ui.fit = px;
}
