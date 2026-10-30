import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Circle } from "../../src/core/definitions/circle";
import type { Cube } from "../../src/core/definitions/cube";
import { cylinderDisplay, type Cylinder } from "../../src/core/definitions/cylinder";
import type { Square } from "../../src/core/definitions/square";
import type { Triangle } from "../../src/core/definitions/triangle";
import { createGraph } from "../../src/graph";
import { DRAWN_EDGE } from "../../src/layout/cube";
import { ISO_SCALE } from "../../src/layout/kit/isometric";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { attr, lineLengths, outsideViewBox, polygonSides, segmentOfLine } from "../fixtures/scene-geometry";

// GSS-REQ-030, GSS-REQ-031, GSS-NFR-001: every ratio between two drawn lengths of a figure is within
// 1% of the ratio between the measurements, over each figure's examples and at least 200 generated
// valid descriptions. Lengths are read off the rendered coordinates (rounded to 0.01, as written).

const TOLERANCE = 0.01;
const RUNS = 250;

const example = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`examples/${name}.json`, "utf8")) as Record<string, unknown>;

/** The Scene and the normalized description createGraph returns for a valid description; a failure names its issues. */
function drawn<T>(description: unknown): { scene: Scene; normalized: T } {
  const result = createGraph(description);
  if (!result.ok) throw new Error(`expected a drawable figure, got ${JSON.stringify(result.issues)} for ${JSON.stringify(description)}`);
  return { scene: result.scene, normalized: result.description as T };
}

/**
 * Every pair of drawn lengths against the pair of measurements: `drawn[i] / drawn[j]` within 1% of
 * `measured[i] / measured[j]`. Returns the first pair that is not, with its ratios.
 */
function ratioMiss(drawnLengths: readonly number[], measured: readonly number[], names: readonly string[]): string | undefined {
  for (let i = 0; i < drawnLengths.length; i++) {
    for (let j = i + 1; j < drawnLengths.length; j++) {
      const got = drawnLengths[i]! / drawnLengths[j]!;
      const want = measured[i]! / measured[j]!;
      if (!(Math.abs(got / want - 1) <= TOLERANCE)) return `${names[i]} : ${names[j]} drawn ${got} against measured ${want} (off by ${(Math.abs(got / want - 1) * 100).toFixed(3)}%)`;
    }
  }
  return undefined;
}

const expectFits = (scene: Scene) => expect(outsideViewBox(scene)).toEqual([]);

/** A positive measurement from 0.001 to 1,000,000, spread evenly by magnitude. */
const measurement = fc.double({ min: -3, max: 6, noNaN: true }).map((exponent) => 10 ** exponent);
/** A positive ratio of at most `limit` : 1 either way, spread evenly by magnitude. */
const ratio = (limit: number) => fc.double({ min: -Math.log10(limit), max: Math.log10(limit), noNaN: true }).map((exponent) => 10 ** exponent);

// --- circle -------------------------------------------------------------------------------------

/** The drawn radius and diameter segments of a circle drawn with both: horizontal lines through the center. */
function circleSegments(scene: Scene): { radius: number; diameter: number } {
  const lines = lineLengths(scene);
  expect(lines).toHaveLength(2);
  // The diameter is the longer: it spans the circle, the radius spans half of it.
  const [radius, diameter] = [Math.min(...lines), Math.max(...lines)];
  return { radius, diameter };
}

describe("circle proportions (GSS-REQ-030, GSS-REQ-031, GSS-NFR-001)", () => {
  const bothDrawn = (description: Record<string, unknown>) => ({ ...description, showRadius: true, showDiameter: true });
  const check = (description: Record<string, unknown>) => {
    const { scene, normalized } = drawn<Circle>(bothDrawn(description));
    const { radius, diameter } = circleSegments(scene);
    expect(ratioMiss([radius, diameter], [normalized.radius, normalized.diameter], ["radius", "diameter"])).toBeUndefined();
    // The diameter is also twice the outline's own radius.
    const outline = scene.nodes.find((node) => node.kind === "circle" && Number(attr(node, "r")) > 0 && Number(attr(node, "r")) >= diameter / 2 - 0.01)!;
    expect(2 * Number(attr(outline, "r")) / diameter).toBeCloseTo(1, 2);
    expectFits(scene);
  };

  it("draws radius : diameter within 1% of the measurements on the example", () => check(example("circle")));

  it.each([{ radius: 0.001 }, { radius: 1_000_000 }, { diameter: 7 }, { circumference: 31.4 }, { circumference: 0.5 }])("holds for %j", (given) => check({ type: "circle", ...given }));

  it(`holds for ${RUNS} generated circles, given by any one of radius, diameter or circumference`, () => {
    fc.assert(
      fc.property(measurement, fc.constantFrom("radius", "diameter", "circumference"), (value, term) => {
        const description = { type: "circle", [term]: value };
        if (!createGraph(description).ok) return; // a term out of its range
        check(description);
      }),
      { numRuns: RUNS },
    );
  });
});

// --- square -------------------------------------------------------------------------------------

describe("square proportions (GSS-REQ-030, GSS-REQ-031, GSS-NFR-001)", () => {
  const check = (description: Record<string, unknown>) => {
    const { scene } = drawn<Square>(description);
    const polygon = scene.nodes.find((node) => node.kind === "polygon")!;
    const sides = polygonSides(polygon);
    expect(sides).toHaveLength(4);
    // One measurement: every ratio between two sides is 1.
    expect(ratioMiss(sides, [1, 1, 1, 1], ["top", "right", "bottom", "left"])).toBeUndefined();
    expectFits(scene);
  };

  it("draws four equal sides on the example", () => check(example("square")));

  it.each([0.001, 1, 1_000_000])("draws four equal sides for a side of %s", (sideLength) => check({ type: "square", sideLength, labelSides: "all", showRightAngles: true }));

  it(`draws four equal sides for ${RUNS} generated squares`, () => {
    fc.assert(fc.property(measurement, (sideLength) => check({ type: "square", sideLength, labelSides: "all" })), { numRuns: RUNS });
  });
});

// --- triangle -----------------------------------------------------------------------------------

/**
 * The drawn side a, b and c of a triangle: its polygon has corners A, B and C; side a is BC, b is
 * CA and c is AB (`SIDE_ENDS`).
 */
function triangleSides(scene: Scene): [number, number, number] {
  const [ab, bc, ca] = polygonSides(scene.nodes.find((node) => node.kind === "polygon")!);
  return [bc!, ca!, ab!];
}

describe("triangle proportions (GSS-REQ-030, GSS-REQ-031, GSS-NFR-001)", () => {
  const check = (description: unknown) => {
    const { scene, normalized } = drawn<Triangle>(description);
    expect(ratioMiss(triangleSides(scene), [normalized.sideA, normalized.sideB, normalized.sideC], ["a", "b", "c"]), JSON.stringify(description)).toBeUndefined();
    expectFits(scene);
  };

  it.each(["triangle", "triangle-sas", "triangle-asa", "triangle-vertices"])("draws a : b : c within 1%% of the measurements on examples/%s.json", (name) => check(example(name)));

  it("draws a very thin triangle (sides 1, 100, 100.5) to scale and within its viewBox", () => {
    check({ type: "triangle", sideA: 1, sideB: 100, sideC: 100.5, labelSides: "all", labelAngles: true });
  });

  it("draws a needle of 0.02 degrees to scale and within its viewBox", () => {
    // Its short side is about 0.03 drawing units long, below the 0.01 grid the coordinates are
    // written on (each end moves by up to 0.005 on each axis): the long sides' ratio is held to
    // 1%, the short one to 1% plus that grid (twice the half-step's diagonal, 0.0142).
    for (const description of [
      { type: "triangle", sideB: 100, sideC: 100, angleA: 0.02, labelSides: "all", labelAngles: true },
      { type: "triangle", angleA: 0.02, angleB: 89.98, sideC: 100, labelSides: "all", labelAngles: true },
    ]) {
      const { scene, normalized } = drawn<Triangle>(description);
      const sides = triangleSides(scene);
      const measured = [normalized.sideA, normalized.sideB, normalized.sideC];
      const shortest = measured.indexOf(Math.min(...measured));
      const long = [0, 1, 2].filter((i) => i !== shortest);
      expect(ratioMiss(long.map((i) => sides[i]!), long.map((i) => measured[i]!), ["long", "long"])).toBeUndefined();
      const scale = sides[long[0]!]! / measured[long[0]!]!;
      expect(Math.abs(sides[shortest]! - measured[shortest]! * scale)).toBeLessThanOrEqual(0.01 * measured[shortest]! * scale + 0.0142);
      expectFits(scene);
    }
  });

  it("draws a very large and a very small triangle to scale", () => {
    check({ type: "triangle", sideA: 3_000, sideB: 4_000, sideC: 5_000 });
    check({ type: "triangle", sideA: 0.003, sideB: 0.004, sideC: 0.005 });
  });

  /**
   * A triangle from its vertices; sides need to be at least `1 / 30` of the longest so the drawn
   * shortest side is long enough (about 7 drawing units) that the writer's 0.01 rounding stays well
   * under the 1% tolerance. Sides shorter than that are covered by the explicit needle cases.
   */
  const vertices = fc.record({ x: fc.double({ min: -1000, max: 1000, noNaN: true }), y: fc.double({ min: -1000, max: 1000, noNaN: true }) });
  const proportioned = (t: Triangle) => Math.min(t.sideA, t.sideB, t.sideC) / Math.max(t.sideA, t.sideB, t.sideC) >= 1 / 30;

  it(`holds for ${RUNS} generated triangles, from every determining set`, () => {
    fc.assert(
      fc.property(fc.tuple(vertices, vertices, vertices), (corners) => {
        const source = createGraph({ type: "triangle", vertices: corners });
        fc.pre(source.ok);
        const t = (source as unknown as { description: Triangle }).description;
        fc.pre(proportioned(t));
        const sets: Array<Record<string, unknown>> = [
          { vertices: corners },
          { sideA: t.sideA, sideB: t.sideB, sideC: t.sideC },
          { sideB: t.sideB, sideC: t.sideC, angleA: t.angleA },
          { sideA: t.sideA, sideC: t.sideC, angleB: t.angleB },
          { sideA: t.sideA, sideB: t.sideB, angleC: t.angleC },
          { angleA: t.angleA, angleB: t.angleB, sideC: t.sideC },
          { angleB: t.angleB, angleC: t.angleC, sideA: t.sideA },
          { angleC: t.angleC, angleA: t.angleA, sideB: t.sideB },
          { angleA: t.angleA, angleB: t.angleB, sideA: t.sideA },
        ];
        for (const set of sets) {
          const description = { type: "triangle", ...set, labelSides: "all", labelAngles: true };
          // A set the validator turns down (rounding in the derived values) is not a drawable description.
          if (createGraph(description).ok) check(description);
        }
      }),
      { numRuns: RUNS },
    );
  });
});

// --- cube ---------------------------------------------------------------------------------------

/** The page angle of a line in degrees, folded to 0..180. */
const pageAngle = (node: SceneNode) => {
  const s = segmentOfLine(node);
  return ((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI + 180) % 180;
};

describe("cube proportions (GSS-REQ-030, GSS-REQ-031, GSS-NFR-001)", () => {
  /** The projected axes: z up the page, x and y 30 degrees below the horizontal, either way. */
  const AXES = [90, 30, 150];

  const check = (description: Record<string, unknown>, edges: number) => {
    const { scene } = drawn<Cube>(description);
    const lines = scene.nodes.filter((node) => node.kind === "line");
    expect(lines).toHaveLength(edges);
    const lengths = lines.map((node) => segmentOfLine(node)).map((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1));
    expect(ratioMiss(lengths, lengths.map(() => 1), lengths.map((_, i) => `edge ${i}`))).toBeUndefined();
    // Every edge runs along a projected axis, each foreshortened by the same ISO_SCALE.
    for (const node of lines) expect(AXES.some((axis) => Math.abs(pageAngle(node) - axis) < 0.5)).toBe(true);
    // And each is the cube's one drawn edge length, whatever the edge length given (GSS-REQ-031; code review CR-003).
    for (const length of lengths) expect(Math.abs(length / DRAWN_EDGE - 1)).toBeLessThan(0.01);
    expectFits(scene);
  };

  it("draws all twelve edges equal on the example", () => check(example("cube"), 12));

  it("draws nine equal edges when the hidden ones are omitted", () => check({ type: "cube", edgeLength: 3, hiddenEdges: "omitted" }, 9));

  it.each([0.001, 1_000_000])("draws twelve equal edges for an edge of %s", (edgeLength) => check({ type: "cube", edgeLength, labelEdges: "three" }, 12));

  it(`draws twelve equal edges for ${RUNS} generated cubes`, () => {
    fc.assert(fc.property(measurement, fc.constantFrom(undefined, "one", "three"), (edgeLength, labelEdges) => check({ type: "cube", edgeLength, ...(labelEdges === undefined ? {} : { labelEdges }) }, 12)), {
      numRuns: RUNS,
    });
  });
});

// --- cylinder -----------------------------------------------------------------------------------

/**
 * The drawn side line, radius and diameter of a cylinder, each along its projected axis. The side
 * lines are the vertical lines; of the two other lines the radius runs to the lower right (the
 * projected y axis, down the page) and the diameter, when the radius is drawn too, to the upper
 * right (the projected x axis). Radius and diameter are lengths along projected axes, so both are
 * foreshortened by `ISO_SCALE`, like the side line; never read off the ellipse's `rx` (GSS
 * TICKET-001 CR-003).
 */
function cylinderLengths(scene: Scene, normalized: Cylinder): { side: number; radius?: number; diameter?: number } {
  const shown = cylinderDisplay(normalized);
  const lines = scene.nodes.filter((node) => node.kind === "line");
  const [vertical, slanted] = [lines.filter((node) => segmentOfLine(node).x1 === segmentOfLine(node).x2), lines.filter((node) => segmentOfLine(node).x1 !== segmentOfLine(node).x2)];
  expect(vertical).toHaveLength(2);
  const length = (node: SceneNode) => Math.hypot(segmentOfLine(node).x2 - segmentOfLine(node).x1, segmentOfLine(node).y2 - segmentOfLine(node).y1);
  const lengthsOf = { side: length(vertical[0]!) } as { side: number; radius?: number; diameter?: number };
  const down = (node: SceneNode) => segmentOfLine(node).y2 - segmentOfLine(node).y1;
  if (shown.radius.drawn && shown.diameter.drawn) {
    expect(slanted).toHaveLength(2);
    lengthsOf.radius = length(slanted.find((node) => down(node) > 0)!);
    lengthsOf.diameter = length(slanted.find((node) => down(node) < 0)!);
  } else if (shown.radius.drawn) {
    lengthsOf.radius = length(slanted[0]!);
  } else if (shown.diameter.drawn) {
    lengthsOf.diameter = length(slanted[0]!);
  }
  return lengthsOf;
}

/**
 * The cylinder's faces agree with its measurements (code review CR-002): the top ellipse's `rx` is
 * the radius at full length, so `rx × ISO_SCALE` is the radius drawn along a projected axis, in the
 * measurements' ratio to the side line; both base arcs have the top's radii; and the base's centre
 * line lies one side-line length below the top's centre. Compared here, never used to recover a
 * length for the ratios above (GSS TICKET-001 CR-003).
 */
function expectFacesAgree(scene: Scene, normalized: Cylinder, side: number): void {
  const top = scene.nodes.find((node) => node.kind === "ellipse")!;
  const [rx, ry, cy] = [Number(attr(top, "rx")), Number(attr(top, "ry")), Number(attr(top, "cy"))];
  const expectedRx = (side / ISO_SCALE) * (normalized.radius / normalized.height);
  expect(Math.abs((rx * ISO_SCALE) / side - normalized.radius / normalized.height) / (normalized.radius / normalized.height)).toBeLessThan(0.01);
  expect(Math.abs(rx - expectedRx)).toBeLessThan(Math.max(0.01 * expectedRx, 0.02));
  const arcs = scene.nodes.filter((node) => node.kind === "path");
  expect(arcs.length).toBeGreaterThan(0);
  for (const arc of arcs) {
    // "M x y A rx ry 0 0 1 x y"
    const numbers = String(attr(arc, "d")).match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
    expect(numbers[2]).toBeCloseTo(rx, 1);
    expect(numbers[3]).toBeCloseTo(ry, 1);
    expect(Math.abs(numbers[1]! - cy - side)).toBeLessThan(0.05);
  }
}

describe("cylinder proportions (GSS-REQ-030, GSS-REQ-031, GSS-NFR-001)", () => {
  const check = (description: Record<string, unknown>, proportions = true) => {
    const { scene, normalized } = drawn<Cylinder>(description);
    if (proportions) {
      const drawnLengths = cylinderLengths(scene, normalized);
      const names = ["height"];
      const measured = [normalized.height];
      const lengths = [drawnLengths.side];
      if (drawnLengths.radius !== undefined) {
        names.push("radius");
        measured.push(normalized.radius);
        lengths.push(drawnLengths.radius);
      }
      if (drawnLengths.diameter !== undefined) {
        names.push("diameter");
        measured.push(normalized.diameter);
        lengths.push(drawnLengths.diameter);
      }
      expect(lengths.length).toBeGreaterThan(1);
      expect(ratioMiss(lengths, measured, names), JSON.stringify(description)).toBeUndefined();
      expectFacesAgree(scene, normalized, drawnLengths.side);
    }
    expectFits(scene);
  };

  it("draws radius : diameter : height within 1% of the measurements on the example", () => check(example("cylinder")));

  it("holds with the radius or the diameter drawn alone", () => {
    check({ type: "cylinder", radius: 2, height: 5, showRadius: true });
    check({ type: "cylinder", radius: 2, height: 5, showDiameter: true });
    check({ type: "cylinder", diameter: 7, height: 3, showRadius: true, showDiameter: true, hiddenBase: "omitted" });
  });

  it("draws a very tall cylinder to scale, within its viewBox", () => check({ type: "cylinder", radius: 1, height: 80, showRadius: true, showDiameter: true, labelHeight: true }));
  it("draws a very wide cylinder to scale, within its viewBox", () => check({ type: "cylinder", radius: 1, height: 0.04, showRadius: true, showDiameter: true, labelHeight: true }));

  it("keeps every extreme cylinder within its viewBox, proportions or not", () => {
    for (const [radius, height] of [[0.001, 1_000_000], [1_000_000, 0.001], [1, 1000], [1000, 1], [0.001, 0.001], [1_000_000, 1_000_000]]) {
      check({ type: "cylinder", radius, height, showRadius: true, showDiameter: true, labelRadius: true, labelDiameter: true, labelHeight: true }, false);
    }
  });

  it(`holds for ${RUNS} generated cylinders, tall and wide up to 30 : 1`, () => {
    fc.assert(
      fc.property(measurement, ratio(30), fc.constantFrom("radius", "diameter"), fc.boolean(), fc.boolean(), (base, heightToBase, term, showRadius, showDiameter) => {
        const height = base * heightToBase;
        fc.pre(height >= 0.001 && height <= 1_000_000);
        const description = { type: "cylinder", [term]: base, height, showRadius: showRadius || !showDiameter, showDiameter };
        if (!createGraph(description).ok) return; // a radius, diameter or height out of its range
        check(description);
      }),
      { numRuns: RUNS },
    );
  });
});
