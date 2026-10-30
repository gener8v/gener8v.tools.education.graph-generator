import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { createGraph } from "../../src/graph";
import { fmt } from "../../src/layout/kit/format";
import { SCENE_WIDTH } from "../../src/layout/scene";
import type { Scene } from "../../src/layout/scene";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { labelOverlaps, outsideViewBox } from "../fixtures/scene-geometry";

// GSS-NFR-003: no estimated label box overlaps another label or a figure line, with the default
// font, on every documented example, and on every figure with all its labels at the caller-text
// limit, as ordinary words and as one unbreakable cluster. Boxes are estimated from the text
// metrics (`textWidth`), as the layouts reserve them; nothing is measured in a browser.

const example = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`examples/${name}.json`, "utf8")) as Record<string, unknown>;

function sceneOf(description: unknown): Scene {
  const result = createGraph(description);
  if (!result.ok) throw new Error(`expected a drawable figure, got ${JSON.stringify(result.issues)}`);
  return result.scene;
}

const EXAMPLES = ["circle", "square", "triangle", "triangle-sas", "triangle-asa", "triangle-vertices", "cube", "cylinder"] as const;

describe("label overlap on the figure examples (GSS-NFR-003)", () => {
  it.each(EXAMPLES)("no label overlaps a label or a figure line on examples/%s.json", (name) => {
    const scene = sceneOf(example(name));
    expect(scene.nodes.some((node) => node.kind === "text")).toBe(true);
    expect(labelOverlaps(scene)).toEqual([]);
    expect(outsideViewBox(scene)).toEqual([]);
  });

  it.each(EXAMPLES)("with every label shown too, on examples/%s.json", (name) => {
    const all: Record<string, Record<string, unknown>> = {
      circle: { showRadius: true, showDiameter: true, showCenter: true, labelRadius: true, labelDiameter: true, labelCircumference: true },
      square: { labelSides: "all", showRightAngles: true },
      triangle: { labelSides: "all", labelAngles: true },
      "triangle-sas": { labelSides: "all", labelAngles: true },
      "triangle-asa": { labelSides: "all", labelAngles: true },
      "triangle-vertices": { labelSides: "all", labelAngles: true },
      cube: { labelEdges: "three" },
      cylinder: { showRadius: true, showDiameter: true, labelRadius: true, labelDiameter: true, labelHeight: true },
    };
    expect(labelOverlaps(sceneOf({ ...example(name), ...all[name] }))).toEqual([]);
  });
});

/** Each figure with every label shown, `text` as every label's text; a second description of a stretched figure where there is one. */
const stressed = (text: string): Array<[string, Record<string, unknown>]> => [
  ["circle", { type: "circle", radius: 5, showCenter: true, radiusLabelText: text, diameterLabelText: text, circumferenceLabelText: text }],
  ["square", { type: "square", sideLength: 4, showRightAngles: true, labelSides: "all", sideLabelText: text }],
  [
    "triangle",
    {
      type: "triangle",
      sideA: 3,
      sideB: 4,
      sideC: 5,
      vertexNames: ["A", "B", "C"],
      sideALabelText: text,
      sideBLabelText: text,
      sideCLabelText: text,
      angleALabelText: text,
      angleBLabelText: text,
      angleCLabelText: text,
    },
  ],
  [
    "very thin triangle",
    { type: "triangle", sideA: 1, sideB: 100, sideC: 100.5, vertexNames: ["A", "B", "C"], sideALabelText: text, sideBLabelText: text, sideCLabelText: text, angleALabelText: text, angleBLabelText: text, angleCLabelText: text },
  ],
  ["cube", { type: "cube", edgeLength: 3, labelEdges: "three", edgeLabelText: text }],
  ["cylinder", { type: "cylinder", radius: 2, height: 5, radiusLabelText: text, diameterLabelText: text, heightLabelText: text }],
  ["very tall cylinder", { type: "cylinder", radius: 1, height: 80, radiusLabelText: text, diameterLabelText: text, heightLabelText: text }],
  ["very wide cylinder", { type: "cylinder", radius: 1, height: 0.04, radiusLabelText: text, diameterLabelText: text, heightLabelText: text }],
];

describe("label overlap with every label at the caller-text limit (GSS-NFR-003)", () => {
  const cases: Array<[string, string, Record<string, unknown>]> = [
    ...stressed(wordsOf(CALLER_TEXT_LIMIT)).map(([name, description]) => ["words", name, description] as [string, string, Record<string, unknown>]),
    ...Object.entries(oneClusterTexts(CALLER_TEXT_LIMIT)).flatMap(([kind, text]) => stressed(text).map(([name, description]) => [kind, name, description] as [string, string, Record<string, unknown>])),
  ];

  it.each(cases)("%s: the %s", (_kind, _name, description) => {
    const scene = sceneOf(description);
    expect(scene.nodes.filter((node) => node.kind === "text").length).toBeGreaterThan(0);
    expect(labelOverlaps(scene)).toEqual([]);
    expect(outsideViewBox(scene)).toEqual([]);
  });
});

describe("the overlap finder (GSS-NFR-003)", () => {
  const text = (value: string, x: number, y: number): Scene["nodes"][number] => ({
    kind: "text",
    text: value,
    attrs: [["x", fmt(x)], ["y", fmt(y)], ["font-size", fmt(14)], ["text-anchor", "middle"]],
  });
  const scene = (...nodes: Scene["nodes"]): Scene => ({ width: SCENE_WIDTH, height: fmt(300), textAlternative: "test", nodes });

  it("reports a label crossed by a figure line, and two labels on one another", () => {
    const line: Scene["nodes"][number] = { kind: "line", attrs: [["x1", fmt(100)], ["y1", fmt(100)], ["x2", fmt(300)], ["y2", fmt(100)]] };
    expect(labelOverlaps(scene(line, text("3 cm", 200, 104)))).toEqual(["3 cm"]);
    expect(labelOverlaps(scene(text("3 cm", 200, 50), text("4 cm", 205, 52)))).toEqual(["3 cm", "4 cm"]);
  });

  it("reports nothing for labels clear of the line and of each other", () => {
    const line: Scene["nodes"][number] = { kind: "line", attrs: [["x1", fmt(100)], ["y1", fmt(100)], ["x2", fmt(300)], ["y2", fmt(100)]] };
    expect(labelOverlaps(scene(line, text("3 cm", 200, 130), text("4 cm", 200, 60)))).toEqual([]);
  });
});
