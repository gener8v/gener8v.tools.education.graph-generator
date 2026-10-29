import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { wordsOf } from "../fixtures/plain-text";
import { validate } from "../../src/core/index";
import type { Circle } from "../../src/core/definitions/circle";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { type Box, type Obstacle, placeLabel } from "../../src/layout/kit/labels";
import { measurementLabel } from "../../src/layout/kit/measure";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT } from "../../src/layout/kit/title";
import { DRAWN_RADIUS, besideOutline, circleLayout } from "../../src/layout/circle";
import { LABEL_MAX_LINES } from "../../src/layout/kit/figure-labels";
import type { Scene, SceneNode } from "../../src/layout/scene";

const LABEL_SIZE = 14;

/**
 * The Scene for a valid description; every Scene must pass checkScene (AD-007, AD-008). Calls the
 * layout directly, not through `createGraph`, so a layout exception fails the test with its own
 * message and stack instead of an `internal_error` (quality review QR-006).
 */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid circle, got ${JSON.stringify(result.issues)}`);
  const scene = circleLayout(result.description as Circle, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
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

/**
 * `boxOf` shrunk by `fmt()`'s rounding step on every side: the box is rebuilt from rounded
 * coordinates, so two lines that only touch (consecutive lines of one text) would otherwise read
 * as overlapping (quality review QR-001).
 */
function reservedBoxOf(node: SceneNode & { text: string }): Box {
  const box = boxOf(node);
  return { x: box.x + 0.01, y: box.y + 0.01, width: box.width - 0.02, height: box.height - 0.02 };
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
  const boxes = texts(scene).map(reservedBoxOf);
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

  it("is the Scene createGraph returns, through the registered layout", () => {
    const result = createGraph({ type: "circle", radius: 5, showRadius: true, labelRadius: true });
    expect(result.ok && result.scene).toEqual(sceneOf({ type: "circle", radius: 5, showRadius: true, labelRadius: true }));
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

  it("replaces the whole label with custom text, unit included (DEL-007)", () => {
    const scene = sceneOf({ type: "circle", radius: 5, unit: "cm", circumferenceLabelText: "?", labelRadius: true });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["5 cm", "?"]);
  });

  it.each(["", "   ", "\u00a0 \u00a0"])("leaves a blank label's place empty, including text blank once cleaned: %j (DEL-003)", (radiusLabelText) => {
    const scene = sceneOf({ type: "circle", radius: 5, radiusLabelText });
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

  it("puts each beside-the-outline candidate outside the circle, centered on its axis (quality review QR-007)", () => {
    const center = { x: 200, y: 200 };
    const size = { width: 40, height: 16 };
    const candidates = besideOutline(center, size);
    expect(candidates).toHaveLength(8);
    for (const { x, y } of candidates) {
      // The box's nearest point to the center is outside the circle.
      const nearX = Math.max(x, Math.min(center.x, x + size.width));
      const nearY = Math.max(y, Math.min(center.y, y + size.height));
      expect(Math.hypot(nearX - center.x, nearY - center.y)).toBeGreaterThan(DRAWN_RADIUS);
    }
    // Top, bottom, right and left: centered on the vertical or horizontal axis.
    const [top, bottom, right, left] = candidates.slice(4);
    expect(top!.x + size.width / 2).toBe(center.x);
    expect(bottom!.x + size.width / 2).toBe(center.x);
    expect(right!.y + size.height / 2).toBe(center.y);
    expect(left!.y + size.height / 2).toBe(center.y);
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

  it("cuts a label longer than LABEL_MAX_LINES lines with an ellipsis (security review SEC-001, DEL-008)", () => {
    // 198 characters, inside the limit (GSV-REQ-052), and still more than four lines.
    const scene = sceneOf({ type: "circle", radius: 5, circumferenceLabelText: "around the circle ".repeat(11) });
    const parts = labelTexts(scene);
    expect(parts).toHaveLength(LABEL_MAX_LINES);
    expect(parts[LABEL_MAX_LINES - 1]!.text.endsWith("…")).toBe(true);
    expect(scene.textAlternative).toContain("around the circle ".repeat(11).trim());
  });

  // The bound is on the work (node counts), not on wall-clock time, which machine load made flaky
  // (DGP TICKET-004 code review resolution, 2026-10-14).
  it("keeps the Scene small for caller text at the limits (security review SEC-001, SEC-002; GSV-REQ-052, GSV-REQ-053)", () => {
    const scene = sceneOf({
      type: "circle",
      radius: 5,
      title: wordsOf(CALLER_TEXT_LIMIT),
      unit: "@".repeat(UNIT_TEXT_LIMIT),
      labelRadius: true,
      labelDiameter: true,
      labelCircumference: true,
    });
    // At most the title's and each label's capped lines, plus the outline and two segments.
    expect(texts(scene).length).toBeLessThanOrEqual(3 + 3 * LABEL_MAX_LINES);
    expect(scene.nodes.length).toBeLessThanOrEqual(3 + 3 * LABEL_MAX_LINES + 3);
  });

  it("never overlaps a label with another label, a segment or the outline (GSS-NFR-003, this figure)", () => {
    // Strings up to their full length (fast-check's default size caps them at 10 characters), so
    // labels and titles wrap and labels are stacked below the figure (quality review QR-001).
    const label = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 120, size: "max" }), fc.constantFrom("r", "?", "C = ?", "x cm"));
    fc.assert(
      fc.property(
        fc.record({
          showRadius: fc.boolean(),
          showDiameter: fc.boolean(),
          showCenter: fc.boolean(),
          labelRadius: fc.boolean(),
          labelDiameter: fc.boolean(),
          labelCircumference: fc.boolean(),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: 80, size: "max" })),
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
