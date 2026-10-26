import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import { type NumberLine, numberLine as numberLineDefinition } from "../../src/core/definitions/number-line";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { defaultStyle, namedColors } from "../../src/core/style";
import { niceTicks } from "../../src/core/value-scale";
import { checkScene } from "../../src/layout/kit/check";
import { linearScale } from "../../src/layout/kit/scale";
import { titleBlock } from "../../src/layout/kit/title";
import { LABEL_MAX_LINES, TICK_LABEL_MAX_WIDTH, TICK_LABEL_MIN_WIDTH, numberLineLayout } from "../../src/layout/number-line";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { type Bounds, attr, boundsOf, nameOf, overlap } from "../fixtures/scene-geometry";

type Text = Extract<SceneNode, { kind: "text" }>;

/** The Scene for a valid description, which must pass checkScene (AD-007, AD-008). */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid number line, got ${JSON.stringify(result.issues)}`);
  const scene = numberLineLayout(result.description as NumberLine, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const line = (extra: object = {}) => ({ type: "number-line", axis: { min: -10, max: 10 }, ...extra });
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
/** The axis line: the first full-width horizontal line `drawAxis` draws. */
const axisLine = (scene: Scene) => lines(scene).find((node) => num(node, "y1") === num(node, "y2") && num(node, "x2") - num(node, "x1") > 100)!;
/** The ticks: the short vertical lines across the axis. */
const ticks = (scene: Scene) => lines(scene).filter((node) => num(node, "x1") === num(node, "x2"));
const markers = (scene: Scene) => scene.nodes.filter((node) => node.kind === "circle");
const arrowheads = (scene: Scene) => scene.nodes.filter((node) => node.kind === "polygon");
const texts = (scene: Scene) => scene.nodes.filter((node): node is Text => node.kind === "text");
const tickLabels = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.tickLabel);
const labelTexts = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.label);
/** Where `value` belongs on the page, from the axis line's own ends. */
const xFor = (scene: Scene, min: number, max: number) => {
  const axis = axisLine(scene);
  return linearScale([min, max], [num(axis, "x1"), num(axis, "x2")]);
};

describe("ranges (NLC-REQ-014, NLC-REQ-007)", () => {
  it.each([
    ["negative-only", -10, -2],
    ["positive-only", 3, 15],
    ["zero-spanning", -10, 10],
    ["decimal", -0.5, 0.75],
  ])("draws a %s range with the axis's ticks at their positions", (_, min, max) => {
    const scene = sceneOf(line({ axis: { min, max } }));
    const expected = niceTicks(min, max).ticks;
    const x = xFor(scene, min, max);
    expect(ticks(scene)).toHaveLength(expected.length);
    ticks(scene).forEach((tick, i) => expect(Math.abs(num(tick, "x1") - x(expected[i]!))).toBeLessThanOrEqual(0.5));
  });

  it("keeps everything inside the drawing, end labels included, custom ones too", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    for (const axis of [{ min: -1e9, max: 1e9 }, { min: -10, max: 10 }, { min: 0.001, max: 0.002 }, { min: 0, max: 4, tickSpacing: 1 }]) {
      for (const tickLabels of [[], [{ value: axis.min, text: long }, { value: axis.max, text: long }]]) {
        const scene = sceneOf(line({ axis, tickLabels }));
        for (const b of scene.nodes.map(boundsOf)) expect(b.x0 >= 0 && b.x1 <= SCENE_WIDTH && b.y0 >= 0 && b.y1 <= scene.height, nameOf(b)).toBe(true);
      }
    }
  });
});

describe("arrowheads (NLC-REQ-015, NLC-REQ-016, NLC-REQ-017)", () => {
  const cases = [
    [undefined, undefined, 2],
    [false, undefined, 1],
    [undefined, false, 1],
    [false, false, 0],
  ] as const;

  it.each(cases)("leftArrow %s, rightArrow %s: draws %i arrowheads, as polygons, and a plain end otherwise", (leftArrow, rightArrow, count) => {
    const scene = sceneOf(line({ ...(leftArrow !== undefined && { leftArrow }), ...(rightArrow !== undefined && { rightArrow }) }));
    expect(arrowheads(scene)).toHaveLength(count);
    const axis = axisLine(scene);
    const reach = scene.nodes.filter((node) => node.kind !== "text").map(boundsOf);
    const leftmost = Math.min(...reach.map((b) => b.x0));
    const rightmost = Math.max(...reach.map((b) => b.x1));
    // An end without an arrowhead stops at the range's end (a tick's half width of stroke aside).
    expect(leftmost < num(axis, "x1") - 2).toBe(leftArrow !== false);
    expect(rightmost > num(axis, "x2") + 2).toBe(rightArrow !== false);
    expect(scene.nodes.some((node) => node.attrs.some(([, value]) => String(value).includes("url(")))).toBe(false);
  });

  it("never moves a tick when an arrowhead is turned on or off", () => {
    const at = (extra: object) => ticks(sceneOf(line(extra))).map((tick) => num(tick, "x1"));
    const both = at({});
    for (const extra of [{ leftArrow: false }, { rightArrow: false }, { leftArrow: false, rightArrow: false }]) expect(at(extra)).toEqual(both);
  });

  it("points each arrowhead outward, tip beyond the line's end, its base on an extension from the range's end", () => {
    const scene = sceneOf(line());
    const axis = axisLine(scene);
    const y = num(axis, "y1");
    const extensions = lines(scene).filter((node) => node !== axis && num(node, "y1") === y && num(node, "y2") === y);
    const corners = (head: SceneNode) => String(attr(head, "points")).split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);
    const [leftHead, rightHead] = arrowheads(scene).map(corners);
    for (const [head, end, outward] of [[leftHead!, num(axis, "x1"), -1], [rightHead!, num(axis, "x2"), 1]] as const) {
      const [tip, ...base] = head;
      // The tip is on the line, past the range's end; the base is between the tip and the line.
      expect(tip![1]).toBe(y);
      expect(Math.sign(tip![0] - end)).toBe(outward);
      for (const corner of base) expect(Math.sign(tip![0] - corner[0])).toBe(outward);
      // An extension runs from the range's end to the base.
      const extension = extensions.find((node) => [num(node, "x1"), num(node, "x2")].includes(end))!;
      expect([num(extension, "x1"), num(extension, "x2")].sort((a, b) => a - b)).toEqual([end, base[0]![0]].sort((a, b) => a - b));
      expect(base.every((corner) => corner[0] === base[0]![0])).toBe(true);
    }
  });
});

describe("points (NLC-REQ-018, NLC-REQ-011)", () => {
  it("marks each point at its value, within half a unit", () => {
    const values = [-10, -3.25, 0, 4, 10];
    const scene = sceneOf(line({ points: values.map((value) => ({ value })) }));
    const x = xFor(scene, -10, 10);
    expect(markers(scene).map((marker) => num(marker, "cx"))).toHaveLength(values.length);
    markers(scene).forEach((marker, i) => expect(Math.abs(num(marker, "cx") - x(values[i]!))).toBeLessThanOrEqual(0.5));
  });

  it("draws two points at one value, and places their labels apart", () => {
    const scene = sceneOf(line({ points: [{ value: 2, label: "Ana" }, { value: 2, label: "Ben" }] }));
    expect(markers(scene)).toHaveLength(2);
    const [a, b] = labelTexts(scene).map(boundsOf);
    expect(overlap(a!, b!)).toBe(false);
  });

  it("places up to twelve short labels at one value apart (code review CR-003)", () => {
    for (const count of [5, 8, 12]) {
      const boxes = labelTexts(sceneOf(line({ points: Array.from({ length: count }, (_, i) => ({ value: 0, label: `P${i}` })) }))).map(boundsOf);
      expect(boxes).toHaveLength(count);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i]!, boxes[j]!), `P${i} and P${j} of ${count}`).toBe(false);
      }
    }
  });

  it("draws every one of many coincident points and labels, in a bounded height", () => {
    const scene = sceneOf(line({ points: Array.from({ length: 40 }, (_, i) => ({ value: 0, label: `P${i}` })) }));
    expect(markers(scene)).toHaveLength(40);
    expect(labelTexts(scene)).toHaveLength(40);
    expect(scene.height).toBeLessThan(400);
  });

  it("applies a point's color to its marker only, and the accent when none is given; labels stay the text color", () => {
    const scene = sceneOf(line({ points: [{ value: 1, label: "red one", color: "red" }, { value: 5, label: "plain" }] }));
    expect(markers(scene).map((marker) => attr(marker, "fill"))).toEqual([namedColors.red, defaultStyle.colors.accent]);
    expect(scene.nodes.filter((node) => node.attrs.some(([, value]) => value === namedColors.red))).toHaveLength(1);
    expect(labelTexts(scene).every((node) => attr(node, "fill") === defaultStyle.colors.text)).toBe(true);
  });

  it("draws only the line, ticks and labels when there are no points", () => {
    const scene = sceneOf(line());
    expect(markers(scene)).toEqual([]);
    expect(labelTexts(scene)).toEqual([]);
    expect(scene.nodes.every((node) => ["line", "polygon", "text"].includes(node.kind))).toBe(true);
  });

  it("wraps a long point label and cuts it to its line limit", () => {
    const scene = sceneOf(line({ points: [{ value: 0, label: wordsOf(CALLER_TEXT_LIMIT) }] }));
    expect(labelTexts(scene)).toHaveLength(LABEL_MAX_LINES);
    expect(labelTexts(scene).at(-1)!.text.endsWith("…")).toBe(true);
  });
});

describe("tick labels (NLC-REQ-019, NLC-REQ-006)", () => {
  it("writes a custom label in place of the tick's number, and leaves a blank one empty", () => {
    const scene = sceneOf(line({ tickLabels: [{ value: 0, text: "start" }, { value: 4, text: "" }] }));
    const shown = tickLabels(scene).map((node) => node.text);
    expect(shown).toContain("start");
    expect(shown).not.toContain("0");
    expect(shown).not.toContain("4");
    expect(shown).toContain("");
  });

  it("writes the first of two labels at one tick", () => {
    const shown = tickLabels(sceneOf(line({ tickLabels: [{ value: 2, text: "first" }, { value: 2, text: "second" }] }))).map((node) => node.text);
    expect(shown).toContain("first");
    expect(shown).not.toContain("second");
  });

  it("cuts a long custom label to one line, ending in an ellipsis, clear of its neighbours' labels", () => {
    const scene = sceneOf(line({ axis: { min: 0, max: 4, tickSpacing: 1 }, tickLabels: [{ value: 2, text: wordsOf(CALLER_TEXT_LIMIT) }] }));
    const custom = tickLabels(scene).find((node) => node.text.endsWith("…"))!;
    const box = boundsOf(custom);
    expect(box.x1 - box.x0).toBeLessThanOrEqual(TICK_LABEL_MAX_WIDTH);
    const neighbours = tickLabels(scene).filter((node) => node !== custom).map(boundsOf);
    for (const other of neighbours) expect(overlap(box, other), nameOf(other)).toBe(false);
  });

  it("labels a spacing worked out in floating point with the value meant, and draws what the typed spacing draws (defect sweep DS-001)", () => {
    const computed = sceneOf(line({ axis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } }));
    expect(tickLabels(computed).map((node) => node.text)).toEqual(["0", "0.3", "0.6", "0.9", "1.2"]);
    expect(computed.nodes).toEqual(sceneOf(line({ axis: { min: 0, max: 1.2, tickSpacing: 0.3 } })).nodes);
    // The text alternative states the spacing as written; describe() is deliberately untouched.
    expect(computed.textAlternative).toContain("0.30000000000000004");
  });

  it("cuts neighbouring custom labels to the room between ticks on the span drawn (code review CR-002)", () => {
    const scene = sceneOf(line({ axis: { min: 0, max: 1, tickSpacing: 0.25 }, tickLabels: [{ value: 0.25, text: "one quarter of it" }, { value: 0.5, text: "one half of it" }] }));
    const boxes = tickLabels(scene).map(boundsOf);
    for (let i = 1; i < boxes.length; i++) expect(overlap(boxes[i - 1]!, boxes[i]!), nameOf(boxes[i]!)).toBe(false);
  });

  it("cuts three adjacent long custom labels on a short line clear of one another (quality review QR-001)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const scene = sceneOf(line({ axis: { min: 0, max: 4, tickSpacing: 1 }, tickLabels: [1, 2, 3].map((value) => ({ value, text: long })) }));
    const boxes = tickLabels(scene).map(boundsOf);
    for (let i = 1; i < boxes.length; i++) expect(overlap(boxes[i - 1]!, boxes[i]!), nameOf(boxes[i]!)).toBe(false);
  });

  it("cuts a custom label on a line of 99 intervals to the minimum width, on one line, without failing (quality review QR-002)", () => {
    const scene = sceneOf(line({ axis: { min: 0, max: 99, tickSpacing: 1 }, tickLabels: [{ value: 50, text: "half way there" }] }));
    const custom = tickLabels(scene).filter((node) => node.text.endsWith("…"));
    expect(custom).toHaveLength(1);
    const box = boundsOf(custom[0]!);
    expect(box.x1 - box.x0).toBeLessThanOrEqual(TICK_LABEL_MIN_WIDTH);
  });

  it("never cuts a custom label below a few letters, so on a densely ticked line it is written whole", () => {
    const shown = tickLabels(sceneOf(line({ axis: { min: 0, max: 20, tickSpacing: 1 }, tickLabels: [{ value: 4, text: "four" }, { value: 5, text: "five" }] }))).map((node) => node.text);
    expect(shown).toContain("four");
    expect(shown).toContain("five");
  });

  it("hides every tick label, custom ones too, when showTickLabels is false", () => {
    expect(tickLabels(sceneOf(line({ axis: { min: -10, max: 10, showTickLabels: false }, tickLabels: [{ value: 0, text: "start" }] })))).toEqual([]);
  });
});

describe("the line's label, title and color (NLC-REQ-021, GSV-REQ-040)", () => {
  it("draws the line label once, below the tick labels, at most two lines", () => {
    const scene = sceneOf(line({ lineLabel: "Integers" }));
    const drawn = labelTexts(scene).filter((node) => node.text === "Integers");
    expect(drawn).toHaveLength(1);
    const tickBottom = Math.max(...tickLabels(scene).map((node) => boundsOf(node).y1));
    expect(boundsOf(drawn[0]!).y0).toBeGreaterThan(tickBottom);
    expect(labelTexts(sceneOf(line({ lineLabel: wordsOf(CALLER_TEXT_LIMIT) })))).toHaveLength(LABEL_MAX_LINES);
  });

  it("draws the title with titleBlock, first", () => {
    const scene = sceneOf(line({ title: "Temperatures" }));
    const block = titleBlock("Temperatures");
    expect(scene.nodes.slice(0, block.nodes.length)).toEqual(block.nodes);
  });

  it("colors the line, its ticks and its arrowheads with lineColor, and nothing else", () => {
    const scene = sceneOf(line({ lineColor: "green", points: [{ value: 0 }] }));
    const green = scene.nodes.filter((node) => node.attrs.some(([, value]) => value === namedColors.green));
    expect(green).toEqual([...lines(scene), ...arrowheads(scene)].sort((a, b) => scene.nodes.indexOf(a) - scene.nodes.indexOf(b)));
    expect(tickLabels(scene).every((node) => attr(node, "fill") === defaultStyle.colors.text)).toBe(true);
  });

  it("states the definition's text alternative as its own (NLC-REQ-012)", () => {
    const example: unknown = JSON.parse(readFileSync("examples/number-line.json", "utf8"));
    const result = validate(example);
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    expect(sceneOf(example).textAlternative).toBe(numberLineDefinition.describe(result.description as NumberLine, result.provenance));
  });

  it("fails closed on an axis no validation gives", () => {
    expect(() => numberLineLayout({ type: "number-line", axis: { min: 1, max: 1 } } as NumberLine, {})).toThrow(RangeError);
  });
});

describe("caller text at the limit stays bounded (GSV-REQ-052; rulers NLC TICKET-003 SEC-001)", () => {
  it("draws one-cluster labels inside the drawing", () => {
    for (const text of Object.values(oneClusterTexts(CALLER_TEXT_LIMIT))) {
      const scene = sceneOf(line({ title: text, lineLabel: text, points: [{ value: 0, label: text }], tickLabels: [{ value: 2, text }] }));
      for (const b of scene.nodes.map(boundsOf)) expect(b.x0 >= 0 && b.x1 <= SCENE_WIDTH, nameOf(b)).toBe(true);
    }
  });
});

describe("the drawing's geometry over generated number lines", () => {
  const WORDS = ["Ana", "Ben", "start", "end", "A", "the freezing point of water", "x"];
  const numberLine = fc
    .record({
      min: fc.integer({ min: -1000, max: 990 }),
      width: fc.integer({ min: 1, max: 1000 }),
      leftArrow: fc.option(fc.boolean()),
      rightArrow: fc.option(fc.boolean()),
      showTickLabels: fc.option(fc.boolean()),
      title: fc.option(fc.constantFrom("Temperatures", wordsOf(CALLER_TEXT_LIMIT))),
      lineLabel: fc.option(fc.constantFrom("Integers", wordsOf(CALLER_TEXT_LIMIT))),
      // At most four labeled points: four rows always leave each a clear place (DEL-007).
      points: fc.array(fc.record({ at: fc.double({ min: 0, max: 1, noNaN: true }), label: fc.option(fc.constantFrom(...WORDS)) }), { maxLength: 4 }),
    })
    .map(({ min, width, leftArrow, rightArrow, showTickLabels, title, lineLabel, points }) => ({
      type: "number-line",
      axis: { min, max: min + width, ...(showTickLabels !== null && { showTickLabels }) },
      ...(leftArrow !== null && { leftArrow }),
      ...(rightArrow !== null && { rightArrow }),
      ...(title !== null && { title }),
      ...(lineLabel !== null && { lineLabel }),
      points: points.map(({ at, label }) => ({ value: min + at * width, ...(label !== null && { label }) })),
    }));

  it("keeps every node inside the drawing, and every label clear of the others, the line and the markers", () => {
    fc.assert(
      fc.property(numberLine, (description) => {
        const scene = sceneOf(description);
        const all = scene.nodes.map(boundsOf);
        for (const b of all) expect(b.x0 >= -0.02 && b.x1 <= SCENE_WIDTH + 0.02 && b.y0 >= -0.02 && b.y1 <= scene.height + 0.02, nameOf(b)).toBe(true);
        const labels = labelTexts(scene).map(boundsOf);
        const others: Bounds[] = [...markers(scene), axisLine(scene), ...tickLabels(scene)].map(boundsOf);
        labels.forEach((label, i) => {
          for (const other of [...labels.slice(i + 1), ...others]) expect(overlap(label, other), `${nameOf(label)} / ${nameOf(other)}`).toBe(false);
        });
      }),
      { numRuns: 200 },
    );
  });
});
