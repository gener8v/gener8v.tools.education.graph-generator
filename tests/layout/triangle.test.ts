import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { type Triangle, triangle } from "../../src/core/definitions/triangle";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { GAP } from "../../src/layout/kit/figure-labels";
import { LABEL_MAX_LINES } from "../../src/layout/kit/figure-labels";
import { type Box, type Obstacle, placeLabel } from "../../src/layout/kit/labels";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT, TITLE_MAX_LINES } from "../../src/layout/kit/title";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { ARC_RADIUS, FIGURE_HEIGHT, FIGURE_WIDTH, RIGHT_ANGLE_MARK, triangleLayout } from "../../src/layout/triangle";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";

const LABEL_SIZE = 14;
type Vec = [number, number];

/**
 * The Scene for a valid description; every Scene must pass checkScene (AD-007, AD-008). Calls the
 * layout directly, not through `createGraph`, so a layout exception fails the test with its own
 * message and stack (GSS TICKET-002 quality review QR-006).
 */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid triangle, got ${JSON.stringify(result.issues)}`);
  const scene = triangleLayout(result.description as Triangle, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
const text = (node: SceneNode, name: string) => String(node.attrs.find(([key]) => key === name)?.[1]);
const texts = (scene: Scene) => scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => attr(node, "font-size") === LABEL_SIZE);
const labelOf = (scene: Scene, label: string) => labelTexts(scene).find((node) => node.text === label)!;
const points = (node: SceneNode): Vec[] =>
  text(node, "points")
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as Vec);
const outline = (scene: Scene) => scene.nodes.find((node) => node.kind === "polygon")!;
const marks = (scene: Scene) => scene.nodes.filter((node) => node.kind === "polyline");

/** The drawn vertices A, B and C, in that order. */
const vertices = (scene: Scene) => points(outline(scene)) as [Vec, Vec, Vec];

/** The drawn sides and marks, as segments. */
function figureLines(scene: Scene): Obstacle[] {
  const v = vertices(scene);
  const lines: Obstacle[] = v.map((p, i) => ({ x1: p[0], y1: p[1], x2: v[(i + 1) % 3]![0], y2: v[(i + 1) % 3]![1] }));
  for (const mark of marks(scene)) {
    const m = points(mark);
    for (let k = 0; k + 1 < m.length; k++) lines.push({ x1: m[k]![0], y1: m[k]![1], x2: m[k + 1]![0], y2: m[k + 1]![1] });
  }
  return lines;
}

/** The estimated box of one text line, as the layout reserved it. */
function boxOf(node: SceneNode & { text: string }): Box {
  const size = attr(node, "font-size");
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  return { x: attr(node, "x") - width / 2, y: attr(node, "y") - size * 0.8 - (lineHeight - size) / 2, width, height: lineHeight };
}

/** `boxOf` shrunk by `fmt()`'s rounding step on every side, as the square's test does. */
function reservedBoxOf(node: SceneNode & { text: string }): Box {
  const box = boxOf(node);
  return { x: box.x + 0.01, y: box.y + 0.01, width: box.width - 0.02, height: box.height - 0.02 };
}

/** Every text line (labels and title) that overlaps another or crosses a side or a mark (GSS-NFR-003). */
function overlaps(scene: Scene): string[] {
  const found: string[] = [];
  const all = texts(scene);
  const boxes = all.map(reservedBoxOf);
  const lines = figureLines(scene);
  boxes.forEach((box, i) => {
    const others = [...boxes.slice(0, i), ...boxes.slice(i + 1), ...lines];
    if (placeLabel(box, [box], others) === undefined) found.push(all[i]!.text);
  });
  return found;
}

const cross = (o: Vec, p: Vec, q: Vec) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
function insideTriangle(p: Vec, v: [Vec, Vec, Vec]): boolean {
  const s = [cross(v[0], v[1], p), cross(v[1], v[2], p), cross(v[2], v[0], p)];
  return s.every((x) => x > 0) || s.every((x) => x < 0);
}
const centerOf = (box: Box): Vec => [box.x + box.width / 2, box.y + box.height / 2];
const distance = (p: Vec, q: Vec) => Math.hypot(p[0] - q[0], p[1] - q[1]);

describe("orientation of a triangle given by sides and angles (GSS-REQ-022)", () => {
  // [description, the side it stands on, its left and right ends, the vertex above]
  it.each<[string, object, string, number, number, number]>([
    ["three sides", { sideA: 3, sideB: 4, sideC: 5 }, "a", 1, 2, 0],
    ["two sides and the angle between them", { sideB: 4, sideC: 5, angleA: 36.87 }, "b", 2, 0, 1],
    ["two angles and the side between them", { angleA: 40, angleB: 60, sideC: 5 }, "c", 0, 1, 2],
    ["two angles and another side", { angleA: 40, angleC: 60, sideA: 5 }, "a", 1, 2, 0],
    ["two sides and an angle not between them", { sideC: 5, sideB: 4, angleC: 90 }, "b", 2, 0, 1],
    ["a set with a later side checked", { sideB: 4, sideC: 5, angleA: 36.8699, sideA: 3 }, "a", 1, 2, 0],
  ])("%s stands on side %s, its ends counter-clockwise left to right, the third vertex above", (_name, input, _side, left, right, apex) => {
    const v = vertices(sceneOf({ type: "triangle", ...input }));
    expect(v[left]![1]).toBe(v[right]![1]);
    expect(v[left]![0]).toBeLessThan(v[right]![0]);
    expect(v[apex]![1]).toBeLessThan(v[left]![1]);
  });

  it("draws the same Scene on every render", () => {
    for (const name of ["triangle", "triangle-sas", "triangle-asa", "triangle-vertices"]) {
      const example: unknown = JSON.parse(readFileSync(`examples/${name}.json`, "utf8"));
      expect(sceneOf(example), name).toEqual(sceneOf(example));
    }
  });
});

describe("a triangle given by its vertices (GSS-REQ-013, GSS-REQ-031)", () => {
  // The drawing is y-down: a vertex higher in the description is drawn higher, never mirrored.
  it.each<[string, Vec[]]>([
    ["counter-clockwise", [[0, 0], [4, 0], [0, 3]]],
    ["clockwise", [[0, 0], [0, 3], [4, 0]]],
    ["clockwise, off the origin", [[-2, 5], [1, 9], [6, -1]]],
  ])("keeps the vertices' relative positions, %s, scaled to fit", (_name, given) => {
    const v = vertices(sceneOf({ type: "triangle", vertices: given.map(([x, y]) => ({ x, y })) }));
    const scale = distance(v[0], v[1]) / distance(given[0]!, given[1]!);
    for (const i of [1, 2]) {
      // Each offset from A is the description's offset times one scale, with y flipped.
      expect(v[i]![0] - v[0]![0]).toBeCloseTo((given[i]![0] - given[0]![0]) * scale, 1);
      expect(v[i]![1] - v[0]![1]).toBeCloseTo(-(given[i]![1] - given[0]![1]) * scale, 1);
    }
    // The turn A → B → C keeps its sense: y flips, so the cross product changes sign.
    const turn = (p: Vec[]) => Math.sign(cross(p[0]!, p[1]!, p[2]!));
    expect(turn(v)).toBe(-turn(given));
  });
});

describe("drawn to scale (GSS-REQ-030, GSS-REQ-031)", () => {
  const sideLengths = (scene: Scene) => {
    const v = vertices(scene);
    return [distance(v[1], v[2]), distance(v[2], v[0]), distance(v[0], v[1])];
  };
  const extent = (scene: Scene) => {
    const v = vertices(scene);
    const xs = v.map((p) => p[0]);
    const ys = v.map((p) => p[1]);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };

  it.each<[object]>([[{ sideA: 3, sideB: 4, sideC: 5 }], [{ sideA: 0.003, sideB: 0.004, sideC: 0.005 }], [{ sideA: 1, sideB: 100, sideC: 100.5 }], [{ sideA: 7, sideB: 7, sideC: 7 }], [{ sideA: 999_999, sideB: 500_000, sideC: 600_000 }]])(
    "draws sides in the ratios of %j, fitting the figure box",
    (input) => {
      const scene = sceneOf({ type: "triangle", ...input });
      const drawn = sideLengths(scene);
      const given = [(input as { sideA: number }).sideA, (input as { sideB: number }).sideB, (input as { sideC: number }).sideC];
      for (const i of [1, 2]) expect(Math.abs(drawn[i]! / drawn[0]! / (given[i]! / given[0]!) - 1)).toBeLessThanOrEqual(0.01);
      const { width, height } = extent(scene);
      expect(width).toBeLessThanOrEqual(FIGURE_WIDTH + 0.02);
      expect(height).toBeLessThanOrEqual(FIGURE_HEIGHT + 0.02);
      // One dimension fills its limit.
      expect(Math.max(width / FIGURE_WIDTH, height / FIGURE_HEIGHT)).toBeCloseTo(1, 3);
    },
  );

  it("centers the figure and draws it below the title, in the line color", () => {
    const scene = sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, title: "Roof", lineColor: "red" });
    const v = vertices(scene);
    const xs = v.map((p) => p[0]);
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(200, 1);
    const [title] = texts(scene);
    expect(title!.text).toBe("Roof");
    expect(boxOf(title!).y + boxOf(title!).height).toBeLessThan(Math.min(...v.map((p) => p[1])));
    expect(outline(scene).attrs).toContainEqual(["stroke", "#c62828"]);
  });
});

describe("labels (GSS-REQ-020, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  const RICH = { type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "cm", labelSides: "all", labelAngles: true, vertexNames: ["P", "Q", "R"] };

  it("draws only the outline by default", () => {
    expect(sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "cm" }).nodes.map((node) => node.kind)).toEqual(["polygon"]);
  });

  it("labels each side outside the triangle with its length and unit, beside its own side", () => {
    const scene = sceneOf(RICH);
    const v = vertices(scene);
    const ends: Array<[string, Vec, Vec]> = [["3 cm", v[1], v[2]], ["4 cm", v[2], v[0]], ["5 cm", v[0], v[1]]];
    for (const [label, p, q] of ends) {
      const center = centerOf(boxOf(labelOf(scene, label)));
      expect(insideTriangle(center, v), label).toBe(false);
      // Nearer its own side's middle than any vertex is to it.
      const middle: Vec = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      expect(distance(center, middle), label).toBeLessThan(distance(p, q) / 2);
    }
  });

  it("labels each angle inside it, in degrees, and each vertex outside it, by name", () => {
    const scene = sceneOf(RICH);
    const v = vertices(scene);
    const angles: Array<[string, number]> = [["36.87°", 0], ["53.13°", 1], ["90°", 2]];
    for (const [label, i] of angles) {
      const center = centerOf(boxOf(labelOf(scene, label)));
      expect(insideTriangle(center, v), label).toBe(true);
      // Nearer its own vertex than either other vertex.
      for (const j of [0, 1, 2].filter((j) => j !== i)) expect(distance(center, v[i]!), label).toBeLessThan(distance(center, v[j]!));
    }
    for (const [name, i] of [["P", 0], ["Q", 1], ["R", 2]] as const) {
      const box = boxOf(labelOf(scene, name));
      expect(insideTriangle(centerOf(box), v), name).toBe(false);
      for (const j of [0, 1, 2].filter((j) => j !== i)) expect(distance(centerOf(box), v[i]!), name).toBeLessThan(distance(centerOf(box), v[j]!));
    }
    expect(overlaps(scene)).toEqual([]);
  });

  it("labels one side, the one it stands on, for labelSides one", () => {
    const scene = sceneOf({ type: "triangle", angleA: 40, angleB: 60, sideC: 5, labelSides: "one" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["5"]);
    const v = vertices(scene);
    // Below side c, which runs along the bottom from A to B.
    expect(boxOf(labelTexts(scene)[0]!).y).toBeGreaterThan(v[0]![1]);
  });

  it("shows a supplied value as written and a derived one rounded", () => {
    const scene = sceneOf({ type: "triangle", sideA: 3.14159, sideB: 4, angleC: 90, labelSides: "all", labelAngles: true });
    const shown = labelTexts(scene).map((node) => node.text);
    expect(shown).toContain("3.14159");
    expect(shown).toContain("90°");
    expect(shown).toContain("5.09");
  });

  it("replaces the whole label with custom text, unit and degree sign included, while the text alternative states the value (DEL-007)", () => {
    const scene = sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "cm", sideCLabelText: "x", angleALabelText: "θ" });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["x", "θ"]);
    expect(scene.textAlternative).toContain("c 5 cm");
    expect(scene.textAlternative).toContain("A 36.87°");
    // A custom angle label still marks its angle.
    expect(marks(scene)).toHaveLength(1);
  });

  it.each(["", "   "])("draws nothing for a blank label or name, including text blank once cleaned: %j (DEL-003)", (blank) => {
    const scene = sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, sideALabelText: blank, angleBLabelText: blank, vertexNames: [blank, "Q"] });
    expect(labelTexts(scene).map((node) => node.text)).toEqual(["Q"]);
    // The blank angle label still has its arc, a place to fill in.
    expect(marks(scene)).toHaveLength(1);
  });

  it("cuts a label or a name longer than LABEL_MAX_LINES lines with an ellipsis, and stacks it below the figure (SEC-001, DEL-006, DEL-008)", () => {
    const long = "around the triangle ".repeat(10).trim();
    for (const options of [{ sideBLabelText: long }, { angleCLabelText: long }, { vertexNames: [long] }]) {
      const scene = sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, ...options });
      const parts = labelTexts(scene);
      expect(parts).toHaveLength(LABEL_MAX_LINES);
      expect(parts[LABEL_MAX_LINES - 1]!.text.endsWith("…")).toBe(true);
      const bottom = Math.max(...vertices(scene).map((p) => p[1]));
      for (const box of parts.map(boxOf)) {
        expect(box.y).toBeGreaterThan(bottom);
        expect(box.y + box.height).toBeLessThanOrEqual(scene.height);
      }
      expect(overlaps(scene)).toEqual([]);
    }
  });
});

describe("angle marks (GSS-REQ-020, GSS-REQ-021)", () => {
  const isRightMark = (mark: SceneNode, vertex: Vec) => {
    const [a, bend, b] = points(mark) as [Vec, Vec, Vec];
    return points(mark).length === 3 && distance(a, vertex) <= RIGHT_ANGLE_MARK + 0.01 && distance(b, vertex) <= RIGHT_ANGLE_MARK + 0.01 && distance(bend, vertex) > distance(a, vertex);
  };
  /** Whether every point lies the same distance from `vertex`, at most ARC_RADIUS. */
  const isArc = (mark: SceneNode, vertex: Vec) => {
    const radii = points(mark).map((p) => distance(p, vertex));
    return radii.every((r) => Math.abs(r - radii[0]!) < 0.05) && radii[0]! <= ARC_RADIUS + 0.01;
  };

  it("draws no marks unless the angles are shown", () => {
    expect(marks(sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelSides: "all" }))).toEqual([]);
    expect(marks(sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelAngles: false }))).toEqual([]);
  });

  it("marks a 90° angle with a right-angle mark and the others with arcs", () => {
    const scene = sceneOf({ type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelAngles: true });
    const v = vertices(scene);
    const [a, b, c] = marks(scene);
    expect(isArc(a!, v[0]) && isArc(b!, v[1])).toBe(true);
    expect(isRightMark(c!, v[2])).toBe(true);
    expect(overlaps(scene)).toEqual([]);
  });

  it("marks an angle within 1% of 90° as right, and one just outside with an arc", () => {
    const within = sceneOf({ type: "triangle", sideA: 3, sideB: 4, angleC: 90.8, labelAngles: true });
    expect(isRightMark(marks(within)[2]!, vertices(within)[2])).toBe(true);
    const outside = sceneOf({ type: "triangle", sideA: 3, sideB: 4, angleC: 91, labelAngles: true });
    expect(isArc(marks(outside)[2]!, vertices(outside)[2])).toBe(true);
  });

  it("marks every angle of a triangle with no right angle with an arc", () => {
    const scene = sceneOf({ type: "triangle", sideA: 4, sideB: 5, sideC: 6, labelAngles: true });
    const v = vertices(scene);
    expect(marks(scene).map((mark, i) => isArc(mark, v[i]!))).toEqual([true, true, true]);
  });
});

describe("thin triangles (spec Edge Case; GSS TICKET-004 SEC-001; GSS-NFR-003)", () => {
  const labeled = { labelSides: "all", labelAngles: true, vertexNames: ["A", "B", "C"], unit: "cm" };

  it.each<[string, object]>([
    ["sides 1, 100, 100.5", { sideA: 1, sideB: 100, sideC: 100.5 }],
    ["sides 100.5, 100, 1", { sideA: 100.5, sideB: 100, sideC: 1 }],
    ["a 0.02° needle, angles 0.02°, 0.02° and the side between them", { angleA: 0.02, angleB: 0.02, sideC: 1_000_000 }],
    ["a 0.02° needle standing on its short side", { angleA: 0.02, angleB: 90, sideA: 0.001 }],
    ["a needle given by its vertices", { vertices: [{ x: -900_000, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 500 }] }],
  ])("draws %s with finite coordinates and no label over another or a line", (_name, input) => {
    const description = { type: "triangle", ...input, ...labeled };
    expect(validate(description).valid).toBe(true);
    const scene = sceneOf(description);
    for (const node of scene.nodes) {
      for (const [, value] of node.attrs) if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
    // Every label is drawn somewhere: three names, three sides and three angles.
    expect(labelTexts(scene)).toHaveLength(9);
    expect(overlaps(scene)).toEqual([]);
    for (const node of texts(scene)) {
      const box = boxOf(node);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(scene.width);
      expect(box.y + box.height).toBeLessThanOrEqual(scene.height);
    }
  });

  it("names what each stacked label labels, so a needle's labels below the figure can be told apart (code review CR-001)", () => {
    const scene = sceneOf({ type: "triangle", angleA: 0.02, angleB: 0.02, sideC: 1_000_000, ...labeled });
    // The stack starts below the room kept for one line of labels under the figure.
    const stackTop = Math.max(...vertices(scene).map(([, y]) => y)) + GAP + LABEL_SIZE * LINE_HEIGHT;
    const stacked = (node: SceneNode & { text: string }) => boxOf(node).y >= stackTop - 0.5;
    const below = labelTexts(scene).filter(stacked);
    expect(below.length).toBeGreaterThan(0);
    for (const node of below) expect(node.text).toMatch(/^(∠[ABC] = |[abc] = |vertex [ABC]: )/);
    for (const node of labelTexts(scene).filter((node) => !stacked(node))) expect(node.text).not.toMatch(/^(∠|[abc] = |vertex )/);
  });

  it("draws sides 1, 100, 100.5 to scale", () => {
    const v = vertices(sceneOf({ type: "triangle", sideA: 1, sideB: 100, sideC: 100.5 }));
    const a = distance(v[1], v[2]);
    expect(Math.abs(distance(v[2], v[0]) / a / 100 - 1)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(distance(v[0], v[1]) / a / 100.5 - 1)).toBeLessThanOrEqual(0.01);
  });

  it("never overlaps a label with another label, a line or the title (GSS-NFR-003, this figure)", () => {
    const caller = fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" }), fc.constantFrom("x", "?", "θ", "x cm"));
    const sets = fc.constantFrom<object>(
      { sideA: 3, sideB: 4, sideC: 5 },
      { sideA: 1, sideB: 100, sideC: 100.5 },
      { angleA: 0.02, angleB: 0.02, sideC: 1_000_000 },
      { sideB: 6, sideC: 4, angleA: 50 },
      { angleA: 45, angleB: 60, sideC: 8 },
      { vertices: [{ x: 0, y: 0 }, { x: 6, y: 1 }, { x: 2, y: 5 }] },
      { vertices: [{ x: 0, y: 0 }, { x: 0, y: -3 }, { x: -4, y: 0 }] },
    );
    fc.assert(
      fc.property(
        sets,
        fc.record({
          labelSides: fc.constantFrom(undefined, "one", "all"),
          labelAngles: fc.constantFrom(undefined, true),
          title: fc.oneof(fc.constant(undefined), fc.string({ maxLength: CALLER_TEXT_LIMIT, size: "max" })),
          unit: fc.oneof(fc.constant(undefined), fc.constantFrom("cm", "millimetres"), fc.string({ maxLength: UNIT_TEXT_LIMIT, size: "max" })),
          sideALabelText: caller,
          sideBLabelText: caller,
          angleCLabelText: caller,
        }),
        fc.array(caller.map((name) => name ?? "P"), { maxLength: 3 }),
        (set, options, vertexNames) => {
          const description: Record<string, unknown> = { type: "triangle", ...set, ...options, vertexNames };
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

describe("caller text at its limits (SEC-001, SEC-002; GSV-REQ-052, GSV-REQ-053)", () => {
  it("keeps the Scene small, every text through wrap with a line cap, vertex names included", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const texts9 = { sideALabelText: long, sideBLabelText: long, sideCLabelText: long, angleALabelText: long, angleBLabelText: long, angleCLabelText: long };
    for (const text of [long, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT))]) {
      const scene = sceneOf({
        type: "triangle",
        sideA: 3,
        sideB: 4,
        sideC: 5,
        title: text,
        unit: "@".repeat(UNIT_TEXT_LIMIT),
        labelSides: "all",
        labelAngles: true,
        ...(text === long ? texts9 : { sideALabelText: text, angleBLabelText: text }),
        vertexNames: [text, text, text],
      });
      // The title's capped lines, and nine labels (three sides, three angles, three names) of at
      // most LABEL_MAX_LINES each; plus the outline and three angle marks.
      expect(texts(scene).length).toBeLessThanOrEqual(TITLE_MAX_LINES + 9 * LABEL_MAX_LINES);
      expect(scene.nodes.length).toBeLessThanOrEqual(TITLE_MAX_LINES + 9 * LABEL_MAX_LINES + 1 + 3);
      expect(overlaps(scene)).toEqual([]);
    }
  });
});

describe("triangle Scene (prd/TC-002, prd/TC-003 / AD-008, prd/CC-002)", () => {
  it("passes every number through fmt() and has no ids or url(#…) references, for every example", () => {
    for (const name of ["triangle", "triangle-sas", "triangle-asa", "triangle-vertices"]) {
      const scene = sceneOf(JSON.parse(readFileSync(`examples/${name}.json`, "utf8")));
      expect(JSON.stringify(scene)).not.toMatch(/"id"|url\(/);
      expect(overlaps(scene), name).toEqual([]);
    }
  });

  it("carries the definition's text alternative, naming the triangle and every shown label", () => {
    const description = { type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "cm", labelSides: "one", labelAngles: true, angleALabelText: "θ", vertexNames: ["P", "Q", "R"] };
    const result = validate(description);
    if (!result.valid) throw new Error("expected a valid triangle");
    const scene = sceneOf(description);
    expect(scene.textAlternative).toBe(triangle.describe(result.description as Triangle, result.provenance));
    expect(scene.textAlternative).toBe(
      "A triangle with sides a 3 cm, b 4 cm and c 5 cm, and angles A 36.87°, B 53.13° and C 90°. Its vertices are named “P”, “Q” and “R”. Side a is labeled with its length. Angles B and C are labeled with their measures. Angle A is labeled “θ”. Angle C is marked as a right angle.",
    );
  });

  it("is the Scene createGraph returns, through the registered layout", () => {
    const description: unknown = JSON.parse(readFileSync("examples/triangle.json", "utf8"));
    const result = createGraph(description);
    expect(result.ok && result.scene).toEqual(sceneOf(description));
  });
});
