import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { BarGraph } from "../../src/core/definitions/bar-graph";
import { validate } from "../../src/core/index";
import { defaultStyle } from "../../src/core/style";
import { createGraph } from "../../src/graph";
import { BAR_FILL, MAX_BAR_THICKNESS, MIN_VALUE_LABEL_WIDTH, barGraphLayout } from "../../src/layout/bar-graph";
import { displayValue } from "../../src/layout/kit/format";
import { checkScene } from "../../src/layout/kit/check";
import { LINE_HEIGHT, SCENE_MARGIN } from "../../src/layout/kit/title";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { attr, boundsOf, nameOf, overlap, positionOf, ticksOf as ticks, valueAxisOf as valueAxis } from "../fixtures/scene-geometry";

/** The Scene the bar-graph layout draws for a valid description; it must pass `checkScene`. */
function sceneOf(input: Record<string, unknown>): Scene {
  const result = validate({ type: "bar-graph", categories: [{ name: "Walk" }, { name: "Bus" }, { name: "Car" }], values: [12, 7, 9], ...input });
  if (!result.valid) throw new Error(JSON.stringify(result.issues));
  const scene = barGraphLayout(result.description as BarGraph, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const texts = (scene: Scene) => scene.nodes.flatMap((node) => (node.kind === "text" ? [node.text] : []));
const bars = (scene: Scene) => scene.nodes.filter((node) => node.kind === "rect");
const textNode = (scene: Scene, text: string) => scene.nodes.find((node) => node.kind === "text" && node.text === text)!;
const lineHeight = defaultStyle.fontSizes.tickLabel * LINE_HEIGHT;

const example = JSON.parse(readFileSync("examples/bar-graph.json", "utf8")) as Record<string, unknown>;

describe("bars (DGP-REQ-017, DGP-REQ-036)", () => {
  it("draws one bar per category, in description order, centered on its name", () => {
    const scene = sceneOf({ values: [12, 7, 9] });
    const drawn = bars(scene);
    expect(drawn).toHaveLength(3);
    ["Walk", "Bus", "Car"].forEach((name, i) => {
      const bar = drawn[i]!;
      expect(num(bar, "x") + num(bar, "width") / 2).toBeCloseTo(num(textNode(scene, name), "x"), 1);
    });
  });

  it("makes each bar exactly value ÷ (maximum − minimum) of the axis long, from zero, within fmt()'s rounding", () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const scene = sceneOf({ orientation, values: [12, 7.5, 9], valueScale: { minimum: 0, maximum: 15 } });
      const axis = valueAxis(scene);
      const axisLength = Math.abs(axis.to - axis.from);
      bars(scene).forEach((bar, i) => {
        const length = orientation === "vertical" ? num(bar, "height") : num(bar, "width");
        expect(Math.abs(length - ([12, 7.5, 9][i]! / 15) * axisLength), `${orientation} ${i}`).toBeLessThanOrEqual(0.005);
        // The bar starts at the axis's zero end.
        const start = orientation === "vertical" ? num(bar, "y") + num(bar, "height") : num(bar, "x");
        expect(start, `${orientation} ${i}`).toBeCloseTo(axis.from, 1);
      });
    }
  });

  it("starts bars at the zero line when a given scale goes below zero, each value ÷ (maximum − minimum) of the axis long", () => {
    const scene = sceneOf({ values: [10, 5, 0], valueScale: { minimum: -5, maximum: 10 } });
    const zero = ticks(scene).find((tick) => tick.value === 0)!.at;
    for (const bar of bars(scene)) expect(num(bar, "y") + num(bar, "height")).toBeCloseTo(zero, 1);
    const axis = valueAxis(scene);
    bars(scene).forEach((bar, i) => expect(Math.abs(num(bar, "height") - ([10, 5][i]! / 15) * Math.abs(axis.to - axis.from))).toBeLessThanOrEqual(0.005));
    // The zero line is drawn across the plot.
    expect(scene.nodes.some((node) => node.kind === "line" && num(node, "y1") === zero && num(node, "y2") === zero && num(node, "x2") - num(node, "x1") > 100)).toBe(true);
  });

  it("puts each bar's end level with its value on the drawn axis", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer({ min: 0, max: 100 }), fc.double({ min: 0, max: 1e9, noNaN: true })), { minLength: 1, maxLength: 12 }), fc.constantFrom("vertical", "horizontal"), (values, orientation) => {
        const categories = values.map((_, i) => ({ name: `C${i}` }));
        const scene = sceneOf({ categories, values, orientation });
        const all = ticks(scene);
        const [low, high] = [all[0]!, all.at(-1)!];
        const at = (value: number) => low.at + ((value - low.value) * (high.at - low.at)) / (high.value - low.value);
        const drawn = bars(scene);
        let b = 0;
        values.forEach((value, i) => {
          const expected = at(value);
          if (Math.abs(expected - at(0)) < 0.005) return; // a zero-length bar is not drawn
          const bar = drawn[b++]!;
          const end = orientation === "vertical" ? num(bar, "y") : num(bar, "x") + num(bar, "width");
          expect(end, `${orientation} ${i}`).toBeCloseTo(expected, 1);
        });
        expect(b).toBe(drawn.length);
      }),
      { numRuns: 150 },
    );
  });

  it.each(["vertical", "horizontal"] as const)("on a scale from −5, draws %s bars, their zero line and their value labels from zero (quality review QR-002)", (orientation) => {
    const scene = sceneOf({ orientation, values: [10, 5, 0], valueScale: { minimum: -5, maximum: 10 }, showValues: true });
    const vertical = orientation === "vertical";
    const zero = positionOf(scene, 0);
    // The zero line, across the plot.
    expect(
      scene.nodes.some((node) => node.kind === "line" && attr(node, "stroke-width") === defaultStyle.lineWidths.axis && (vertical
          ? Math.abs(num(node, "y1") - zero) < 0.02 && num(node, "y1") === num(node, "y2") && num(node, "x2") - num(node, "x1") > 100
          : Math.abs(num(node, "x1") - zero) < 0.02 && num(node, "x1") === num(node, "x2") && num(node, "y2") - num(node, "y1") > 40)),
    ).toBe(true);
    bars(scene).forEach((bar, i) => {
      const value = [10, 5][i]!;
      const [start, end] = vertical ? [num(bar, "y") + num(bar, "height"), num(bar, "y")] : [num(bar, "x"), num(bar, "x") + num(bar, "width")];
      expect(start, `${orientation} bar ${i} start`).toBeCloseTo(zero, 1);
      expect(end, `${orientation} bar ${i} end`).toBeCloseTo(positionOf(scene, value), 1);
      // Its label beyond its end, level with the bar.
      const label = boundsOf(scene.nodes.find((node) => node.kind === "text" && node.text === String(value) && Math.abs((vertical ? num(node, "x") : boundsOf(node).y0 + 6) - (vertical ? num(bar, "x") + num(bar, "width") / 2 : num(bar, "y") + num(bar, "height") / 2)) < 7)!);
      if (vertical) expect(label.y1, `${orientation} label ${i}`).toBeLessThanOrEqual(end);
      else {
        expect(label.x0, `${orientation} label ${i}`).toBeGreaterThanOrEqual(end);
        expect((label.y0 + label.y1) / 2).toBeCloseTo(num(bar, "y") + num(bar, "height") / 2, 0);
      }
    });
    // The zero bar's label sits at the zero line.
    const zeroLabels = scene.nodes.filter((node) => node.kind === "text" && node.text === "0");
    expect(zeroLabels.some((node) => (vertical ? Math.abs(boundsOf(node).y1 - zero) < 6 : Math.abs(boundsOf(node).x0 - zero) < 6))).toBe(true);
  });

  it("draws non-integer values proportionally (DGP Edge Cases)", () => {
    const [a, b] = bars(sceneOf({ categories: [{ name: "A" }, { name: "B" }], values: [2.5, 5], valueScale: { minimum: 0, maximum: 10 } }));
    expect(num(a!, "height") * 2).toBeCloseTo(num(b!, "height"), 1);
  });

  it(`keeps every bar the same thickness, ${BAR_FILL} of its slot up to ${MAX_BAR_THICKNESS}`, () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const scene = sceneOf({ orientation, categories: [{ name: "Walk" }, { name: "A name long enough to wrap onto three lines here" }, { name: "Car" }] });
      const thickness = bars(scene).map((bar) => (orientation === "vertical" ? num(bar, "width") : num(bar, "height")));
      expect(new Set(thickness).size, orientation).toBe(1);
      expect(thickness[0]!).toBeLessThanOrEqual(MAX_BAR_THICKNESS);
    }
    // Equal slots, narrow enough to stay under the cap: a bar is BAR_FILL of the distance between bars.
    for (const [orientation, count] of [
      ["vertical", 8],
      ["horizontal", 3],
    ] as const) {
      const categories = Array.from({ length: count }, (_, i) => ({ name: `C${i}` }));
      const drawn = bars(sceneOf({ orientation, categories, values: categories.map(() => 5) }));
      const centerOf = (bar: SceneNode) => (orientation === "vertical" ? num(bar, "x") + num(bar, "width") / 2 : num(bar, "y") + num(bar, "height") / 2);
      const spacing = centerOf(drawn[1]!) - centerOf(drawn[0]!);
      const thickness = orientation === "vertical" ? num(drawn[0]!, "width") : num(drawn[0]!, "height");
      expect(thickness, orientation).toBeLessThan(MAX_BAR_THICKNESS);
      expect(thickness, orientation).toBeCloseTo(BAR_FILL * spacing, 1);
    }
  });
});

describe("a zero value (DGP-REQ-022)", () => {
  it("draws no bar and keeps its slot and name", () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const scene = sceneOf({ orientation, values: [12, 0, 9] });
      expect(bars(scene), orientation).toHaveLength(2);
      expect(texts(scene), orientation).toContain("Bus");
    }
  });

  it("keeps the slots of the others where they were", () => {
    const withZero = bars(sceneOf({ values: [12, 0, 9] }));
    const without = bars(sceneOf({ values: [12, 5, 9] }));
    expect(num(withZero[1]!, "x")).toBe(num(without[2]!, "x"));
  });
});

describe("orientation (DGP-REQ-018)", () => {
  it("draws upright bars by default, with names below, and bars across when horizontal, with names on the left", () => {
    const upright = sceneOf({});
    const [bar] = bars(upright);
    expect(num(textNode(upright, "Walk"), "y")).toBeGreaterThan(num(bar!, "y") + num(bar!, "height"));
    const across = sceneOf({ orientation: "horizontal" });
    const [row] = bars(across);
    expect(num(textNode(across, "Walk"), "x")).toBeLessThan(num(row!, "x"));
    // The name sits level with its bar.
    expect(num(row!, "y") + num(row!, "height") / 2).toBeCloseTo(boundsOf(textNode(across, "Walk")).y0 + (boundsOf(textNode(across, "Walk")).y1 - boundsOf(textNode(across, "Walk")).y0) / 2, 0);
    expect(valueAxis(across).vertical).toBe(false);
  });

  it("reserves exactly the room the category-axis label's drawn lines take, left of the names (quality review QR-007)", () => {
    // Wrapped to a short provisional height this label takes two lines; at 30 rows' height, one.
    const label = "The way each pupil travels to school on a normal school day";
    const categories = Array.from({ length: 30 }, (_, i) => ({ name: `C${i}` }));
    const scene = sceneOf({ orientation: "horizontal", categories, values: categories.map(() => 1), categoryAxisLabel: label });
    const drawn = scene.nodes.filter((node) => node.kind === "text" && attr(node, "transform") !== undefined);
    expect(drawn.map((node) => (node.kind === "text" ? node.text : ""))).toEqual([label]);
    // The plot's left edge (the category axis) is the margin, one label line and its gap, then the names' column.
    const axis = scene.nodes.find((node) => node.kind === "line" && attr(node, "x1") === attr(node, "x2") && num(node, "y2") - num(node, "y1") > 100)!;
    expect(num(axis, "x1")).toBeCloseTo(SCENE_MARGIN + defaultStyle.fontSizes.label * LINE_HEIGHT + 8 + 96 + 4, 1);
  });

  it("sizes each horizontal row to its own name, so one long name makes one tall row", () => {
    const scene = sceneOf({ orientation: "horizontal", categories: [{ name: "Walk" }, { name: "word ".repeat(30).trim() }, { name: "Car" }] });
    const names = ["Walk", "Car"].map((name) => boundsOf(textNode(scene, name)));
    const longLines = scene.nodes.filter((node) => node.kind === "text" && node.text.startsWith("word"));
    expect(longLines.length).toBeGreaterThan(3);
    // The short rows stay short: from Walk's name to Car's is the long name's block, its gap and two
    // short rows (each at most 40 here), not three rows as tall as the long one.
    expect(names[1]!.y0 - names[0]!.y0).toBeLessThan(longLines.length * lineHeight + 3 * 40);
    expect(names[1]!.y0 - names[0]!.y0).toBeLessThan(2 * longLines.length * lineHeight);
  });
});

describe("colors (DGP-REQ-019)", () => {
  it("colors a bar with its category's color, else barColor, else the default", () => {
    const fill = (scene: Scene) => bars(scene).map((bar) => attr(bar, "fill"));
    expect(fill(sceneOf({}))).toEqual([defaultStyle.colors.accent, defaultStyle.colors.accent, defaultStyle.colors.accent]);
    expect(fill(sceneOf({ barColor: "green" }))).toEqual(["#2e7d32", "#2e7d32", "#2e7d32"]);
    expect(fill(sceneOf({ barColor: "green", categories: [{ name: "Walk" }, { name: "Bus", color: "#123456" }, { name: "Car" }] }))).toEqual(["#2e7d32", "#123456", "#2e7d32"]);
    expect(fill(sceneOf({ categories: [{ name: "Walk", color: "red" }, { name: "Bus" }, { name: "Car" }] }))).toEqual(["#c62828", defaultStyle.colors.accent, defaultStyle.colors.accent]);
  });
});

describe("value labels (DGP-REQ-020)", () => {
  it("writes each value exactly as supplied, above an upright bar and right of a bar across, and 0 for a zero bar", () => {
    const values = [12, 7.5, 0, 0.000123456789];
    const categories = values.map((_, i) => ({ name: `C${i}` }));
    for (const orientation of ["vertical", "horizontal"] as const) {
      const scene = sceneOf({ orientation, categories, values, showValues: true });
      const drawn = bars(scene);
      for (const label of ["12", "7.5", "0"]) expect(texts(scene), `${orientation} ${label}`).toContain(label);
      // A long value wraps rather than being rounded: its lines join up to it.
      const tail = texts(scene).filter((text) => /^[\d.]+$/.test(text) && text.length > 4);
      expect(tail.join(""), orientation).toContain("0.000123456789".slice(0, 8));
      const twelve = boundsOf(scene.nodes.filter((node) => node.kind === "text" && node.text === "12").at(-1)!);
      const bar = boundsOf(drawn[0]!);
      if (orientation === "vertical") expect(twelve.y1).toBeLessThanOrEqual(bar.y0);
      else expect(twelve.x0).toBeGreaterThanOrEqual(bar.x1);
    }
  });

  it.each(["vertical", "horizontal"] as const)("never cuts a value label: its lines, %s, join back to the whole written value, even in crowded columns (quality review QR-001)", (orientation) => {
    const full = displayValue(5e-324, "supplied");
    expect(full).toHaveLength(326);
    for (const count of [3, 100]) {
      const categories = Array.from({ length: count }, (_, i) => ({ name: `C${i}` }));
      const scene = sceneOf({ orientation, categories, values: categories.map((_, i) => (i === 0 ? 5e-324 : 1)), showValues: true });
      // A label's lines are consecutive text nodes: joined in drawing order, they hold the whole value.
      expect(texts(scene).join(""), `${orientation} ${count}`).toContain(full);
      expect(texts(scene).some((text) => text.endsWith("…")), `${orientation} ${count}`).toBe(false);
    }
  });

  it("writes nothing without showValues", () => {
    const scene = sceneOf({ values: [12, 7.5, 9], valueScale: { minimum: 0, maximum: 20, tickInterval: 5 } });
    expect(texts(scene)).not.toContain("7.5");
  });

  it("puts a label across before the zero line when a negative minimum leaves more room there than after its bar (security review SEC-001)", () => {
    const scene = sceneOf({ orientation: "horizontal", values: [0.91234567891, 0.01, 0.95], valueScale: { minimum: -1, maximum: 1 }, showValues: true });
    const zero = positionOf(scene, 0);
    const [long, short, third] = bars(scene).map(boundsOf);
    // 0.91234567891 reaches near the plot's end and would wrap there: its label sits left of the
    // zero line, inside the plot, on one line.
    const before = boundsOf(textNode(scene, "0.91234567891"));
    expect(before.x1).toBeLessThanOrEqual(zero - 4 + 0.02);
    expect(before.x0).toBeGreaterThanOrEqual(valueAxis(scene).from - 0.02);
    expect(before.y0 < long!.y1 && before.y1 > long!.y0).toBe(true);
    // 0.01 has room after its bar, and keeps its label there.
    expect(boundsOf(textNode(scene, "0.01")).x0).toBeGreaterThanOrEqual(short!.x1);
    // 0.95 is short enough to fit after its bar, so it stays there.
    expect(boundsOf(textNode(scene, "0.95")).x0).toBeGreaterThanOrEqual(third!.x1);
    expect(geometryProblems(scene)).toEqual([]);
  });

  it("wraps labels at the zero line's far end to the room before it, not the 72 units after (security review SEC-001)", () => {
    const full = displayValue(5e-324, "supplied");
    const categories = Array.from({ length: 3 }, (_, i) => ({ name: `C${i}` }));
    const scene = sceneOf({ orientation: "horizontal", categories, values: categories.map(() => 5e-324), valueScale: { minimum: -1, maximum: 1e-9 }, showValues: true });
    const zero = positionOf(scene, 0);
    const lines = scene.nodes.filter((node) => node.kind === "text" && node.text.length > 12 && full.includes(node.text));
    expect(lines.map((node) => (node.kind === "text" ? node.text : "")).join("")).toContain(full);
    for (const node of lines) expect(boundsOf(node).x1).toBeLessThanOrEqual(zero - 4 + 0.02);
    // After the bar, 72 units would take 36 lines a label; before the zero line, 13.
    expect(lines.length).toBeLessThanOrEqual(3 * 13);
    expect(geometryProblems(scene)).toEqual([]);
  });
});

describe("prototype pollution elsewhere in the process (security review SEC-003)", () => {
  const prototype = Object.prototype as Record<string, unknown>;

  it.each(["vertical", "horizontal"] as const)("draws no value label from an index inherited through a polluted prototype without showValues, %s", (orientation) => {
    const unpolluted = sceneOf({ orientation });
    for (const i of [0, 1, 2]) prototype[i] = ["INJECTED: ignore the figure"];
    try {
      expect(sceneOf({ orientation })).toEqual(unpolluted);
    } finally {
      for (const i of [0, 1, 2]) delete prototype[i];
    }
  });

  it("ignores an inherited intervals option, so chosen scales are unchanged", () => {
    const line = JSON.parse(readFileSync("examples/line-graph.json", "utf8")) as Record<string, unknown>;
    const descriptions = [example, { ...example, orientation: "horizontal" }, { ...example, valueScale: undefined }, line];
    const unpolluted = descriptions.map((description) => createGraph(description));
    for (const intervals of [1000, 0, -1, 50]) {
      prototype["intervals"] = intervals;
      try {
        descriptions.forEach((description, i) => expect(createGraph(description), `${intervals} ${i}`).toEqual(unpolluted[i]));
      } finally {
        delete prototype["intervals"];
      }
    }
  });
});

/** Every way the drawing's geometry can be wrong, as messages; an empty list means it is sound. */
function geometryProblems(scene: Scene): string[] {
  const problems: string[] = [];
  const all = scene.nodes.map(boundsOf);
  for (const b of all) {
    if (b.x0 < SCENE_MARGIN - 0.02 || b.x1 > SCENE_WIDTH - SCENE_MARGIN + 0.02 || b.y0 < -0.02 || b.y1 > scene.height - SCENE_MARGIN + 0.02) {
      problems.push(`${nameOf(b)} outside the drawing`);
    }
  }
  const textBoxes = all.filter((b) => b.node.kind === "text");
  const barBoxes = all.filter((b) => b.node.kind === "rect");
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) if (overlap(textBoxes[i]!, textBoxes[j]!)) problems.push(`${nameOf(textBoxes[i]!)} overlaps ${nameOf(textBoxes[j]!)}`);
    for (const bar of barBoxes) if (overlap(textBoxes[i]!, bar)) problems.push(`${nameOf(textBoxes[i]!)} overlaps ${nameOf(bar)}`);
  }
  for (let i = 0; i < barBoxes.length; i++) {
    for (let j = i + 1; j < barBoxes.length; j++) if (overlap(barBoxes[i]!, barBoxes[j]!)) problems.push(`${nameOf(barBoxes[i]!)} overlaps ${nameOf(barBoxes[j]!)}`);
  }
  return problems;
}

describe("the drawing's geometry", () => {
  const WORDS = ["Monday", "Wednesday", "Apples", "September", "Average", "of", "A", "Pneumonoultramicroscopicsilicovolcanoconiosis"];
  const barGraph = (orientation: "vertical" | "horizontal") =>
    fc.integer({ min: 1, max: 30 }).chain((n) =>
      fc
        .record({
          names: fc.array(fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 3 }), { minLength: n, maxLength: n }),
          values: fc.array(fc.oneof(fc.integer({ min: 0, max: 50 }), fc.double({ min: 0, max: 1e9, noNaN: true }), fc.constant(0)), { minLength: n, maxLength: n }),
          showValues: fc.boolean(),
          title: fc.option(fc.constantFrom("Pets", "How we get to school each morning, by class and by day of the week")),
          categoryAxisLabel: fc.option(fc.constantFrom("Way", "The way each pupil travels to school on a normal school day")),
          valueAxisLabel: fc.option(fc.constantFrom("Pupils", "The number of pupils who travel this way, counted on Monday morning")),
        })
        .map(({ names, ...rest }) => ({
          orientation,
          categories: names.map((words, i) => ({ name: `${words.join(" ")} ${i + 1}` })),
          ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null)),
        })),
    );

  it.each(["vertical", "horizontal"] as const)("keeps everything %s inside the drawing, text clear of text and bars, bars apart, while uncrowded", (orientation) => {
    fc.assert(
      fc.property(barGraph(orientation), (input) => {
        const scene = sceneOf(input);
        if (orientation === "vertical") {
          // Crowded columns (a name line or a value label wider than its slot) may touch: DEL-001.
          const axis = scene.nodes.find((node) => node.kind === "line" && attr(node, "y1") === attr(node, "y2") && num(node, "x2") - num(node, "x1") > 50)!;
          const slot = (num(axis, "x2") - num(axis, "x1")) / input.categories.length;
          fc.pre(slot >= lineHeight && ((input as { showValues?: boolean }).showValues !== true || slot >= MIN_VALUE_LABEL_WIDTH + 2));
        }
        expect(geometryProblems(scene)).toEqual([]);
      }),
      { numRuns: 150 },
    );
  });
});

describe("crowded columns (DGP TICKET-005 QR-002, deferred here; DEL-001)", () => {
  it.each([50, 100])("draws every one of %d names, all inside the drawing", (count) => {
    const categories = Array.from({ length: count }, (_, i) => ({ name: `Category ${i + 1}` }));
    const scene = sceneOf({ categories, values: categories.map((_, i) => i % 7), showValues: true });
    const names = scene.nodes.filter((node) => node.kind === "text" && node.text.startsWith("Category"));
    expect(names.map((node) => (node.kind === "text" ? node.text : ""))).toEqual(categories.map((c) => c.name));
    for (const node of scene.nodes) {
      const b = boundsOf(node);
      expect(b.x0, nameOf(b)).toBeGreaterThanOrEqual(SCENE_MARGIN - 0.02);
      expect(b.x1, nameOf(b)).toBeLessThanOrEqual(SCENE_WIDTH - SCENE_MARGIN + 0.02);
      // And within the drawing's height (code review CR-004).
      expect(b.y0, nameOf(b)).toBeGreaterThanOrEqual(-0.02);
      expect(b.y1, nameOf(b)).toBeLessThanOrEqual(scene.height + 0.02);
    }
  });
});

describe("the whole bar graph through createGraph", () => {
  it("is the Scene createGraph returns for the example, with the text alternative", () => {
    const result = createGraph(example);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene).toEqual(sceneOf(example));
    expect(result.scene.textAlternative.startsWith("A bar graph titled “How we get to school”.")).toBe(true);
  });

  it("keeps the drawing bounded for caller text of any length", () => {
    const long = "word ".repeat(100_000).trim();
    for (const orientation of ["vertical", "horizontal"] as const) {
      const scene = sceneOf({ orientation, title: long, categoryAxisLabel: long, valueAxisLabel: long });
      // Title 3 lines, two axis labels of 2, three names, tick labels.
      expect(texts(scene).length, orientation).toBeLessThan(3 + 4 + 3 + 25);
    }
  });
});
