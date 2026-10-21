import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import { type Ruler, ruler as rulerDefinition } from "../../src/core/definitions/ruler";
import { INCH_DIVISIONS, RULER_MAX_LENGTH, type RulerUnit, rulerScale } from "../../src/core/ruler";
import { sharedProperties } from "../../src/core/definitions/shared";
import { defaultStyle } from "../../src/core/style";
import { checkScene } from "../../src/layout/kit/check";
import { fmt } from "../../src/layout/kit/format";
import { type Box, placeLabel } from "../../src/layout/kit/labels";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT, titleBlock } from "../../src/layout/kit/title";
import { BAR_HEIGHT, LABEL_MAX_LINES, RULER_EDGE, rulerFontSize, rulerLayout } from "../../src/layout/ruler";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";

type Text = Extract<SceneNode, { kind: "text" }>;

/**
 * The Scene for a valid description, which must pass checkScene (AD-007, AD-008). Calls the layout
 * directly, so a layout exception fails the test with its own message.
 */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid ruler, got ${JSON.stringify(result.issues)}`);
  const scene = rulerLayout(result.description as Ruler, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];
const num = (node: SceneNode, name: string) => Number(attr(node, name));
const marks = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const texts = (scene: Scene) => scene.nodes.filter((node): node is Text => node.kind === "text");
const rects = (scene: Scene) => scene.nodes.filter((node) => node.kind === "rect");
/** The ruler's body: the one outlined rect. */
const body = (scene: Scene) => rects(scene).find((node) => attr(node, "stroke") !== undefined)!;
/** The object's bar: the one filled rect. */
const bars = (scene: Scene) => rects(scene).filter((node) => attr(node, "fill") !== "none");
const numbers = (scene: Scene, length: number) => texts(scene).filter((node) => num(node, "font-size") === fmt(rulerFontSize(length)));
const markLength = (node: SceneNode) => num(node, "y2") - num(node, "y1");
const distinctLengths = (scene: Scene) => new Set(marks(scene).map(markLength)).size;
/** Where the mark for `value` belongs on the page: the edge's start plus its share of the edge. */
const expectedX = (value: number, length: number) => (SCENE_WIDTH - RULER_EDGE) / 2 + (RULER_EDGE * value) / length;

/** A text line's estimated box, as the layout reserved it, shrunk by `fmt()`'s step on every side. */
function boxOf(node: Text): Box {
  const size = num(node, "font-size");
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  const top = num(node, "y") - size * 0.8 - (lineHeight - size) / 2;
  return { x: num(node, "x") - width / 2 + 0.01, y: top + 0.01, width: width - 0.02, height: lineHeight - 0.02 };
}

const rectBox = (node: SceneNode): Box => ({ x: num(node, "x"), y: num(node, "y"), width: num(node, "width"), height: num(node, "height") });
const overlap = (a: Box, b: Box) => placeLabel(a, [a], [b]) === undefined;

const centimeters = (length: number, extra: object = {}) => ({ type: "ruler", rulerUnit: "centimeters", length, ...extra });
const inches = (length: number, extra: object = {}) => ({ type: "ruler", rulerUnit: "inches", length, ...extra });

describe("marks and numbers (NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048)", () => {
  it("draws a 15 cm ruler with 151 marks, three lengths of mark and the numbers 0 to 15", () => {
    const scene = sceneOf(centimeters(15));
    expect(marks(scene)).toHaveLength(151);
    expect(distinctLengths(scene)).toBe(3);
    expect(numbers(scene, 15).map((node) => node.text)).toEqual(Array.from({ length: 16 }, (_, i) => String(i)));
  });

  it("draws a 6 in ruler with 97 marks at sixteenths, five lengths and the numbers 0 to 6", () => {
    const scene = sceneOf(inches(6));
    expect(marks(scene)).toHaveLength(97);
    expect(distinctLengths(scene)).toBe(5);
    expect(numbers(scene, 6).map((node) => node.text)).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
  });

  it("draws 25 marks of three lengths on a 6 in ruler marked to quarters", () => {
    const scene = sceneOf(inches(6, { smallestDivision: "quarter" }));
    expect(marks(scene)).toHaveLength(25);
    expect(distinctLengths(scene)).toBe(3);
  });

  it("grades marks longest for whole units, then halves, down to the smallest division", () => {
    const scene = sceneOf(inches(1));
    const byIndex = marks(scene).map(markLength);
    // 0, 1/16, 1/8, 1/4, 1/2 of an inch: whole, sixteenth, eighth, quarter, half.
    const [whole, sixteenth, eighth, quarter, half] = [byIndex[0]!, byIndex[1]!, byIndex[2]!, byIndex[4]!, byIndex[8]!];
    expect(whole > half && half > quarter && quarter > eighth && eighth > sixteenth).toBe(true);
    const cm = marks(sceneOf(centimeters(1))).map(markLength);
    expect(cm[0]! > cm[5]! && cm[5]! > cm[1]!).toBe(true);
  });
});

describe("drawn to scale with itself (AD-007, NLC-NFR-005)", () => {
  const rulers: Array<readonly [RulerUnit, number]> = [
    ["centimeters", 1],
    ["centimeters", 7],
    ["centimeters", RULER_MAX_LENGTH.centimeters],
    ["inches", 1],
    ["inches", RULER_MAX_LENGTH.inches],
  ];

  it.each(rulers)("fills the fixed edge with equal units on a %s ruler of length %i", (unit, length) => {
    const scene = sceneOf({ type: "ruler", rulerUnit: unit, length });
    const longest = Math.max(...marks(scene).map(markLength));
    const wholes = marks(scene)
      .filter((node) => markLength(node) === longest)
      .map((node) => num(node, "x1"));
    expect(wholes).toHaveLength(length + 1);
    expect(wholes[0]).toBe((SCENE_WIDTH - RULER_EDGE) / 2);
    expect(wholes.at(-1)).toBe((SCENE_WIDTH + RULER_EDGE) / 2);
    for (let i = 1; i < wholes.length; i++) expect(Math.abs(wholes[i]! - wholes[i - 1]! - RULER_EDGE / length)).toBeLessThanOrEqual(0.02);
  });

  it("puts every mark within 0.5 units of its value's position", () => {
    for (const [unit, length] of rulers) {
      const scale = rulerScale(unit, length)!;
      const scene = sceneOf({ type: "ruler", rulerUnit: unit, length });
      marks(scene).forEach((node, i) => expect(Math.abs(num(node, "x1") - expectedX(scale.marks[i]!.value, length))).toBeLessThanOrEqual(0.5));
    }
  });

  it("keeps every number clear of its neighbours and inside the body at both maximum lengths (NLC TICKET-001 CR-005)", () => {
    for (const description of [centimeters(RULER_MAX_LENGTH.centimeters), inches(RULER_MAX_LENGTH.inches)]) {
      const scene = sceneOf(description);
      const boxes = numbers(scene, description.length).map(boxOf);
      const outline = rectBox(body(scene));
      boxes.forEach((box, i) => {
        if (i > 0) expect(overlap(box, boxes[i - 1]!), `${description.rulerUnit} ${i}`).toBe(false);
        expect(box.x >= outline.x && box.x + box.width <= outline.x + outline.width && box.y + box.height <= outline.y + outline.height).toBe(true);
      });
    }
  });

  it("keeps the numbers at the tick-label size until they would touch", () => {
    expect(rulerFontSize(12)).toBe(defaultStyle.fontSizes.tickLabel);
    expect(rulerFontSize(15)).toBe(defaultStyle.fontSizes.tickLabel);
    // 352 / 30 units, less the 2-unit space, over the width of "30" at size 1.
    expect(rulerFontSize(30)).toBeCloseTo(7.96, 2);
  });
});

describe("the measured object (NLC-REQ-050, NLC-REQ-055)", () => {
  /** The bar's two ends, for a ruler `description` whose object runs from `start` to `end`. */
  const barEnds = (scene: Scene) => {
    const [bar] = bars(scene);
    return [num(bar!, "x"), num(bar!, "x") + num(bar!, "width")];
  };

  it("draws a bar whose ends lie within 0.5 units of its start and end marks, from a start other than 0", () => {
    const scene = sceneOf(inches(6, { smallestDivision: "eighth", measuredObject: { start: 1.5, end: 4.25 } }));
    expect(bars(scene)).toHaveLength(1);
    const [x1, x2] = barEnds(scene);
    expect(Math.abs(x1! - expectedX(1.5, 6))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(x2! - expectedX(4.25, 6))).toBeLessThanOrEqual(0.5);
  });

  it("draws computed ends at the marks the mark rule locates them at (NLC TICKET-002 CR-003)", () => {
    const scene = sceneOf(centimeters(30, { measuredObject: { start: 0.1 + 0.2, end: 0.1 * 3 * 100 } }));
    const [x1, x2] = barEnds(scene);
    expect(x1).toBe(fmt(expectedX(0.3, 30)));
    expect(x2).toBe(fmt(expectedX(30, 30)));
    expect(scene.textAlternative).toContain("from the 0.3 cm mark to the 30 cm mark");
  });

  it("lies just above the marked edge, covering no mark or number", () => {
    const scene = sceneOf(centimeters(10, { measuredObject: { start: 0, end: 10, label: "string" } }));
    const bar = rectBox(bars(scene)[0]!);
    const edge = Math.min(...marks(scene).map((node) => num(node, "y1")));
    expect(bar.y + bar.height).toBeLessThan(edge);
    expect(bar.height).toBe(BAR_HEIGHT);
    for (const number of numbers(scene, 10)) expect(overlap(boxOf(number), bar)).toBe(false);
  });

  it("applies its color to the bar only, and the style's accent when none is given (GSV-REQ-045)", () => {
    const colored = sceneOf(centimeters(10, { measuredObject: { start: 1, end: 4, color: "green", label: "leaf" } }));
    const fills = colored.nodes.flatMap((node) => [attr(node, "fill"), attr(node, "stroke")]).filter((value) => value === "#2e7d32");
    expect(fills).toHaveLength(1);
    expect(attr(bars(colored)[0]!, "fill")).toBe("#2e7d32");
    expect(texts(colored).every((node) => attr(node, "fill") === defaultStyle.colors.text)).toBe(true);
    const plain = sceneOf(centimeters(10, { measuredObject: { start: 1, end: 4 } }));
    expect(attr(bars(plain)[0]!, "fill")).toBe(defaultStyle.colors.accent);
  });

  it("places its label above the bar, clear of the bar and every number, wrapped and cut to its line limit", () => {
    const label = "a very long label for the object ".repeat(20);
    const scene = sceneOf(centimeters(30, { title: "Measure it", measuredObject: { start: 0, end: 0.5, label } }));
    const lines = texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.label);
    expect(lines).toHaveLength(LABEL_MAX_LINES);
    expect(lines.at(-1)!.text.endsWith("…")).toBe(true);
    const bar = rectBox(bars(scene)[0]!);
    const title = texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.title);
    for (const line of lines) {
      const box = boxOf(line);
      expect(box.x >= 0 && box.x + box.width <= SCENE_WIDTH).toBe(true);
      for (const other of [bar, ...numbers(scene, 30).map(boxOf), ...title.map(boxOf)]) expect(overlap(box, other)).toBe(false);
    }
  });

  it("says in the published label term that a long label is cut in the drawing (code review CR-001)", () => {
    expect(sharedProperties.label.description).toContain("a long label is cut short with “…”; the text alternative states it whole");
  });

  it("draws no label for a blank one, and the bar still", () => {
    const scene = sceneOf(centimeters(5, { measuredObject: { start: 1, end: 2, label: "   " } }));
    expect(texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.label)).toEqual([]);
    expect(bars(scene)).toHaveLength(1);
  });

  it("writes no text but the whole-unit numbers, the title and the label, whatever the ruler and object", () => {
    const description = fc
      .record({
        unit: fc.constantFrom<RulerUnit>("centimeters", "inches"),
        division: fc.constantFrom(undefined, ...(Object.keys(INCH_DIVISIONS) as Array<keyof typeof INCH_DIVISIONS>)),
        length: fc.integer({ min: 1, max: 30 }),
        a: fc.nat(),
        b: fc.nat(),
        label: fc.constantFrom(undefined, "pencil", "a long piece of string to measure"),
        title: fc.constantFrom(undefined, "How long is it?"),
      })
      .map(({ unit, division, length, a, b, label, title }) => {
        const fitted = unit === "inches" ? Math.min(length, RULER_MAX_LENGTH.inches) : length;
        const scale = rulerScale(unit, fitted, unit === "inches" ? division : undefined)!;
        const count = scale.marks.length;
        const [i, j] = [a % (count - 1), b % (count - 1)].sort((x, y) => x - y);
        const start = scale.marks[i!]!.value;
        const end = scale.marks[i === j ? j! + 1 : j!]!.value;
        return {
          type: "ruler",
          rulerUnit: unit,
          length: fitted,
          ...(unit === "inches" && division !== undefined && { smallestDivision: division }),
          ...(title !== undefined && { title }),
          measuredObject: { start, end, ...(label !== undefined && { label }) },
        };
      });
    fc.assert(
      fc.property(description, (d) => {
        const scene = sceneOf(d);
        const allowed = new Set(Array.from({ length: d.length + 1 }, (_, i) => String(i)));
        const titled = new Set(titleBlock(d.title).nodes.map((node) => (node as Text).text));
        const labelWords = new Set((d.measuredObject.label ?? "").split(" "));
        for (const node of texts(scene)) {
          const size = num(node, "font-size");
          if (size === fmt(rulerFontSize(d.length))) expect(allowed.has(node.text), node.text).toBe(true);
          else if (size === defaultStyle.fontSizes.title) expect(titled.has(node.text)).toBe(true);
          else expect(node.text.split(" ").every((word) => labelWords.has(word))).toBe(true);
        }
        // The object's length, as the text alternative would write a mark, appears nowhere.
        const measured = String(Math.round((d.measuredObject.end - d.measuredObject.start) * 10_000) / 10_000);
        if (!allowed.has(measured)) expect(texts(scene).some((node) => node.text.includes(measured))).toBe(false);
        const [bar] = bars(scene);
        expect(Math.abs(num(bar!, "x") - expectedX(d.measuredObject.start, d.length))).toBeLessThanOrEqual(0.5);
        expect(Math.abs(num(bar!, "x") + num(bar!, "width") - expectedX(d.measuredObject.end, d.length))).toBeLessThanOrEqual(0.5);
      }),
      { numRuns: 200 },
    );
  });
});

describe("the ruler's parts (NLC-REQ-040)", () => {
  it("draws only the body, the marks and the numbers when there is no object or title", () => {
    const scene = sceneOf(centimeters(4));
    expect(scene.nodes).toHaveLength(1 + 41 + 5);
    expect(scene.nodes[0]).toBe(scene.nodes.find((node) => node.kind === "rect"));
    expect(bars(scene)).toEqual([]);
    expect(texts(scene).every((node) => num(node, "font-size") === fmt(rulerFontSize(4)))).toBe(true);
  });

  it("draws the title with titleBlock, first, and the ruler below it", () => {
    const title = "How long is the pencil?";
    const scene = sceneOf(inches(6, { title }));
    const block = titleBlock(title);
    expect(scene.nodes.slice(0, block.nodes.length)).toEqual(block.nodes);
    expect(num(body(scene), "y")).toBeGreaterThan(block.height);
  });

  it("keeps everything inside the drawing, which is as tall as the ruler needs", () => {
    for (const description of [centimeters(1), centimeters(30, { measuredObject: { start: 0, end: 30, label: "x" } }), inches(12, { title: "T" })]) {
      const scene = sceneOf(description);
      const outline = rectBox(body(scene));
      expect(outline.x).toBeGreaterThanOrEqual(0);
      expect(outline.x + outline.width).toBeLessThanOrEqual(SCENE_WIDTH);
      expect(outline.y + outline.height).toBeLessThan(scene.height);
    }
  });

  it("states the definition's text alternative as its own (NLC-REQ-056)", () => {
    const description = inches(6, { smallestDivision: "eighth", title: "Pencils", measuredObject: { start: 1.5, end: 4.25, label: "pencil" } });
    const result = validate(description);
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    expect(sceneOf(description).textAlternative).toBe(rulerDefinition.describe(result.description as Ruler, result.provenance));
  });
});
