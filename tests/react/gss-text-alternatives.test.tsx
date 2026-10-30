import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { circleDisplay, type Circle } from "../../src/core/definitions/circle";
import { cubeDisplay, type Cube } from "../../src/core/definitions/cube";
import { cylinderDisplay, type Cylinder } from "../../src/core/definitions/cylinder";
import { squareLabels, type Square } from "../../src/core/definitions/square";
import { triangleDisplay, type Triangle } from "../../src/core/definitions/triangle";
import { formatMeasurement, sourceOf, stateMeasurement } from "../../src/core/format";
import type { Provenance } from "../../src/core/result";
import { createGraph } from "../../src/graph";
import { Graph } from "../../src/react/Graph";

// GSS-NFR-004: every rendered figure carries a non-empty text alternative that names the figure and
// states every shown measurement. Each description renders through the package's entry component;
// the alternative is read from the rendered `aria-label` and `<title>`. A measurement is shown when
// the figure draws or labels it (the figures' own display rules); its value is stated as the text
// alternative formats it: a supplied value as written, a derived one rounded, a length with its
// unit and an angle with its degree sign.

const example = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`examples/${name}.json`, "utf8")) as Record<string, unknown>;

/** The accessible name and the `<title>` of the SVG `<Graph>` renders for a description. */
function renderedName(description: unknown): { label: string; title: string } {
  const markup = renderToStaticMarkup(<Graph description={description} />);
  const svg = new JSDOM(markup).window.document.querySelector("svg");
  if (svg === null) throw new Error(`no figure rendered for ${JSON.stringify(description)}: ${markup}`);
  return { label: svg.getAttribute("aria-label") ?? "", title: svg.querySelector("title")?.textContent ?? "" };
}

type Shown = (normalized: never, provenance: Provenance) => string[];

/** Per figure: the word that names it, and the statement of each measurement it shows. */
const FIGURES: Record<string, { name: RegExp; shown: Shown }> = {
  circle: {
    name: /\bcircle\b/i,
    shown: ((c: Circle, p: Provenance) => {
      const display = circleDisplay(c);
      return (["radius", "diameter", "circumference"] as const).filter((term) => display[term].drawn || display[term].labeled).map((term) => stateMeasurement(c[term], sourceOf(p, term), c.unit));
    }) as Shown,
  },
  square: {
    name: /\bsquare\b/i,
    shown: ((s: Square, p: Provenance) => (squareLabels(s).count > 0 ? [stateMeasurement(s.sideLength, sourceOf(p, "sideLength"), s.unit)] : [])) as Shown,
  },
  triangle: {
    name: /\btriangle\b/i,
    shown: ((t: Triangle, p: Provenance) => {
      const display = triangleDisplay(t, p);
      const sides = (["sideA", "sideB", "sideC"] as const).filter((term) => display.sides[term].labeled).map((term) => stateMeasurement(t[term], sourceOf(p, term), t.unit));
      const angles = (["angleA", "angleB", "angleC"] as const).filter((term) => display.angles[term].labeled).map((term) => `${formatMeasurement(t[term], sourceOf(p, term))}°`);
      return [...sides, ...angles];
    }) as Shown,
  },
  cube: {
    name: /\bcube\b/i,
    shown: ((c: Cube, p: Provenance) => (cubeDisplay(c).labeled > 0 ? [stateMeasurement(c.edgeLength, sourceOf(p, "edgeLength"), c.unit)] : [])) as Shown,
  },
  cylinder: {
    name: /\bcylinder\b/i,
    shown: ((c: Cylinder, p: Provenance) => {
      const display = cylinderDisplay(c);
      return (["radius", "diameter", "height"] as const).filter((term) => display[term].drawn || display[term].labeled).map((term) => stateMeasurement(c[term], sourceOf(p, term), c.unit));
    }) as Shown,
  },
};

/** Every label mode of each figure, with and without a unit, a title and custom or blank label text. */
const FIXTURES: Record<keyof typeof FIGURES, Array<[string, Record<string, unknown>]>> = {
  circle: [
    ["by radius, nothing shown", { type: "circle", radius: 5 }],
    ["by diameter, drawn", { type: "circle", diameter: 7, showDiameter: true }],
    ["by circumference, labeled", { type: "circle", circumference: 31.4, labelCircumference: true, unit: "cm" }],
    ["every label", { type: "circle", radius: 2.5, showRadius: true, showDiameter: true, showCenter: true, labelRadius: true, labelDiameter: true, labelCircumference: true, unit: "m", title: "Circle facts" }],
    ["custom label text", { type: "circle", radius: 5, radiusLabelText: "r", diameterLabelText: "d", circumferenceLabelText: "C = ?" }],
    ["blank labels", { type: "circle", radius: 5, radiusLabelText: "", diameterLabelText: " ", labelCircumference: true }],
    ["extreme size", { type: "circle", radius: 1_000_000, labelRadius: true, labelDiameter: true, labelCircumference: true }],
  ],
  square: [
    ["no labels", { type: "square", sideLength: 4 }],
    ["one side", { type: "square", sideLength: 4, labelSides: "one", unit: "cm" }],
    ["all sides", { type: "square", sideLength: 0.001, labelSides: "all", showRightAngles: true, unit: "mm", title: "Tile" }],
    ["custom label text", { type: "square", sideLength: 4, sideLabelText: "s" }],
    ["blank label", { type: "square", sideLength: 4, labelSides: "all", sideLabelText: "" }],
    ["extreme size", { type: "square", sideLength: 1_000_000, labelSides: "all" }],
  ],
  triangle: [
    ["sides, no labels", { type: "triangle", sideA: 3, sideB: 4, sideC: 5 }],
    ["sides, one side labeled", { type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelSides: "one", unit: "cm" }],
    ["sides, all labeled", { type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelSides: "all", labelAngles: true, unit: "cm" }],
    ["sides, custom label text", { type: "triangle", sideA: 3, sideB: 4, sideC: 5, sideCLabelText: "x", angleALabelText: "θ" }],
    ["sides, blank labels", { type: "triangle", sideA: 3, sideB: 4, sideC: 5, sideALabelText: "", angleBLabelText: "" }],
    ["two sides and the angle between", { type: "triangle", sideB: 6, sideC: 4, angleA: 50, labelSides: "all", labelAngles: true, unit: "m" }],
    ["two angles and the side between", { type: "triangle", angleA: 45, angleB: 60, sideC: 8, labelSides: "one", labelAngles: true }],
    ["two angles and another side", { type: "triangle", angleA: 45, angleB: 60, sideA: 8, labelSides: "all", labelAngles: true }],
    ["vertices", { type: "triangle", vertices: [{ x: 0, y: 0 }, { x: 6, y: 1 }, { x: 2, y: 5 }], labelSides: "all", labelAngles: true, vertexNames: ["A", "B", "C"] }],
    ["very thin", { type: "triangle", sideA: 1, sideB: 100, sideC: 100.5, labelSides: "all", labelAngles: true }],
    ["right angle", { type: "triangle", sideA: 3, sideB: 4, sideC: 5, labelAngles: true, title: "Right triangle" }],
  ],
  cube: [
    ["no labels", { type: "cube", edgeLength: 3 }],
    ["one edge", { type: "cube", edgeLength: 3, labelEdges: "one", unit: "cm" }],
    ["three edges", { type: "cube", edgeLength: 0.5, labelEdges: "three", hiddenEdges: "omitted", unit: "m", title: "Dice" }],
    ["custom label text", { type: "cube", edgeLength: 3, edgeLabelText: "s" }],
    ["blank label", { type: "cube", edgeLength: 3, labelEdges: "three", edgeLabelText: "" }],
    ["extreme size", { type: "cube", edgeLength: 1_000_000, labelEdges: "three" }],
  ],
  cylinder: [
    ["nothing drawn", { type: "cylinder", radius: 2, height: 5 }],
    ["radius drawn", { type: "cylinder", radius: 2, height: 5, showRadius: true }],
    ["diameter drawn", { type: "cylinder", diameter: 7, height: 3, showDiameter: true, hiddenBase: "omitted" }],
    ["every label", { type: "cylinder", radius: 2, height: 5, labelRadius: true, labelDiameter: true, labelHeight: true, unit: "cm", title: "Can" }],
    ["custom label text", { type: "cylinder", radius: 2, height: 5, radiusLabelText: "r", diameterLabelText: "d", heightLabelText: "h = ?" }],
    ["blank labels", { type: "cylinder", radius: 2, height: 5, radiusLabelText: "", heightLabelText: " " }],
    ["very tall and very wide", { type: "cylinder", radius: 1, height: 80, labelHeight: true }],
  ],
};

const EXAMPLES: Record<keyof typeof FIGURES, string[]> = {
  circle: ["circle"],
  square: ["square"],
  triangle: ["triangle", "triangle-sas", "triangle-asa", "triangle-vertices"],
  cube: ["cube"],
  cylinder: ["cylinder"],
};

describe("every figure's text alternative names the figure and states every shown measurement (GSS-NFR-004)", () => {
  for (const [figure, { name, shown }] of Object.entries(FIGURES)) {
    const cases: Array<[string, unknown]> = [
      ...EXAMPLES[figure]!.map((file) => [`examples/${file}.json`, example(file)] as [string, unknown]),
      ...FIXTURES[figure]!.map(([label, description]) => [label, description] as [string, unknown]),
    ];
    describe(figure, () => {
      it.each(cases)("%s", (_label, description) => {
        const result = createGraph(description);
        if (!result.ok) throw new Error(`expected a drawable ${figure}, got ${JSON.stringify(result.issues)}`);
        const { label, title } = renderedName(description);
        expect(label.trim()).not.toBe("");
        expect(label).toMatch(name);
        expect(label).toBe(result.scene.textAlternative);
        expect(title).toBe(label);
        for (const statement of shown(result.description as never, result.provenance)) expect(label, `states ${statement}`).toContain(statement);
      });

      it("states at least one measurement in the fixtures that show any", () => {
        const counts = FIXTURES[figure]!.map(([, description]) => {
          const result = createGraph(description);
          return result.ok ? shown(result.description as never, result.provenance).length : 0;
        });
        expect(Math.max(...counts)).toBeGreaterThan(0);
      });
    });
  }
});
