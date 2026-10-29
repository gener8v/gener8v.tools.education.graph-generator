import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Cube } from "../../src/core/definitions/cube";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { CUBE_EDGES, DRAWN_EDGE, cubeLayout } from "../../src/layout/cube";
import { checkScene } from "../../src/layout/kit/check";
import { LABEL_MAX_LINES } from "../../src/layout/kit/figure-labels";
import { HIDDEN_DASH } from "../../src/layout/kit/isometric";
import { type Box, type Obstacle, type Segment, placeLabel } from "../../src/layout/kit/labels";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT, TITLE_MAX_LINES } from "../../src/layout/kit/title";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { wordsOf } from "../fixtures/plain-text";

const LABEL_SIZE = 14;

/**
 * The Scene for a valid description; every Scene must pass checkScene (AD-007, AD-008). Calls the
 * layout directly, not through `createGraph`, so a layout exception fails the test with its own
 * message and stack instead of an `internal_error` (GSS TICKET-002 quality review QR-006).
 */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid cube, got ${JSON.stringify(result.issues)}`);
  const scene = cubeLayout(result.description as Cube, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
const has = (node: SceneNode, name: string) => node.attrs.some(([key]) => key === name);
const texts = (scene: Scene) => scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => attr(node, "font-size") === LABEL_SIZE);
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const solid = (scene: Scene) => lines(scene).filter((node) => !has(node, "stroke-dasharray"));
const dashed = (scene: Scene) => lines(scene).filter((node) => has(node, "stroke-dasharray"));
const segmentOf = (node: SceneNode): Segment => ({ x1: attr(node, "x1"), y1: attr(node, "y1"), x2: attr(node, "x2"), y2: attr(node, "y2") });
const lengthOf = (s: Segment) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const midpoint = (s: Segment) => [(s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2] as const;

/** The estimated box of one text line, as the layout reserved it. */
function boxOf(node: SceneNode & { text: string }): Box {
  const size = attr(node, "font-size");
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  return { x: attr(node, "x") - width / 2, y: attr(node, "y") - size * 0.8 - (lineHeight - size) / 2, width, height: lineHeight };
}

/** `boxOf` shrunk by `fmt()`'s rounding step on every side, as the square's test does (GSS TICKET-002 QR-001). */
function reservedBoxOf(node: SceneNode & { text: string }): Box {
  const box = boxOf(node);
  return { x: box.x + 0.01, y: box.y + 0.01, width: box.width - 0.02, height: box.height - 0.02 };
}

/** Every text line (labels and title) that overlaps another or crosses a drawn edge, solid or dashed (GSS-NFR-003). */
function overlaps(scene: Scene): string[] {
  const found: string[] = [];
  const boxes = texts(scene).map(reservedBoxOf);
  const figure: Obstacle[] = lines(scene).map(segmentOf);
  boxes.forEach((box, i) => {
    const others = [...boxes.slice(0, i), ...boxes.slice(i + 1), ...figure];
    if (placeLabel(box, [box], others) === undefined) found.push(texts(scene)[i]!.text);
  });
  return found;
}

/** The hexagon's bounds, from its drawn edges. */
function hexagon(scene: Scene) {
  const xs = lines(scene).flatMap((node) => [attr(node, "x1"), attr(node, "x2")]);
  const ys = lines(scene).flatMap((node) => [attr(node, "y1"), attr(node, "y2")]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), centerX: (Math.min(...xs) + Math.max(...xs)) / 2, centerY: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

describe("cube edges (GSS-REQ-023, GSS-REQ-024, GSS-REQ-030, GSS-REQ-032)", () => {
  it("finds 9 visible edges and 3 hidden ones, the hidden meeting at the back bottom corner", () => {
    expect(CUBE_EDGES).toHaveLength(12);
    expect(CUBE_EDGES.filter((edge) => edge.visible)).toHaveLength(9);
    const hidden = CUBE_EDGES.filter((edge) => !edge.visible);
    expect(hidden).toHaveLength(3);
    for (const edge of hidden) expect(edge.from).toEqual([0, 0, 0]);
  });

  it("draws 9 solid edges and 3 dashed ones by default", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3 });
    expect(solid(scene)).toHaveLength(9);
    expect(dashed(scene)).toHaveLength(3);
    for (const node of dashed(scene)) expect(node.attrs).toContainEqual(["stroke-dasharray", HIDDEN_DASH]);
    expect(sceneOf({ type: "cube", edgeLength: 3, hiddenEdges: "dashed" })).toEqual(scene);
  });

  it("draws only the 9 visible edges when the hidden ones are omitted", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3, hiddenEdges: "omitted" });
    expect(solid(scene)).toHaveLength(9);
    expect(dashed(scene)).toEqual([]);
  });

  it("draws all 12 edges equal within 1%, at the same size whatever the edge length (GSS-REQ-030, GSS-REQ-031)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.001, max: 1_000_000, noNaN: true }), (edgeLength) => {
        const scene = sceneOf({ type: "cube", edgeLength });
        const lengths = lines(scene).map((node) => lengthOf(segmentOf(node)));
        expect(lengths).toHaveLength(12);
        for (const length of lengths) {
          expect(Math.abs(length / lengths[0]! - 1)).toBeLessThanOrEqual(0.01);
          expect(Math.abs(length / DRAWN_EDGE - 1)).toBeLessThanOrEqual(0.001);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("draws a regular hexagon whose centre joins the three visible and the three hidden edges (GSS TICKET-001 CR-004)", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3 });
    const { centerX, centerY } = hexagon(scene);
    const atCenter = (s: Segment) => (Math.abs(s.x1 - centerX) < 0.02 && Math.abs(s.y1 - centerY) < 0.02) || (Math.abs(s.x2 - centerX) < 0.02 && Math.abs(s.y2 - centerY) < 0.02);
    expect(solid(scene).map(segmentOf).filter(atCenter)).toHaveLength(3);
    expect(dashed(scene).map(segmentOf).filter(atCenter)).toHaveLength(3);
    const { left, right, top, bottom } = hexagon(scene);
    expect(right - left).toBeCloseTo(Math.sqrt(3) * DRAWN_EDGE, 1);
    expect(bottom - top).toBeCloseTo(2 * DRAWN_EDGE, 1);
  });

  it("uses the line color for every edge", () => {
    for (const node of lines(sceneOf({ type: "cube", edgeLength: 3, lineColor: "red" }))) expect(node.attrs).toContainEqual(["stroke", "#c62828"]);
  });

  it("draws the title above the cube", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3, title: "Box" });
    const [title] = texts(scene);
    expect(title!.text).toBe("Box");
    expect(boxOf(title!).y + boxOf(title!).height).toBeLessThan(hexagon(scene).top);
  });

  it("is the Scene createGraph returns, through the registered layout", () => {
    const description = { type: "cube", edgeLength: 3, labelEdges: "three", unit: "cm" };
    const result = createGraph(description);
    expect(result.ok && result.scene).toEqual(sceneOf(description));
  });

  it("draws a cube at the edge-length limit, never an internal error (GSS TICKET-001 SEC-002)", () => {
    const result = createGraph({ type: "cube", edgeLength: 1_000_000, labelEdges: "three", unit: "km" });
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(lines(result.scene)).toHaveLength(12);
    expect(result.scene.textAlternative).toBe("A cube with edge length 1000000 km. Its hidden edges are dashed. Three edges meeting at a corner are labeled.");
  });
});

describe("cube labels (GSS-REQ-025, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  it("labels nothing by default", () => {
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 3, unit: "cm" }))).toEqual([]);
  });

  it("labels one edge, the bottom right, outside the hexagon beside its middle", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3, unit: "cm", labelEdges: "one" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["3 cm"]);
    const box = boxOf(labelTexts(scene)[0]!);
    const { centerX, bottom } = hexagon(scene);
    // The bottom right edge runs from the hexagon's bottom corner up to the right.
    const edge = solid(scene).map(segmentOf).find((s) => Math.min(s.x1, s.x2) === centerX && Math.max(s.y1, s.y2) === bottom && s.x1 !== s.x2)!;
    const [mx, my] = midpoint(edge);
    expect(box.x).toBeGreaterThan(mx - box.width);
    expect(box.y).toBeGreaterThan(my - box.height / 2);
    expect(Math.hypot(box.x + box.width / 2 - mx, box.y + box.height / 2 - my)).toBeLessThan(40);
    expect(overlaps(scene)).toEqual([]);
  });

  it("labels the three visible edges meeting at the front corner, each inside the hexagon between the spokes", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3, unit: "cm", labelEdges: "three" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["3 cm", "3 cm", "3 cm"]);
    const { left, right, top, bottom, centerX, centerY } = hexagon(scene);
    const spokes = solid(scene)
      .map(segmentOf)
      .filter((s) => (s.x1 === centerX && s.y1 === centerY) || (s.x2 === centerX && s.y2 === centerY));
    expect(spokes).toHaveLength(3);
    const boxes = labelTexts(scene).map(boxOf);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThan(left);
      expect(box.x + box.width).toBeLessThan(right);
      expect(box.y).toBeGreaterThan(top);
      expect(box.y + box.height).toBeLessThan(bottom);
    }
    // Each label beside its own spoke: the nearest spoke midpoint to each box is a different spoke.
    const nearest = boxes.map((box) => {
      const c = [box.x + box.width / 2, box.y + box.height / 2] as const;
      const distances = spokes.map((s) => Math.hypot(midpoint(s)[0] - c[0], midpoint(s)[1] - c[1]));
      return distances.indexOf(Math.min(...distances));
    });
    expect(new Set(nearest).size).toBe(3);
    expect(overlaps(scene)).toEqual([]);
  });

  it("shows the value alone when no unit is given, and a supplied value as written", () => {
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 3, labelEdges: "one" })).map((node) => node.text)).toEqual(["3"]);
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 1.23456, labelEdges: "one" })).map((node) => node.text)).toEqual(["1.23456"]);
  });

  it("replaces the whole label with custom text, unit included, while the text alternative states the value (DEL-007)", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 3, unit: "cm", edgeLabelText: "s" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["s"]);
    expect(scene.textAlternative).toBe("A cube with edge length 3 cm. Its hidden edges are dashed. One edge is labeled “s”.");
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 3, labelEdges: "three", edgeLabelText: "s" })).map((node) => node.text)).toEqual(["s", "s", "s"]);
  });

  it.each(["", "   ", "   "])("draws nothing for a blank label, including text blank once cleaned: %j (DEL-003)", (edgeLabelText) => {
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 3, labelEdges: "three", edgeLabelText }))).toEqual([]);
    expect(labelTexts(sceneOf({ type: "cube", edgeLength: 3, edgeLabelText }))).toEqual([]);
  });

  it("stacks a label with no room beside its edge below the figure, naming the edge", () => {
    const scene = sceneOf({ type: "cube", edgeLength: 1_000_000, unit: "millimetres", labelEdges: "three" });
    const stacked = labelTexts(scene).map((node) => node.text);
    expect(stacked.join(" ")).toContain("edge = 1000000");
    const { bottom } = hexagon(scene);
    for (const node of labelTexts(scene)) expect(boxOf(node).y).toBeGreaterThan(bottom);
    for (const node of labelTexts(scene)) expect(boxOf(node).y + boxOf(node).height).toBeLessThanOrEqual(scene.height);
    expect(overlaps(scene)).toEqual([]);
  });

  it("cuts a label longer than LABEL_MAX_LINES lines with an ellipsis (SEC-001, DEL-008)", () => {
    const long = "around the cube ".repeat(12);
    const scene = sceneOf({ type: "cube", edgeLength: 3, edgeLabelText: long });
    const parts = labelTexts(scene);
    expect(parts).toHaveLength(LABEL_MAX_LINES);
    expect(parts[LABEL_MAX_LINES - 1]!.text.endsWith("…")).toBe(true);
    expect(scene.textAlternative).toContain(long.trim());
  });

  it("keeps the Scene small for caller text at the limits (SEC-001, SEC-002; GSV-REQ-052, GSV-REQ-053)", () => {
    const scene = sceneOf({
      type: "cube",
      edgeLength: 3,
      title: wordsOf(CALLER_TEXT_LIMIT),
      unit: "@".repeat(UNIT_TEXT_LIMIT),
      labelEdges: "three",
      edgeLabelText: wordsOf(CALLER_TEXT_LIMIT),
    });
    const LABELS = 3;
    const EDGES = 12;
    expect(texts(scene).length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES);
    expect(scene.nodes.length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES + EDGES);
  });

  it("never overlaps a label with another label, a solid or dashed edge, or the title (GSS-NFR-003, this figure)", () => {
    // Strings up to their full length, so labels and titles wrap and labels are stacked below the figure.
    const label = fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" }), fc.constantFrom("s", "?", "x cm"));
    fc.assert(
      fc.property(
        fc.record({
          edgeLength: fc.constantFrom(0.001, 3, 123.456789, 1_000_000),
          hiddenEdges: fc.constantFrom(undefined, "dashed", "omitted"),
          labelEdges: fc.constantFrom(undefined, "one", "three"),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" })),
          unit: fc.oneof(fc.constant(undefined), fc.constantFrom("cm", "millimetres", "km"), fc.string({ maxLength: UNIT_TEXT_LIMIT, size: "max" })),
        }),
        label,
        (options, edgeLabelText) => {
          const description: Record<string, unknown> = { type: "cube", ...options, ...(edgeLabelText === undefined ? {} : { edgeLabelText }) };
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

describe("cube Scene (prd/TC-002, prd/TC-003 / AD-008, prd/CC-002)", () => {
  it("passes every number through fmt() and has no ids or url(#…) references, for the documented example", () => {
    const scene = sceneOf(JSON.parse(readFileSync("examples/cube.json", "utf8")));
    expect(JSON.stringify(scene)).not.toMatch(/"id"|url\(/);
  });

  it("carries the definition's text alternative", () => {
    expect(sceneOf({ type: "cube", edgeLength: 3, unit: "cm", labelEdges: "one" }).textAlternative).toBe(
      "A cube with edge length 3 cm. Its hidden edges are dashed. One edge is labeled.",
    );
  });

  it("is the same Scene every time for the same description", () => {
    const example: unknown = JSON.parse(readFileSync("examples/cube.json", "utf8"));
    expect(sceneOf(example)).toEqual(sceneOf(example));
  });
});
