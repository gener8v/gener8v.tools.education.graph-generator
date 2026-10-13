import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { type Box, type Obstacle, placeLabel } from "../../src/layout/kit/labels";
import { measurementLabel } from "../../src/layout/kit/measure";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT } from "../../src/layout/kit/title";
import { DRAWN_RADIUS } from "../../src/layout/circle";
import type { Scene, SceneNode } from "../../src/layout/scene";

const LABEL_SIZE = 14;

/** The Scene for a valid description; every Scene must pass checkScene (AD-007, AD-008). */
function sceneOf(description: unknown): Scene {
  const result = createGraph(description);
  if (!result.ok) throw new Error(`expected a valid circle, got ${JSON.stringify(result.issues)}`);
  expect(checkScene(result.scene)).toEqual([]);
  return result.scene;
}

const attr = (node: SceneNode, name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const texts = (scene: Scene) => scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => attr(node, "font-size") === LABEL_SIZE);
const outline = (scene: Scene) => scene.nodes.find((node) => node.kind === "circle" && attr(node, "r") === DRAWN_RADIUS)!;

/** The estimated box of one text line, as the layout reserved it. */
function boxOf(node: SceneNode & { text: string }): Box {
  const size = attr(node, "font-size");
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  return { x: attr(node, "x") - width / 2, y: attr(node, "y") - size * 0.8 - (lineHeight - size) / 2, width, height: lineHeight };
}

const segmentOf = (node: SceneNode) => ({ x1: attr(node, "x1"), y1: attr(node, "y1"), x2: attr(node, "x2"), y2: attr(node, "y2") });
const length = (node: SceneNode) => Math.hypot(attr(node, "x2") - attr(node, "x1"), attr(node, "y2") - attr(node, "y1"));

/** The outline as many short segments. */
function outlineSegments(scene: Scene, pieces = 360): Obstacle[] {
  const circle = outline(scene);
  const [cx, cy, r] = [attr(circle, "cx"), attr(circle, "cy"), attr(circle, "r")];
  return Array.from({ length: pieces }, (_, i) => {
    const a = (2 * Math.PI * i) / pieces;
    const b = (2 * Math.PI * (i + 1)) / pieces;
    return { x1: cx + r * Math.cos(a), y1: cy + r * Math.sin(a), x2: cx + r * Math.cos(b), y2: cy + r * Math.sin(b) };
  });
}

/** Every text line (labels and title) that overlaps another, a drawn segment or the outline (GSS-NFR-003). */
function overlaps(scene: Scene): string[] {
  const found: string[] = [];
  const boxes = texts(scene).map(boxOf);
  const figure: Obstacle[] = [...lines(scene).map(segmentOf), ...outlineSegments(scene)];
  boxes.forEach((box, i) => {
    const others = [...boxes.slice(0, i), ...boxes.slice(i + 1), ...figure];
    if (placeLabel(box, [box], others) === undefined) found.push(texts(scene)[i]!.text);
  });
  return found;
}

describe("circle segments (GSS-REQ-001, GSS-REQ-003, GSS-REQ-004, GSS-REQ-005)", () => {
  it("draws only the outline by default", () => {
    const scene = sceneOf({ type: "circle", radius: 5 });
    expect(scene.nodes.map((node) => node.kind)).toEqual(["circle"]);
    expect(attr(outline(scene), "cx")).toBe(200);
  });

  it("draws the radius from the center horizontally to the right, to the circumference", () => {
    const scene = sceneOf({ type: "circle", radius: 5, showRadius: true });
    const circle = outline(scene);
    const [radius] = lines(scene);
    expect(segmentOf(radius!)).toEqual({ x1: attr(circle, "cx"), y1: attr(circle, "cy"), x2: attr(circle, "cx") + DRAWN_RADIUS, y2: attr(circle, "cy") });
  });

  it("draws the diameter through the center, and off the radius when both are drawn", () => {
    const alone = sceneOf({ type: "circle", radius: 5, showDiameter: true });
    const c = outline(alone);
    expect(segmentOf(lines(alone)[0]!)).toEqual({
      x1: attr(c, "cx") - DRAWN_RADIUS,
      y1: attr(c, "cy"),
      x2: attr(c, "cx") + DRAWN_RADIUS,
      y2: attr(c, "cy"),
    });

    const both = sceneOf({ type: "circle", radius: 5, showDiameter: true, showRadius: true });
    const [diameter, radius] = lines(both).map(segmentOf);
    expect((diameter!.x1 + diameter!.x2) / 2).toBe(attr(c, "cx"));
    expect((diameter!.y1 + diameter!.y2) / 2).toBe(attr(c, "cy"));
    // Not on the radius: the diameter is vertical while the radius is horizontal.
    expect(diameter!.x1).toBe(diameter!.x2);
    expect(radius!.y1).toBe(radius!.y2);
  });

  it("marks the center with a point", () => {
    const scene = sceneOf({ type: "circle", radius: 5, showCenter: true });
    const circle = outline(scene);
    const marks = scene.nodes.filter((node) => node.kind === "circle" && node !== circle);
    expect(marks).toHaveLength(1);
    expect([attr(marks[0]!, "cx"), attr(marks[0]!, "cy")]).toEqual([attr(circle, "cx"), attr(circle, "cy")]);
  });

  it("draws radius : diameter within 1% of 1 : 2, whatever the measurements (GSS-NFR-001, GSS-REQ-030)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.001, max: 1_000_000, noNaN: true }), (radius) => {
        const [diameter, radiusLine] = lines(sceneOf({ type: "circle", radius, showRadius: true, showDiameter: true }));
        expect(Math.abs(length(radiusLine!) / length(diameter!) - 0.5)).toBeLessThanOrEqual(0.005);
      }),
      { numRuns: 100 },
    );
  });

  it("uses the line color for the outline and segments", () => {
    const scene = sceneOf({ type: "circle", radius: 5, showRadius: true, lineColor: "red" });
    for (const node of [outline(scene), ...lines(scene)]) expect(node.attrs).toContainEqual(["stroke", "#c62828"]);
  });
});

describe("circle labels (GSS-REQ-006, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  it.each([
    [{ labelRadius: true }, ["5 cm"]],
    [{ labelDiameter: true }, ["10 cm"]],
    [{ labelCircumference: true }, ["31.42 cm"]],
    [{ labelRadius: true, labelCircumference: true }, ["5 cm", "31.42 cm"]],
  ])("labels each measurement independently: %j", (options, expected) => {
    expect(labelTexts(sceneOf({ type: "circle", radius: 5, unit: "cm", ...options })).map((node) => node.text)).toEqual(expected);
  });

  it("shows the value alone when no unit is given", () => {
    expect(labelTexts(sceneOf({ type: "circle", radius: 5, labelRadius: true })).map((node) => node.text)).toEqual(["5"]);
  });

  it("shows a supplied value as supplied, and a derived value with at most 2 decimals", () => {
    const scene = sceneOf({ type: "circle", radius: 5, circumference: 31.4, labelCircumference: true, labelDiameter: true });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["10", "31.4"]);
    const derived = sceneOf({ type: "circle", circumference: 31.4, labelRadius: true });
    expect(labelTexts(derived).map((node) => node.text)).toEqual(["5"]);
    expect(labelTexts(sceneOf({ type: "circle", radius: 1, labelCircumference: true }))[0]!.text).toBe("6.28");
    // More than 2 decimals: kept when supplied, rounded when derived.
    const precise = sceneOf({ type: "circle", radius: 1.2345, labelRadius: true, labelDiameter: true });
    expect(labelTexts(precise).map((node) => node.text).sort()).toEqual(["1.2345", "2.47"]);
  });

  it("puts the precision rule in measure.ts, shared with the text alternatives", () => {
    expect(measurementLabel(31.4, "supplied", "cm")).toBe("31.4 cm");
    expect(measurementLabel(31.41592, "derived", "cm")).toBe("31.42 cm");
    expect(measurementLabel(2.5, "derived")).toBe("2.5");
    expect(measurementLabel(0.0012, "derived")).toBe("0.0012");
    expect(measurementLabel(5, "supplied", "cm", "r")).toBe("r");
    expect(measurementLabel(5, "supplied", "cm", "")).toBe("");
  });

  it("replaces the value with custom text, while the text alternative still states the value", () => {
    const scene = sceneOf({ type: "circle", radius: 5, unit: "cm", radiusLabelText: "r", circumferenceLabelText: "?" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["r", "?"]);
    expect(scene.textAlternative).toContain("radius 5 cm");
    expect(scene.textAlternative).toContain("circumference 31.42 cm");
  });

  it("leaves a blank label's place empty (DEL-003)", () => {
    const scene = sceneOf({ type: "circle", radius: 5, radiusLabelText: "" });
    expect(labelTexts(scene)).toEqual([]);
    expect(lines(scene)).toHaveLength(1);
  });

  it("places the radius label beside the radius, and the circumference label next to the outline, outside it", () => {
    const scene = sceneOf({ type: "circle", radius: 5, labelRadius: true, labelCircumference: true });
    const circle = outline(scene);
    const [cx, cy] = [attr(circle, "cx"), attr(circle, "cy")];
    const [radiusLabel, circumferenceLabel] = labelTexts(scene).map(boxOf);
    // Above the radius, within its length.
    expect(radiusLabel!.y + radiusLabel!.height).toBeLessThanOrEqual(cy);
    expect(radiusLabel!.x).toBeGreaterThanOrEqual(cx);
    expect(radiusLabel!.x + radiusLabel!.width).toBeLessThanOrEqual(cx + DRAWN_RADIUS);
    // Outside the circle, its nearest corner within a label's height of the outline.
    const corner = { x: circumferenceLabel!.x, y: circumferenceLabel!.y + circumferenceLabel!.height };
    const distance = Math.hypot(corner.x - cx, corner.y - cy);
    expect(distance).toBeGreaterThan(DRAWN_RADIUS);
    expect(distance).toBeLessThan(DRAWN_RADIUS + LABEL_SIZE);
  });

  it("wraps a long label, and stacks a label with no clear place below the figure", () => {
    const text = "the distance all the way around the circle, which this question asks you to find";
    const scene = sceneOf({ type: "circle", radius: 5, circumferenceLabelText: text });
    const parts = labelTexts(scene);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((node) => node.text).join(" ")).toBe(text);
    const circle = outline(scene);
    for (const box of parts.map(boxOf)) {
      expect(box.y).toBeGreaterThan(attr(circle, "cy") + DRAWN_RADIUS);
      expect(box.y + box.height).toBeLessThanOrEqual(scene.height);
    }
  });

  it("never overlaps a label with another label, a segment or the outline (GSS-NFR-003, this figure)", () => {
    const label = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 120 }), fc.constantFrom("r", "?", "C = ?", "x cm"));
    fc.assert(
      fc.property(
        fc.record({
          showRadius: fc.boolean(),
          showDiameter: fc.boolean(),
          showCenter: fc.boolean(),
          labelRadius: fc.boolean(),
          labelDiameter: fc.boolean(),
          labelCircumference: fc.boolean(),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: 80 })),
          unit: fc.oneof(fc.constant(undefined), fc.constantFrom("cm", "millimetres", "km")),
        }),
        label,
        label,
        label,
        (options, radiusLabelText, diameterLabelText, circumferenceLabelText) => {
          // Switches on wherever text is given, so the description is valid.
          const description = {
            type: "circle",
            radius: 5,
            ...options,
            ...(radiusLabelText === undefined ? {} : { radiusLabelText, labelRadius: true, showRadius: true }),
            ...(diameterLabelText === undefined ? {} : { diameterLabelText, labelDiameter: true, showDiameter: true }),
            ...(circumferenceLabelText === undefined ? {} : { circumferenceLabelText, labelCircumference: true }),
            ...(options.labelRadius ? { showRadius: true } : {}),
            ...(options.labelDiameter ? { showDiameter: true } : {}),
          };
          if (!createGraph(description).ok) return; // caller text with characters plain text forbids
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

describe("circle Scene (prd/TC-002, prd/TC-003 / AD-008, prd/CC-002)", () => {
  it("passes every number through fmt() and has no ids or url(#…) references, for the documented example", () => {
    const scene = sceneOf(JSON.parse(readFileSync("examples/circle.json", "utf8")));
    const markup = JSON.stringify(scene);
    expect(markup).not.toMatch(/"id"|url\(/);
  });

  it("carries the definition's text alternative", () => {
    expect(sceneOf({ type: "circle", radius: 5, unit: "cm", labelRadius: true }).textAlternative).toBe(
      "A circle with radius 5 cm. Its radius is drawn.",
    );
  });

  it("draws the title above the circle", () => {
    const scene = sceneOf({ type: "circle", radius: 5, title: "Wheel" });
    const [title] = texts(scene);
    expect(title!.text).toBe("Wheel");
    expect(boxOf(title!).y + boxOf(title!).height).toBeLessThan(attr(outline(scene), "cy") - DRAWN_RADIUS);
  });

  it("is the same Scene every time for the same description", () => {
    const example: unknown = JSON.parse(readFileSync("examples/circle.json", "utf8"));
    expect(sceneOf(example)).toEqual(sceneOf(example));
  });
});
