import { imageCount, pictograph as pictographDefinition, type Pictograph, unitLabelOf } from "../core/definitions/pictograph";
import { formatSupplied } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { IMAGE_VIEW_BOX, images, type ImageAsset } from "../images/index";
import { fmt } from "./kit/format";
import type { Box } from "./kit/labels";
import { textWidth as measureText, wrap } from "./kit/text";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import { CATEGORY_NAME_WIDTH, type CategorySlot, categorySlots, drawCategoryNames } from "./kit/value-scale";
import type { Layout } from "./registry";
import { type Attrs, SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The largest a picture is drawn; pictures shrink, all together, so the longest row fits. */
export const MAX_IMAGE_STEP = 32;
/** A picture fills this share of its step; the rest is the gap to the next picture (DGP-REQ-037). */
const IMAGE_FILL = 0.85;
/** A remainder is drawn at least this share of a picture wide, so a tiny value still shows (DGP Pictograph Units). */
export const MIN_PARTIAL = 0.01;
/** The height columns may take when the pictures run upright. */
const COLUMN_HEIGHT = 240;
/** Space between the plot and the names, the key or the title. */
const GAP = 8;
/** The key's picture size and its text's line cap (caller-sized text stays bounded; GSS TICKET-002 SEC-001). */
const KEY_IMAGE = 18;
export const KEY_MAX_LINES = 2;

/** The key's text (DGP-REQ-027): "each apple = 2 students", or "units" when no label is given. */
// @spec DGP-REQ-027
export function keyText(p: Pictograph): string {
  return `each ${p.unitImage} = ${formatSupplied(p.unitValue)} ${unitLabelOf(p)}`;
}

/** A whole picture: the image's drawing in a nested viewport of `size` at (`x`, `y`). */
function picture(image: ImageAsset, x: number, y: number, size: number): SceneNode {
  return {
    kind: "svg",
    attrs: [
      ["x", fmt(x)],
      ["y", fmt(y)],
      ["width", fmt(size)],
      ["height", fmt(size)],
      ["viewBox", IMAGE_VIEW_BOX],
    ],
    children: image.nodes,
  };
}

/**
 * The partial picture for a remainder (DGP-REQ-028; AD-008): a nested viewport whose width (rows) or
 * height (columns) is the remaining fraction of one picture, with a `viewBox` that keeps that share
 * of the drawing at full scale. A nested `<svg>` clips by default, so no clip path and no id are
 * needed. Rows keep the left part; columns, which grow upward, keep the bottom part.
 */
// @spec DGP-REQ-028, DGP-NFR-002
function partialPicture(image: ImageAsset, x: number, y: number, size: number, fraction: number, upright: boolean): SceneNode {
  // Never rounded down to nothing, and the viewBox shows exactly the share the viewport is drawn
  // at, so the visible part is the drawn width (code review CR-001).
  const extent = fmt(Math.max(size * Math.max(fraction, MIN_PARTIAL), 0.01));
  const share = fmt((100 * extent) / size);
  const attrs: Attrs = upright
    ? [
        ["x", fmt(x)],
        ["y", fmt(y + size - extent)],
        ["width", fmt(size)],
        ["height", extent],
        ["viewBox", `0 ${fmt(100 - share)} 100 ${share}`],
        ["preserveAspectRatio", "xMidYMax meet"],
      ]
    : [
        ["x", fmt(x)],
        ["y", fmt(y)],
        ["width", extent],
        ["height", fmt(size)],
        ["viewBox", `0 0 ${share} 100`],
        ["preserveAspectRatio", "xMinYMid meet"],
      ];
  return { kind: "svg", attrs, children: image.nodes };
}

/** The pictures for one category, in a row from `start` or a column up from `start`, `step` apart. */
function categoryPictures(
  image: ImageAsset,
  value: number,
  unitValue: number,
  size: number,
  step: number,
  place: (index: number) => { x: number; y: number },
  upright: boolean,
): SceneNode[] {
  const { whole, fraction } = imageCount(value, unitValue);
  const nodes: SceneNode[] = [];
  for (let i = 0; i < whole; i++) {
    const { x, y } = place(i);
    nodes.push(picture(image, x, y, size));
  }
  if (fraction > 0) {
    const { x, y } = place(whole);
    nodes.push(partialPicture(image, x, y, size, fraction, upright));
  }
  return nodes;
}

/** A picture step rounded down to the 0.01 grid, so `most` steps still fit, and never 0. */
const gridStep = (step: number) => Math.max(0.01, Math.floor(step * 100) / 100);

/** The most pictures any category draws, at least 1 so an all-zero pictograph still has a size. */
function mostPictures(p: Pictograph): number {
  let most = 1;
  for (const value of p.values) {
    const { whole, fraction } = imageCount(value, p.unitValue);
    most = Math.max(most, whole + (fraction > 0 ? 1 : 0));
  }
  return most;
}

/**
 * The pictograph's layout (DGP-REQ-023, DGP-REQ-026..028, DGP-REQ-032, DGP-REQ-037): the title, then
 * one row per category with its name on the left (horizontal, the default), or one column per
 * category growing upward with its name below (vertical). Every picture has one size and one step,
 * chosen so the longest row or column fits, so equal values draw equal rows. A value that is not a
 * whole number of pictures ends in one cropped picture; a zero value draws none and keeps its row and
 * name. The key below says what one picture stands for. Every number goes through `fmt()` (AD-007).
 */
// @spec DGP-REQ-023, DGP-REQ-026, DGP-REQ-027, DGP-REQ-028, DGP-REQ-032, DGP-REQ-037
export const pictographLayout: Layout<Pictograph> = (p: Pictograph, provenance: Provenance): Scene => {
  const image = images[p.unitImage];
  const upright = p.orientation === "vertical";
  const title = titleBlock(p.title);
  const most = mostPictures(p);
  const nodes: SceneNode[] = [];
  for (const node of title.nodes) nodes.push(node);
  const top = title.height + GAP;

  let plotBottom: number;
  if (!upright) {
    // Rows: names in a column on the left, pictures to their right.
    const left = SCENE_MARGIN + CATEGORY_NAME_WIDTH + 4;
    const width = SCENE_WIDTH - SCENE_MARGIN - left;
    // Step and size are rounded once, so every picture lands on the same 0.01 grid and the spacing
    // is exactly equal, not merely equal after rounding each position (DGP-REQ-037).
    const step = gridStep(Math.min(MAX_IMAGE_STEP, width / most));
    const size = fmt(step * IMAGE_FILL);
    // A row is tall enough for its picture and for the tallest wrapped name.
    const probe = categorySlots(p.categories, { x: left, y: top, width, height: p.categories.length }, "horizontal");
    let nameHeight = 0;
    for (const slot of probe) nameHeight = Math.max(nameHeight, slot.labelHeight);
    const rowHeight = Math.max(step, nameHeight + 4);
    const box: Box = { x: left, y: top, width, height: rowHeight * p.categories.length };
    const slots = categorySlots(p.categories, box, "horizontal");
    slots.forEach((slot: CategorySlot) => {
      const y = slot.center - size / 2;
      const pictures = categoryPictures(image, p.values[slot.index] ?? 0, p.unitValue, size, step, (i) => ({ x: left + i * step, y }), false);
      for (const node of pictures) nodes.push(node);
    });
    for (const node of drawCategoryNames(slots, "horizontal", box)) nodes.push(node);
    plotBottom = box.y + box.height;
  } else {
    // Columns: pictures grow upward from a common baseline, names below.
    const box0: Box = { x: SCENE_MARGIN, y: top, width: SCENE_WIDTH - 2 * SCENE_MARGIN, height: COLUMN_HEIGHT };
    const slotWidth = box0.width / Math.max(1, p.categories.length);
    const step = gridStep(Math.min(MAX_IMAGE_STEP, COLUMN_HEIGHT / most, slotWidth / IMAGE_FILL));
    const size = fmt(step * IMAGE_FILL);
    const box: Box = { ...box0, height: step * most };
    const baseline = box.y + box.height;
    const slots = categorySlots(p.categories, box, "vertical");
    slots.forEach((slot: CategorySlot) => {
      const x = slot.center - size / 2;
      const pictures = categoryPictures(
        image,
        p.values[slot.index] ?? 0,
        p.unitValue,
        size,
        step,
        (i) => ({ x, y: baseline - (i + 1) * step + (step - size) }),
        true,
      );
      for (const node of pictures) nodes.push(node);
    });
    let nameHeight = 0;
    for (const slot of slots) nameHeight = Math.max(nameHeight, slot.labelHeight);
    for (const node of drawCategoryNames(slots, "vertical", box)) nodes.push(node);
    plotBottom = baseline + 4 + nameHeight;
  }

  // The key: one picture and "each apple = 2 students", wrapped and capped like any caller text.
  const fontSize = defaultStyle.fontSizes.label;
  const keyTop = plotBottom + GAP;
  const textWidth = SCENE_WIDTH - 2 * SCENE_MARGIN - KEY_IMAGE - GAP;
  const lines = wrap(keyText(p), textWidth, fontSize, KEY_MAX_LINES);
  const keyHeight = Math.max(KEY_IMAGE, lines.length * fontSize * LINE_HEIGHT);
  // The picture and its text centered together as one group.
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, measureText(line, fontSize));
  const keyLeft = (SCENE_WIDTH - (KEY_IMAGE + GAP + widest)) / 2;
  nodes.push(picture(image, keyLeft, keyTop + (keyHeight - KEY_IMAGE) / 2, KEY_IMAGE));
  const textCenter = keyLeft + KEY_IMAGE + GAP + widest / 2;
  for (const node of textLines(lines, textCenter, keyTop + (keyHeight - lines.length * fontSize * LINE_HEIGHT) / 2, fontSize, defaultStyle.colors.text)) {
    nodes.push(node);
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(keyTop + keyHeight + SCENE_MARGIN),
    textAlternative: pictographDefinition.describe(p, provenance),
    nodes,
  };
};
