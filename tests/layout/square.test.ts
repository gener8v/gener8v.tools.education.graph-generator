import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import type { Square } from "../../src/core/definitions/square";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { GAP, LABEL_MAX_LINES } from "../../src/layout/kit/figure-labels";
import { type Box, type Obstacle, placeLabel } from "../../src/layout/kit/labels";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT, TITLE_MAX_LINES } from "../../src/layout/kit/title";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { DRAWN_SIDE, RIGHT_ANGLE_MARK, squareLayout } from "../../src/layout/square";
import { wordsOf } from "../fixtures/plain-text";

const LABEL_SIZE = 14;

/**
 * The Scene for a valid description; every Scene must pass checkScene (AD-007, AD-008). Calls the
 * layout directly, not through `createGraph`, so a layout exception fails the test with its own
 * message and stack instead of an `internal_error` (GSS TICKET-002 quality review QR-006).
 */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid square, got ${JSON.stringify(result.issues)}`);
  const scene = squareLayout(result.description as Square, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
const text = (node: SceneNode, name: string) => String(node.attrs.find(([key]) => key === name)?.[1]);
const texts = (scene: Scene) => scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => attr(node, "font-size") === LABEL_SIZE);
const outline = (scene: Scene) => scene.nodes.find((node) => node.kind === "polygon")!;
const marks = (scene: Scene) => scene.nodes.filter((node) => node.kind === "polyline");

/** The outline's corners, in order. */
function corners(scene: Scene): Array<[number, number]> {
  return text(outline(scene), "points")
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number]);
}

/** The square's four sides, as segments. */
function sides(scene: Scene): Obstacle[] {
  const c = corners(scene);
  return c.map((p, i) => ({ x1: p[0], y1: p[1], x2: c[(i + 1) % 4]![0], y2: c[(i + 1) % 4]![1] }));
}

/** The estimated box of one text line, as the layout reserved it. */
function boxOf(node: SceneNode & { text: string }): Box {
  const size = attr(node, "font-size");
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  return { x: attr(node, "x") - width / 2, y: attr(node, "y") - size * 0.8 - (lineHeight - size) / 2, width, height: lineHeight };
}

/** `boxOf` shrunk by `fmt()`'s rounding step on every side, as the circle's test does (GSS TICKET-002 QR-001). */
function reservedBoxOf(node: SceneNode & { text: string }): Box {
  const box = boxOf(node);
  return { x: box.x + 0.01, y: box.y + 0.01, width: box.width - 0.02, height: box.height - 0.02 };
}

/** Every text line (labels and title) that overlaps another or crosses a side or mark (GSS-NFR-003). */
function overlaps(scene: Scene): string[] {
  const found: string[] = [];
  const boxes = texts(scene).map(reservedBoxOf);
  const figure: Obstacle[] = sides(scene);
  boxes.forEach((box, i) => {
    const others = [...boxes.slice(0, i), ...boxes.slice(i + 1), ...figure];
    if (placeLabel(box, [box], others) === undefined) found.push(texts(scene)[i]!.text);
  });
  return found;
}

const inside = (box: Box, c: Array<[number, number]>) => {
  const [left, top] = c[0]!;
  const [right, bottom] = c[2]!;
  return box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top;
};

describe("square outline (GSS-REQ-007, GSS-REQ-030, GSS-NFR-001)", () => {
  it("draws only the outline by default, centered", () => {
    const scene = sceneOf({ type: "square", sideLength: 4 });
    expect(scene.nodes.map((node) => node.kind)).toEqual(["polygon"]);
    const c = corners(scene);
    expect((c[0]![0] + c[1]![0]) / 2).toBe(200);
  });

  it("is the Scene createGraph returns, through the registered layout", () => {
    const description = { type: "square", sideLength: 4, labelSides: "all", showRightAngles: true, unit: "cm" };
    const result = createGraph(description);
    expect(result.ok && result.scene).toEqual(sceneOf(description));
  });

  it("draws four sides equal within 1%, at the same size whatever the side length", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.001, max: 1_000_000, noNaN: true }), (sideLength) => {
        const scene = sceneOf({ type: "square", sideLength });
        const lengths = sides(scene).map((s) => {
          const seg = s as { x1: number; y1: number; x2: number; y2: number };
          return Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
        });
        for (const length of lengths) {
          expect(Math.abs(length / lengths[0]! - 1)).toBeLessThanOrEqual(0.01);
          expect(length).toBe(DRAWN_SIDE);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("is a right-angled outline: horizontal and vertical sides", () => {
    const c = corners(sceneOf({ type: "square", sideLength: 4 }));
    expect(c[0]![1]).toBe(c[1]![1]);
    expect(c[1]![0]).toBe(c[2]![0]);
    expect(c[2]![1]).toBe(c[3]![1]);
    expect(c[3]![0]).toBe(c[0]![0]);
  });

  it("uses the line color for the outline", () => {
    expect(outline(sceneOf({ type: "square", sideLength: 4, lineColor: "red" })).attrs).toContainEqual(["stroke", "#c62828"]);
  });

  it("draws the title above the square", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, title: "Tile" });
    const [title] = texts(scene);
    expect(title!.text).toBe("Tile");
    expect(boxOf(title!).y + boxOf(title!).height).toBeLessThan(corners(scene)[0]![1]);
  });
});

describe("square labels (GSS-REQ-008, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  it("labels nothing by default", () => {
    expect(labelTexts(sceneOf({ type: "square", sideLength: 4, unit: "cm" }))).toEqual([]);
  });

  it("labels one side, the bottom, outside the square", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, unit: "cm", labelSides: "one" });
    const [label] = labelTexts(scene);
    expect(labelTexts(scene)).toHaveLength(1);
    expect(label!.text).toBe("4 cm");
    // Beside the bottom side, a gap below it and centered on it, not stacked further down.
    const c = corners(scene);
    const box = boxOf(label!);
    expect(box.y).toBeCloseTo(c[2]![1] + GAP, 1);
    expect(box.x + box.width / 2).toBeCloseTo((c[0]![0] + c[1]![0]) / 2, 1);
  });

  it("labels all four sides, each outside the square", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, unit: "cm", labelSides: "all" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["4 cm", "4 cm", "4 cm", "4 cm"]);
    const c = corners(scene);
    for (const node of labelTexts(scene)) expect(inside(boxOf(node), c)).toBe(false);
    // Each beside its own side, a gap away: bottom, top, left, right, in that order.
    const [left, top] = c[0]!;
    const [right, bottom] = c[2]!;
    const [b, t, l, r] = labelTexts(scene).map(boxOf);
    expect(b!.y).toBeCloseTo(bottom + GAP, 1);
    expect(t!.y + t!.height).toBeCloseTo(top - GAP, 1);
    expect(l!.x + l!.width).toBeCloseTo(left - GAP, 1);
    expect(r!.x).toBeCloseTo(right + GAP, 1);
  });

  it("shows the value alone when no unit is given", () => {
    expect(labelTexts(sceneOf({ type: "square", sideLength: 4, labelSides: "one" })).map((node) => node.text)).toEqual(["4"]);
  });

  it("shows a supplied value as written, with more than 2 decimals", () => {
    expect(labelTexts(sceneOf({ type: "square", sideLength: 1.23456, labelSides: "one" })).map((node) => node.text)).toEqual(["1.23456"]);
  });

  it("replaces the whole label with custom text, unit included, while the text alternative states the value (DEL-007)", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, unit: "cm", sideLabelText: "s" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["s"]);
    expect(scene.textAlternative).toContain("side length 4 cm");
  });

  it("labels all four sides with the custom text when labelSides is all", () => {
    expect(labelTexts(sceneOf({ type: "square", sideLength: 4, labelSides: "all", sideLabelText: "s" })).map((node) => node.text)).toEqual(["s", "s", "s", "s"]);
  });

  it.each(["", "   ", "   "])("draws nothing for a blank label, including text blank once cleaned: %j (DEL-003)", (sideLabelText) => {
    const scene = sceneOf({ type: "square", sideLength: 4, labelSides: "all", sideLabelText });
    expect(labelTexts(scene)).toEqual([]);
  });

  it("wraps a long label, and stacks it below the figure when it has no room beside the side", () => {
    const long = "the length of each side of the square, which this question asks you to find";
    const scene = sceneOf({ type: "square", sideLength: 4, sideLabelText: long });
    const parts = labelTexts(scene);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((node) => node.text).join(" ")).toBe(long);
    for (const box of parts.map(boxOf)) expect(box.y + box.height).toBeLessThanOrEqual(scene.height);
  });

  it("cuts a label longer than LABEL_MAX_LINES lines with an ellipsis (SEC-001, DEL-008)", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, sideLabelText: "around the square ".repeat(11) });
    const parts = labelTexts(scene);
    expect(parts).toHaveLength(LABEL_MAX_LINES);
    expect(parts[LABEL_MAX_LINES - 1]!.text.endsWith("…")).toBe(true);
    expect(scene.textAlternative).toContain("around the square ".repeat(11).trim());
  });

  it("places all four labels of the smallest square outside it, without overlap or crossing a side (spec Edge Case)", () => {
    for (const unit of [undefined, "cm", "millimetres"]) {
      const scene = sceneOf({ type: "square", sideLength: 0.001, labelSides: "all", ...(unit === undefined ? {} : { unit }) });
      const c = corners(scene);
      expect(labelTexts(scene)).toHaveLength(4);
      for (const node of labelTexts(scene)) expect(inside(boxOf(node), c)).toBe(false);
      expect(overlaps(scene)).toEqual([]);
    }
  });

  it("keeps the Scene small for caller text at the limits (SEC-001, SEC-002; GSV-REQ-052, GSV-REQ-053)", () => {
    const scene = sceneOf({
      type: "square",
      sideLength: 4,
      title: wordsOf(CALLER_TEXT_LIMIT),
      unit: "@".repeat(UNIT_TEXT_LIMIT),
      labelSides: "all",
      sideLabelText: wordsOf(CALLER_TEXT_LIMIT),
      showRightAngles: true,
    });
    // At most the title's and each of the four labels' capped lines, plus the outline and the four
    // right-angle marks.
    const LABELS = 4;
    const OUTLINE = 1;
    const MARKS = 4;
    expect(texts(scene).length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES);
    expect(scene.nodes.length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES + OUTLINE + MARKS);
  });

  it("never overlaps a label with another label, a side or the title (GSS-NFR-003, this figure)", () => {
    // Strings up to their full length, so labels and titles wrap and labels are stacked below the figure.
    const label = fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" }), fc.constantFrom("s", "?", "x cm"));
    fc.assert(
      fc.property(
        fc.record({
          sideLength: fc.constantFrom(0.001, 4, 1_000_000),
          labelSides: fc.constantFrom(undefined, "one", "all"),
          showRightAngles: fc.boolean(),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" })),
          unit: fc.oneof(fc.constant(undefined), fc.constantFrom("cm", "millimetres", "km"), fc.string({ maxLength: UNIT_TEXT_LIMIT, size: "max" })),
        }),
        label,
        (options, sideLabelText) => {
          const description: Record<string, unknown> = { type: "square", ...options, ...(sideLabelText === undefined ? {} : { sideLabelText }) };
          for (const key of Object.keys(description)) if (description[key] === undefined) delete description[key];
          if (!validate(description).valid) return; // caller text with characters plain text forbids
          const scene = sceneOf(description);
          expect(overlaps(scene)).toEqual([]);
          for (const node of texts(scene)) {
            const box = boxOf(node);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(scene.width);
            expect(box.y + box.height).toBeLessThanOrEqual(scene.height);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("right angles (GSS-REQ-009)", () => {
  it("draws no marks unless requested", () => {
    expect(marks(sceneOf({ type: "square", sideLength: 4 }))).toEqual([]);
    expect(marks(sceneOf({ type: "square", sideLength: 4, showRightAngles: false }))).toEqual([]);
  });

  it("marks all four corners, each mark inside its corner", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, showRightAngles: true });
    const found = marks(scene);
    expect(found).toHaveLength(4);
    const c = corners(scene);
    const [left, top] = c[0]!;
    const [right, bottom] = c[2]!;
    const hits = new Set<string>();
    for (const mark of found) {
      const points = text(mark, "points")
        .split(" ")
        .map((pair) => pair.split(",").map(Number) as [number, number]);
      const [a, corner, b] = points as [[number, number], [number, number], [number, number]];
      // Both ends lie on a side, and the bend lies the mark's size inside the corner.
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(left);
        expect(x).toBeLessThanOrEqual(right);
        expect(y).toBeGreaterThanOrEqual(top);
        expect(y).toBeLessThanOrEqual(bottom);
      }
      expect(Math.abs(a[0] - corner[0]) + Math.abs(a[1] - corner[1])).toBe(RIGHT_ANGLE_MARK);
      expect(Math.abs(b[0] - corner[0]) + Math.abs(b[1] - corner[1])).toBe(RIGHT_ANGLE_MARK);
      hits.add(`${corner[0] < (left + right) / 2 ? "left" : "right"}-${corner[1] < (top + bottom) / 2 ? "top" : "bottom"}`);
    }
    expect(hits.size).toBe(4);
  });

  it("keeps labels clear of the marks", () => {
    const scene = sceneOf({ type: "square", sideLength: 4, showRightAngles: true, labelSides: "all", unit: "cm" });
    expect(overlaps(scene)).toEqual([]);
  });
});

describe("square Scene (prd/TC-002, prd/TC-003 / AD-008, prd/CC-002)", () => {
  it("passes every number through fmt() and has no ids or url(#…) references, for the documented example", () => {
    const scene = sceneOf(JSON.parse(readFileSync("examples/square.json", "utf8")));
    expect(JSON.stringify(scene)).not.toMatch(/"id"|url\(/);
  });

  it("carries the definition's text alternative", () => {
    expect(sceneOf({ type: "square", sideLength: 4, unit: "cm", labelSides: "one" }).textAlternative).toBe("A square with side length 4 cm. One side is labeled.");
  });

  it("is the same Scene every time for the same description", () => {
    const example: unknown = JSON.parse(readFileSync("examples/square.json", "utf8"));
    expect(sceneOf(example)).toEqual(sceneOf(example));
  });
});
