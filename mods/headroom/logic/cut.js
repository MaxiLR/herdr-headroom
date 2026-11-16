// Whether a text can be cut in its place: the views give such a text its whole
// text as a tooltip. The width of a text is the strip's estimate, which never
// falls short, so a text near the limit may carry a tooltip it does not need.

import { textWidth } from "./strip.js";

/** True when `text` at a font `size` px can be cut in a place `width` px wide. */
export function canCut(text, size, width) {
  return textWidth(text, size) > width;
}
