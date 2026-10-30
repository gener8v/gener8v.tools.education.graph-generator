import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Cylinder } from "../../src/core/definitions/cylinder";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { FIT_HEIGHT, FIT_WIDTH, cylinderLayout, halfEllipse } from "../../src/layout/cylinder";
import { checkScene } from "../../src/layout/kit/check";
import { LABEL_MAX_LINES } from "../../src/layout/kit/figure-labels";
import { ELLIPSE_RATIO, HIDDEN_DASH, ISO_SCALE } from "../../src/layout/kit/isometric";
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
  if (!result.valid) throw new Error(`expected a valid cylinder, got ${JSON.stringify(result.issues)}`);
  const scene = cylinderLayout(result.description as Cylinder, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
const has = (node: SceneNode, name: string) => node.attrs.some(([key]) => key === name);
const texts = (scene: Scene) => scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => attr(node, "font-size") === LABEL_SIZE);
const kinds = (scene: Scene) => scene.nodes.filter((node) => node.kind !== "text").map((node) => node.kind);
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const paths = (scene: Scene) => scene.nodes.filter((node) => node.kind === "path");
const ellipses = (scene: Scene) => scene.nodes.filter((node) => node.kind === "ellipse");
const segmentOf = (node: SceneNode): Segment => ({ x1: attr(node, "x1"), y1: attr(node, "y1"), x2: attr(node, "x2"), y2: attr(node, "y2") });
const lengthOf = (s: Segment) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const isVertical = (s: Segment) => s.x1 === s.x2;

/** The two side lines, left then right: the vertical lines. */
const sides = (scene: Scene) =>
  lines(scene)
    .map(segmentOf)
    .filter(isVertical)
    .sort((a, b) => a.x1 - b.x1);
/** The radius and diameter segments on the top face: the lines that are not vertical. */
const faceLines = (scene: Scene) => lines(scene).map(segmentOf).filter((s) => !isVertical(s));

/** A base arc's numbers: "M x1 y A rx ry 0 0 1 x2 y". */
function arcOf(node: SceneNode) {
  const d = String(node.attrs.find(([key]) => key === "d")?.[1]);
  const match = /^M (\S+) (\S+) A (\S+) (\S+) 0 0 1 (\S+) (\S+)$/.exec(d);
  if (match === null) throw new Error(`not a base arc: ${d}`);
  const [x1, y1, rx, ry, x2, y2] = match.slice(1).map(Number) as [number, number, number, number, number, number];
  return { x1, y1, rx, ry, x2, y2, dashed: has(node, "stroke-dasharray"), back: x1 < x2 };
}

/** An ellipse, or the half of it from angle `from` to `to` (y down), as straight pieces. */
function ellipseSegments(cx: number, cy: number, rx: number, ry: number, from = 0, to = 2 * Math.PI): Segment[] {
  const pieces = 72;
  const found: Segment[] = [];
  for (let i = 0; i < pieces; i++) {
    const a = from + ((to - from) * i) / pieces;
    const b = from + ((to - from) * (i + 1)) / pieces;
    found.push({ x1: cx + rx * Math.cos(a), y1: cy + ry * Math.sin(a), x2: cx + rx * Math.cos(b), y2: cy + ry * Math.sin(b) });
  }
  return found;
}

/** Every drawn line of the figure: the lines, the top ellipse and the base arcs drawn, as segments. */
function figureSegments(scene: Scene): Segment[] {
  const found = lines(scene).map(segmentOf);
  for (const node of ellipses(scene)) found.push(...ellipseSegments(attr(node, "cx"), attr(node, "cy"), attr(node, "rx"), attr(node, "ry")));
  for (const node of paths(scene)) {
    const arc = arcOf(node);
    const cx = (arc.x1 + arc.x2) / 2;
    found.push(...(arc.back ? ellipseSegments(cx, arc.y1, arc.rx, arc.ry, Math.PI, 2 * Math.PI) : ellipseSegments(cx, arc.y1, arc.rx, arc.ry, 0, Math.PI)));
  }
  return found;
}

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

/** Every text line (labels and title) that overlaps another or crosses a drawn line, solid or dashed (GSS-NFR-003). */
function overlaps(scene: Scene): string[] {
  const found: string[] = [];
  const boxes = texts(scene).map(reservedBoxOf);
  const figure: Obstacle[] = figureSegments(scene);
  boxes.forEach((box, i) => {
    const others = [...boxes.slice(0, i), ...boxes.slice(i + 1), ...figure];
    if (placeLabel(box, [box], others) === undefined) found.push(texts(scene)[i]!.text);
  });
  return found;
}

/** The outline's bounds: the top ellipse, the sides and the base. */
function outline(scene: Scene) {
  const [top] = ellipses(scene);
  const [left, right] = sides(scene);
  const ry = attr(top!, "ry");
  return { left: left!.x1, right: right!.x1, top: attr(top!, "cy") - ry, bottom: left!.y2 + ry, topY: attr(top!, "cy"), baseY: left!.y2, cx: attr(top!, "cx") };
}

/** The drawn radius : height, both measured along projected axes with `ISO_SCALE` removed (GSS TICKET-001 CR-003). */
function drawnRatio(scene: Scene): number {
  const [radius] = faceLines(scene);
  const [side] = sides(scene);
  return lengthOf(radius!) / ISO_SCALE / (lengthOf(side!) / ISO_SCALE);
}

describe("the cylinder's outline (GSS-REQ-026, GSS-REQ-028, GSS-REQ-032)", () => {
  it("draws the top ellipse, two side lines, the front half of the base solid and the back half dashed", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5 });
    expect(kinds(scene).sort()).toEqual(["ellipse", "line", "line", "path", "path"]);
    const arcs = paths(scene).map(arcOf);
    expect(arcs.filter((arc) => arc.back)).toEqual([expect.objectContaining({ dashed: true })]);
    expect(arcs.filter((arc) => !arc.back)).toEqual([expect.objectContaining({ dashed: false })]);
    const back = paths(scene).find((node) => arcOf(node).back)!;
    expect(back.attrs).toContainEqual(["stroke-dasharray", HIDDEN_DASH]);
    for (const node of lines(scene)) expect(has(node, "stroke-dasharray")).toBe(false);
    expect(has(ellipses(scene)[0]!, "stroke-dasharray")).toBe(false);
    expect(sceneOf({ type: "cylinder", radius: 2, height: 5, hiddenBase: "dashed" })).toEqual(scene);
  });

  it("leaves the back half of the base out when the hidden base is omitted", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, hiddenBase: "omitted" });
    expect(paths(scene).map(arcOf)).toEqual([expect.objectContaining({ back: false, dashed: false })]);
    expect(JSON.stringify(scene)).not.toContain("stroke-dasharray");
  });

  it("joins the sides to the ends of the top ellipse and the base arcs, the base level under the top", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5 });
    const [top] = ellipses(scene);
    const [left, right] = sides(scene);
    const cx = attr(top!, "cx");
    const rx = attr(top!, "rx");
    expect(left!.x1).toBeCloseTo(cx - rx, 2);
    expect(right!.x1).toBeCloseTo(cx + rx, 2);
    expect(left!.y1).toBe(attr(top!, "cy"));
    for (const arc of paths(scene).map(arcOf)) {
      expect(arc.rx).toBe(rx);
      expect(arc.ry).toBe(attr(top!, "ry"));
      expect(arc.y1).toBe(left!.y2);
      expect([arc.x1, arc.x2].sort((a, b) => a - b)).toEqual([left!.x1, right!.x1]);
    }
    // A horizontal circle's ellipse in the isometric view (`isoEllipse`).
    expect(attr(top!, "ry") / rx).toBeCloseTo(ELLIPSE_RATIO, 3);
  });

  it("uses the line color for every line", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, lineColor: "red", showRadius: true, showDiameter: true });
    for (const node of scene.nodes.filter((n) => n.kind !== "text")) expect(node.attrs).toContainEqual(["stroke", "#c62828"]);
  });

  it("draws the title above the cylinder", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, title: "Can" });
    const [title] = texts(scene);
    expect(title!.text).toBe("Can");
    expect(boxOf(title!).y + boxOf(title!).height).toBeLessThan(outline(scene).top);
  });

  it("is the Scene createGraph returns, through the registered layout", () => {
    const description = { type: "cylinder", radius: 2, height: 5, labelRadius: true, labelHeight: true, unit: "cm" };
    const result = createGraph(description);
    expect(result.ok && result.scene).toEqual(sceneOf(description));
  });
});

describe("each base half's label obstacles follow its drawn arc (quality review QR-002)", () => {
  const [cx, cy, rx, ry] = [200, 300, 80, 46.19];

  it.each(["back", "front"] as const)("puts every obstacle piece of the %s half on the ellipse, on that half's side of the page", (half) => {
    const { d, segments } = halfEllipse(cx, cy, rx, ry, half);
    expect(segments.length).toBeGreaterThan(0);
    for (const s of segments) {
      for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]] as const) expect(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2).toBeCloseTo(1, 9);
      // The back half is the upper half on the page (y down), the front half the lower.
      const middle = (s.y1 + s.y2) / 2;
      if (half === "back") expect(middle).toBeLessThanOrEqual(cy);
      else expect(middle).toBeGreaterThanOrEqual(cy);
    }
    // The arc starts at the first piece's start and ends at the last piece's end.
    const ends = d.match(/-?[\d.]+/g)!.map(Number);
    expect(ends[0]).toBeCloseTo(segments[0]!.x1, 1);
    expect(ends[ends.length - 2]).toBeCloseTo(segments[segments.length - 1]!.x2, 1);
  });

  it("draws the dashed back half and the solid front half from these arcs", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5 });
    const paths = scene.nodes.filter((node) => node.kind === "path");
    const dashed = paths.filter((node) => node.attrs.some(([key]) => key === "stroke-dasharray"));
    expect(dashed).toHaveLength(1);
    expect(paths).toHaveLength(2);
  });
});

describe("the cylinder drawn to scale (GSS-REQ-030, GSS-REQ-031; GSS Edge Cases)", () => {
  it.each([
    ["the example", 2, 5],
    ["a very tall cylinder", 1, 100],
    ["a very wide cylinder", 50, 1],
  ])("draws %s with radius : height within 1%, along projected axes", (_name, radius, height) => {
    const scene = sceneOf({ type: "cylinder", radius, height, showRadius: true });
    expect(Math.abs(drawnRatio(scene) / (radius / height) - 1)).toBeLessThanOrEqual(0.01);
  });

  it("keeps the radius : height for any measurements a drawing can show", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.001, max: 1_000_000, noNaN: true }), fc.double({ min: 0.02, max: 50, noNaN: true }), (radius, ratio) => {
        const height = Math.min(1_000_000, Math.max(0.001, radius / ratio));
        const scene = sceneOf({ type: "cylinder", radius, height, showRadius: true });
        expect(Math.abs(drawnRatio(scene) / (radius / height) - 1)).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 },
    );
  });

  it("draws the radius along the projected y axis to the top ellipse, never across the page (GSS TICKET-001 CR-003)", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, showRadius: true });
    const [radius] = faceLines(scene);
    const { cx, topY } = outline(scene);
    const [top] = ellipses(scene);
    expect([radius!.x1, radius!.y1]).toEqual([cx, topY]);
    // Toward the lower right, 30° below the horizontal.
    expect(Math.atan2(radius!.y2 - radius!.y1, radius!.x2 - radius!.x1)).toBeCloseTo(Math.PI / 6, 3);
    const onEllipse = ((radius!.x2 - cx) / attr(top!, "rx")) ** 2 + ((radius!.y2 - topY) / attr(top!, "ry")) ** 2;
    expect(onEllipse).toBeCloseTo(1, 2);
  });

  it("draws the diameter through the center along x when the radius is drawn too, else along y", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, showRadius: true, showDiameter: true });
    const both = faceLines(scene);
    expect(both).toHaveLength(2);
    const { cx, topY } = outline(scene);
    // The radius starts at the top face's center; the diameter passes through it.
    const radius = both.find((s) => s.x1 === cx && s.y1 === topY)!;
    const diameter = both.find((s) => s !== radius)!;
    expect((diameter.x1 + diameter.x2) / 2).toBeCloseTo(cx, 1);
    expect((diameter.y1 + diameter.y2) / 2).toBeCloseTo(topY, 1);
    expect(lengthOf(diameter)).toBeCloseTo(2 * lengthOf(radius), 1);
    // Along x: up to the right, 30° above the horizontal; the radius runs 30° below it.
    const slope = (s: Segment) => (s.y2 - s.y1) / (s.x2 - s.x1);
    expect(slope(diameter)).toBeCloseTo(-Math.tan(Math.PI / 6), 3);
    expect(slope(radius)).toBeCloseTo(Math.tan(Math.PI / 6), 3);
    const [alone] = faceLines(sceneOf({ type: "cylinder", radius: 2, height: 5, showDiameter: true }));
    expect(slope(alone!)).toBeCloseTo(Math.tan(Math.PI / 6), 3);
    expect(lengthOf(alone!)).toBeCloseTo(lengthOf(diameter), 1);
  });

  it.each([
    [2, 5],
    [0.001, 1_000_000],
    [1_000_000, 0.001],
    [1_000_000, 1_000_000],
    [0.001, 0.001],
  ])("fits radius %d and height %d to the drawing's box, filling one side of it", (radius, height) => {
    const scene = sceneOf({ type: "cylinder", radius, height });
    const box = outline(scene);
    const width = box.right - box.left;
    const tall = box.bottom - box.top;
    expect(width).toBeLessThanOrEqual(FIT_WIDTH + 0.05);
    expect(tall).toBeLessThanOrEqual(FIT_HEIGHT + 0.05);
    expect(Math.max(width / FIT_WIDTH, tall / FIT_HEIGHT)).toBeCloseTo(1, 2);
  });

  it("draws a cylinder at the measurement limits, never an internal error (GSS TICKET-001 SEC-002)", () => {
    for (const [radius, height] of [
      [1_000_000, 1_000_000],
      [0.001, 1_000_000],
      [1_000_000, 0.001],
    ] as const) {
      const result = createGraph({ type: "cylinder", radius, height, showDiameter: true, labelRadius: true, labelDiameter: true, labelHeight: true, unit: "km" });
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      expect(checkScene(result.scene)).toEqual([]);
      expect(result.scene.textAlternative).toContain(`height ${height} km`);
    }
    const viaDiameter = createGraph({ type: "cylinder", diameter: 2_000_000, height: 1_000_000 });
    expect(viaDiameter.ok).toBe(true);
  });
});

describe("cylinder labels (GSS-REQ-029, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  it("labels nothing and draws no radius by default", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, unit: "cm" });
    expect(labelTexts(scene)).toEqual([]);
    expect(faceLines(scene)).toEqual([]);
  });

  it("labels the radius beside its segment on the top face", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, unit: "cm", labelRadius: true });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["2 cm"]);
    const [radius] = faceLines(scene);
    const box = boxOf(labelTexts(scene)[0]!);
    const mid = [(radius!.x1 + radius!.x2) / 2, (radius!.y1 + radius!.y2) / 2] as const;
    expect(Math.hypot(box.x + box.width / 2 - mid[0], box.y + box.height / 2 - mid[1])).toBeLessThan(40);
    expect(overlaps(scene)).toEqual([]);
  });

  it("labels the diameter, derived and rounded, beside its segment", () => {
    const scene = sceneOf({ type: "cylinder", radius: 1.23456, height: 5, labelDiameter: true });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["2.47"]);
    expect(overlaps(scene)).toEqual([]);
  });

  it("labels the height beside the right side line, outside the cylinder", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, unit: "cm", labelHeight: true });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["5 cm"]);
    const box = boxOf(labelTexts(scene)[0]!);
    const { right, topY, baseY } = outline(scene);
    expect(box.x).toBeGreaterThan(right);
    expect(box.y).toBeGreaterThan(topY);
    expect(box.y + box.height).toBeLessThan(baseY);
    expect(overlaps(scene)).toEqual([]);
  });

  it("labels the radius, the diameter and the height together without overlaps", () => {
    const scene = sceneOf(JSON.parse(readFileSync("examples/cylinder.json", "utf8")));
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["r", "d", "h = ?"]);
    expect(overlaps(scene)).toEqual([]);
  });

  it("replaces the whole label with custom text, unit included, while the text alternative states the value (DEL-007)", () => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, unit: "cm", heightLabelText: "h" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["h"]);
    expect(scene.textAlternative).toBe("A cylinder with radius 2 cm and height 5 cm. Its hidden base is dashed. The height is labeled “h”.");
  });

  it.each(["", "   ", "   "])("draws nothing for a blank label, including text blank once cleaned: %j (DEL-003)", (text) => {
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, radiusLabelText: text, diameterLabelText: text, heightLabelText: text });
    expect(labelTexts(scene)).toEqual([]);
    // The blank-labeled radius and diameter are still drawn.
    expect(faceLines(scene)).toHaveLength(2);
  });

  it("stacks a label with no room beside its line below the figure, naming what it labels", () => {
    // A very wide cylinder leaves no room beside its right side for a long height label.
    const scene = sceneOf({ type: "cylinder", radius: 1_000_000, height: 0.001, unit: "millimetres", labelHeight: true });
    const stacked = labelTexts(scene).map((node) => node.text).join(" ");
    expect(stacked).toBe("h = 0.001 millimetres");
    const { bottom } = outline(scene);
    for (const node of labelTexts(scene)) expect(boxOf(node).y).toBeGreaterThan(bottom);
    for (const node of labelTexts(scene)) expect(boxOf(node).y + boxOf(node).height).toBeLessThanOrEqual(scene.height);
    expect(overlaps(scene)).toEqual([]);
  });

  it("cuts a label longer than LABEL_MAX_LINES lines with an ellipsis (SEC-001, DEL-008)", () => {
    const long = "up the side of the cylinder ".repeat(7);
    const scene = sceneOf({ type: "cylinder", radius: 2, height: 5, heightLabelText: long });
    const parts = labelTexts(scene);
    expect(parts).toHaveLength(LABEL_MAX_LINES);
    expect(parts[LABEL_MAX_LINES - 1]!.text.endsWith("…")).toBe(true);
    expect(scene.textAlternative).toContain(long.trim());
  });

  it("keeps the Scene small for caller text at the limits (SEC-001, SEC-002; GSV-REQ-052, GSV-REQ-053)", () => {
    const scene = sceneOf({
      type: "cylinder",
      radius: 2,
      height: 5,
      title: wordsOf(CALLER_TEXT_LIMIT),
      unit: "@".repeat(UNIT_TEXT_LIMIT),
      radiusLabelText: wordsOf(CALLER_TEXT_LIMIT),
      diameterLabelText: wordsOf(CALLER_TEXT_LIMIT),
      heightLabelText: wordsOf(CALLER_TEXT_LIMIT),
    });
    const LABELS = 3;
    const SHAPES = 7; // top ellipse, two sides, two base arcs, radius, diameter
    expect(texts(scene).length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES);
    expect(scene.nodes.length).toBeLessThanOrEqual(TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES + SHAPES);
  });

  it("never overlaps a label with another label, a drawn line, the ellipse, the base or the title (GSS-NFR-003, this figure)", () => {
    // Strings up to their full length, so labels and titles wrap and labels are stacked below the figure.
    const label = fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" }), fc.constantFrom("r", "?", "x cm"));
    fc.assert(
      fc.property(
        fc.record({
          radius: fc.constantFrom(0.001, 2, 123.456789, 1_000_000),
          height: fc.constantFrom(0.001, 5, 98.7654321, 1_000_000),
          hiddenBase: fc.constantFrom(undefined, "dashed", "omitted"),
          showRadius: fc.constantFrom(undefined, true),
          showDiameter: fc.constantFrom(undefined, true),
          labelRadius: fc.constantFrom(undefined, true),
          labelDiameter: fc.constantFrom(undefined, true),
          labelHeight: fc.constantFrom(undefined, true),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" })),
          unit: fc.oneof(fc.constant(undefined), fc.constantFrom("cm", "millimetres", "km"), fc.string({ maxLength: UNIT_TEXT_LIMIT, size: "max" })),
          radiusLabelText: label,
          diameterLabelText: label,
          heightLabelText: label,
        }),
        (options) => {
          const description: Record<string, unknown> = { type: "cylinder", ...options };
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

describe("cylinder Scene (prd/TC-002, prd/TC-003 / AD-008, prd/CC-002)", () => {
  it("passes every number through fmt() and has no ids, clip paths or url(#…) references, for the documented example", () => {
    const scene = sceneOf(JSON.parse(readFileSync("examples/cylinder.json", "utf8")));
    expect(JSON.stringify(scene)).not.toMatch(/"id"|url\(|clip/);
  });

  it("carries the definition's text alternative", () => {
    expect(sceneOf({ type: "cylinder", radius: 2, height: 5, unit: "cm", title: "Can", showRadius: true }).textAlternative).toBe(
      "A cylinder titled “Can” with radius 2 cm and height 5 cm. Its radius is drawn. Its hidden base is dashed.",
    );
  });

  it("is the same Scene every time for the same description", () => {
    const example: unknown = JSON.parse(readFileSync("examples/cylinder.json", "utf8"));
    expect(sceneOf(example)).toEqual(sceneOf(example));
  });
});
