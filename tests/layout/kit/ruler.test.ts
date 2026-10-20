import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { RULER_MAX_LENGTH, type RulerUnit, divisionsPerUnit, rulerMarks } from "../../../src/core/ruler";
import { defaultStyle } from "../../../src/core/style";
import { checkScene } from "../../../src/layout/kit/check";
import { fmt } from "../../../src/layout/kit/format";
import { RULER_MARK_LENGTHS, type RulerMarksOptions, drawRulerMarks } from "../../../src/layout/kit/ruler";
import { linearScale } from "../../../src/layout/kit/scale";
import type { SceneNode } from "../../../src/layout/scene";
import { attr, boundsOf } from "../../fixtures/scene-geometry";

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const lines = (nodes: SceneNode[]) => nodes.filter((node) => node.kind === "line");
const texts = (nodes: SceneNode[]) => nodes.flatMap((node) => (node.kind === "text" ? [node] : []));
const markLength = (node: SceneNode) => Math.hypot(num(node, "x2") - num(node, "x1"), num(node, "y2") - num(node, "y1"));

const ruler = (unit: RulerUnit, length: number, extra: Partial<RulerMarksOptions> = {}): RulerMarksOptions => ({
  from: [20, 100],
  to: [380, 100],
  unit,
  length,
  side: "right",
  ...extra,
});

const rulers = fc.constantFrom<[RulerUnit, string | undefined]>(["centimeters", undefined], ["inches", "half"], ["inches", "quarter"], ["inches", "eighth"], ["inches", undefined]);

describe("drawRulerMarks (NLC-REQ-044, NLC-REQ-047)", () => {
  it("draws one mark per value, then the numbers", () => {
    const nodes = drawRulerMarks(ruler("centimeters", 15));
    expect(lines(nodes)).toHaveLength(151);
    expect(nodes.findIndex((node) => node.kind === "text")).toBe(151);
    expect(checkScene({ width: 400, height: fmt(200), textAlternative: "A ruler.", nodes })).toEqual([]);
  });

  it.each([
    ["horizontal", [20, 100], [380, 100]],
    ["vertical, upward", [60, 380], [60, 20]],
    ["diagonal", [40, 300], [360, 60]],
  ] as const)("puts each mark's foot within 0.5 units of linearScale(value) along a %s edge", (_, from, to) => {
    fc.assert(
      fc.property(rulers, fc.integer({ min: 1, max: 30 }), ([unit, division], length) => {
        fc.pre(length <= RULER_MAX_LENGTH[unit]);
        const options = ruler(unit, length, { from: [from[0], from[1]], to: [to[0], to[1]], ...(division === undefined ? {} : { division }) });
        const marks = rulerMarks(unit, length, division)!;
        const xAt = linearScale([0, length], [from[0], to[0]]);
        const yAt = linearScale([0, length], [from[1], to[1]]);
        const drawn = lines(drawRulerMarks(options));
        expect(drawn).toHaveLength(marks.length);
        drawn.forEach((mark, i) => {
          const value = marks[i]!.value;
          expect(Math.hypot(num(mark, "x1") - xAt(value), num(mark, "y1") - yAt(value))).toBeLessThanOrEqual(0.5);
        });
      }),
      { numRuns: 60 },
    );
  });

  it("runs every mark perpendicular to the edge, into the side asked for", () => {
    const from: [number, number] = [40, 300];
    const to: [number, number] = [360, 60];
    const along = [to[0] - from[0], to[1] - from[1]] as const;
    for (const side of ["left", "right"] as const) {
      for (const mark of lines(drawRulerMarks(ruler("inches", 4, { from, to, side })))) {
        const across = [num(mark, "x2") - num(mark, "x1"), num(mark, "y2") - num(mark, "y1")] as const;
        // Perpendicular: the dot product, per unit of length, stays within rounding.
        expect(Math.abs(along[0] * across[0] + along[1] * across[1]) / Math.hypot(...along)).toBeLessThan(0.02);
        // Right of travel is a positive cross product with y running down the page.
        expect(Math.sign(along[0] * across[1] - along[1] * across[0])).toBe(side === "right" ? 1 : -1);
      }
    }
  });

  it("passes every number through fmt()", () => {
    const nodes = drawRulerMarks(ruler("inches", 7, { from: [13.333333, 101.987654], to: [377.123456, 99.000001] }));
    for (const node of nodes) for (const [, value] of node.attrs) if (typeof value === "number") expect(fmt(value)).toBe(value);
  });
});

describe("graded mark lengths (NLC-REQ-045, NLC-REQ-048)", () => {
  it("keeps each unit's lengths strictly decreasing by rank", () => {
    for (const lengths of Object.values(RULER_MARK_LENGTHS)) {
      for (let rank = 1; rank < lengths.length; rank++) expect(lengths[rank]!).toBeLessThan(lengths[rank - 1]!);
    }
    expect(RULER_MARK_LENGTHS.centimeters).toHaveLength(3);
    expect(RULER_MARK_LENGTHS.inches).toHaveLength(5);
  });

  it("draws each mark at its rank's length: three on a centimetre ruler, five on an inch ruler at sixteenths", () => {
    for (const [unit, division, distinct] of [
      ["centimeters", undefined, 3],
      ["inches", undefined, 5],
      ["inches", "quarter", 3],
    ] as const) {
      const marks = rulerMarks(unit, 2, division)!;
      const drawn = lines(drawRulerMarks(ruler(unit, 2, division === undefined ? {} : { division })));
      drawn.forEach((mark, i) => expect(markLength(mark)).toBeCloseTo(RULER_MARK_LENGTHS[unit][marks[i]!.rank]!, 1));
      expect(new Set(drawn.map((mark) => markLength(mark).toFixed(1))).size).toBe(distinct);
    }
  });

  it("draws a whole centimetre longer than a half, and a half longer than a millimetre", () => {
    const [zero, mm, , , , half] = lines(drawRulerMarks(ruler("centimeters", 1)));
    expect(markLength(zero!)).toBeGreaterThan(markLength(half!));
    expect(markLength(half!)).toBeGreaterThan(markLength(mm!));
  });

  it("narrows marks to half their spacing, so a 30 cm ruler's millimetres stay apart (DEL-002)", () => {
    const widths = (options: RulerMarksOptions) => new Set(lines(drawRulerMarks(options)).map((mark) => num(mark, "stroke-width")));
    expect(widths(ruler("centimeters", 30))).toEqual(new Set([0.6]));
    expect(widths(ruler("inches", 12))).toEqual(new Set([0.94]));
    expect(widths(ruler("centimeters", 5))).toEqual(new Set([defaultStyle.lineWidths.tick]));
  });
});

describe("numbers (NLC-REQ-043)", () => {
  it("numbers every whole unit from 0 to the length, and nothing else", () => {
    fc.assert(
      fc.property(rulers, fc.integer({ min: 1, max: 30 }), ([unit, division], length) => {
        fc.pre(length <= RULER_MAX_LENGTH[unit]);
        const drawn = texts(drawRulerMarks(ruler(unit, length, division === undefined ? {} : { division })));
        expect(drawn.map((node) => node.text)).toEqual(Array.from({ length: length + 1 }, (_, i) => String(i)));
      }),
      { numRuns: 60 },
    );
  });

  it("centres each number on its whole mark, past the mark's end", () => {
    const nodes = drawRulerMarks(ruler("centimeters", 10));
    const wholes = lines(nodes).filter((mark) => markLength(mark) > 19);
    texts(nodes).forEach((number, i) => {
      const box = boundsOf(number);
      const mark = boundsOf(wholes[i]!);
      expect(num(number, "x")).toBeCloseTo(num(wholes[i]!, "x1"), 1);
      expect(box.y0).toBeGreaterThanOrEqual(mark.y1);
    });
  });

  it("clears its marks on a vertical edge too, numbering beside them", () => {
    const nodes = drawRulerMarks(ruler("inches", 5, { from: [60, 380], to: [60, 20], side: "right" }));
    const wholes = lines(nodes).filter((mark) => markLength(mark) > 21);
    texts(nodes).forEach((number, i) => {
      const box = boundsOf(number);
      const mark = boundsOf(wholes[i]!);
      // Travelling up the page, right of travel is toward larger x.
      expect(box.x0).toBeGreaterThanOrEqual(mark.x1);
    });
  });
});

describe("options no validated ruler gives", () => {
  it.each<[string, Partial<RulerMarksOptions>]>([
    ["a length of 0", { length: 0 }],
    ["a length that is not whole", { length: 4.5 }],
    ["a length past the maximum", { length: 31 }],
    ["an unknown unit", { unit: "feet" as RulerUnit }],
    ["a division on a centimetre ruler", { division: "half" }],
    ["an unknown division", { unit: "inches", division: "third" }],
    ["an end that is not finite", { to: [Number.NaN, 100] }],
    ["a zero-length edge", { to: [20, 100] }],
    ["an unknown side", { side: "below" as "left" }],
  ])("throw on %s rather than drawing it", (_, extra) => {
    expect(() => drawRulerMarks({ ...ruler("centimeters", 10), ...extra })).toThrow(RangeError);
  });

  it("draw the two largest rulers cleanly: 301 and 193 marks", () => {
    for (const [unit, count] of [
      ["centimeters", 301],
      ["inches", 193],
    ] as const) {
      const nodes = drawRulerMarks(ruler(unit, RULER_MAX_LENGTH[unit]));
      expect(lines(nodes)).toHaveLength(count);
      expect(divisionsPerUnit(unit)! * RULER_MAX_LENGTH[unit] + 1).toBe(count);
      expect(checkScene({ width: 400, height: fmt(200), textAlternative: "A ruler.", nodes })).toEqual([]);
    }
  });
});
