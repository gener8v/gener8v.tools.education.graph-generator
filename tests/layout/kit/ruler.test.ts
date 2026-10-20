import { describe, expect, it } from "vitest";
import { RULER_MAX_LENGTH, type RulerUnit, rulerScale } from "../../../src/core/ruler";
import { defaultStyle } from "../../../src/core/style";
import { checkScene } from "../../../src/layout/kit/check";
import { fmt } from "../../../src/layout/kit/format";
import {
  RULER_MARK_LENGTHS,
  RULER_MIN_MARK_WIDTH,
  type RulerMarksOptions,
  drawRulerMarks,
  rulerMarksDepth,
  rulerNumberOverhang,
} from "../../../src/layout/kit/ruler";
import { linearScale } from "../../../src/layout/kit/scale";
import type { SceneNode } from "../../../src/layout/scene";
import { EVERY_RULER } from "../../fixtures/rulers";
import { attr, boundsOf, overlap } from "../../fixtures/scene-geometry";

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

const withDivision = (division: string | undefined) => (division === undefined ? {} : { smallestDivision: division });

const EDGES = [
  ["horizontal", [20, 100], [380, 100]],
  ["vertical, upward", [60, 380], [60, 20]],
  ["diagonal", [40, 300], [360, 60]],
] as const;

describe("drawRulerMarks (NLC-REQ-044, NLC-REQ-047)", () => {
  it("draws one mark per value, then the numbers", () => {
    const nodes = drawRulerMarks(ruler("centimeters", 15));
    expect(lines(nodes)).toHaveLength(151);
    expect(nodes.findIndex((node) => node.kind === "text")).toBe(151);
    expect(checkScene({ width: 400, height: fmt(200), textAlternative: "A ruler.", nodes })).toEqual([]);
  });

  it.each(EDGES)("puts every mark of every ruler within 0.5 units of linearScale(value), perpendicular, on a %s edge, on either side (quality review QR-003)", (_, from, to) => {
    const along = [to[0] - from[0], to[1] - from[1]] as const;
    for (const [unit, division, length] of EVERY_RULER) {
      const { marks } = rulerScale(unit, length, division)!;
      const xAt = linearScale([0, length], [from[0], to[0]]);
      const yAt = linearScale([0, length], [from[1], to[1]]);
      for (const side of ["left", "right"] as const) {
        const drawn = lines(drawRulerMarks(ruler(unit, length, { from: [from[0], from[1]], to: [to[0], to[1]], side, ...withDivision(division) })));
        expect(drawn).toHaveLength(marks.length);
        drawn.forEach((mark, i) => {
          const where = `${length} ${unit} at ${String(division)}, mark ${i}, ${side}`;
          expect(Math.hypot(num(mark, "x1") - xAt(marks[i]!.value), num(mark, "y1") - yAt(marks[i]!.value)), where).toBeLessThanOrEqual(0.5);
          const across = [num(mark, "x2") - num(mark, "x1"), num(mark, "y2") - num(mark, "y1")] as const;
          // Perpendicular: the dot product, per unit of length, stays within rounding.
          expect(Math.abs(along[0] * across[0] + along[1] * across[1]) / Math.hypot(...along), where).toBeLessThan(0.02);
          // Right of travel is a positive cross product with y running down the page.
          expect(Math.sign(along[0] * across[1] - along[1] * across[0]), where).toBe(side === "right" ? 1 : -1);
        });
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

  it("draws every mark of every ruler at its rank's length", () => {
    for (const [unit, division, length] of EVERY_RULER) {
      const { marks } = rulerScale(unit, length, division)!;
      const drawn = lines(drawRulerMarks(ruler(unit, length, withDivision(division))));
      drawn.forEach((mark, i) => expect(markLength(mark)).toBeCloseTo(RULER_MARK_LENGTHS[unit][marks[i]!.rank]!, 1));
    }
  });

  it("draws three lengths of mark on a centimetre ruler, five on an inch ruler at sixteenths, three at quarters", () => {
    for (const [unit, division, distinct] of [
      ["centimeters", undefined, 3],
      ["inches", undefined, 5],
      ["inches", "quarter", 3],
    ] as const) {
      const drawn = lines(drawRulerMarks(ruler(unit, 2, withDivision(division))));
      expect(new Set(drawn.map((mark) => markLength(mark).toFixed(1))).size).toBe(distinct);
    }
  });
});

describe("mark widths (DEL-002)", () => {
  it("keeps every gap between neighbouring marks at least as wide as a mark, on every ruler, unless the floor applies (quality review QR-005)", () => {
    for (const [unit, division, length] of EVERY_RULER) {
      const drawn = lines(drawRulerMarks(ruler(unit, length, withDivision(division))));
      const width = num(drawn[0]!, "stroke-width");
      for (let i = 1; i < drawn.length; i++) {
        const pitch = Math.hypot(num(drawn[i]!, "x1") - num(drawn[i - 1]!, "x1"), num(drawn[i]!, "y1") - num(drawn[i - 1]!, "y1"));
        if (width > RULER_MIN_MARK_WIDTH) expect(pitch - width, `${length} ${unit} at ${String(division)}`).toBeGreaterThanOrEqual(width - 0.02);
      }
      expect(new Set(drawn.map((mark) => num(mark, "stroke-width"))).size).toBe(1);
      expect(width).toBeLessThanOrEqual(defaultStyle.lineWidths.tick);
    }
  });

  it("pins the narrowed widths: half the space between marks", () => {
    const widthOf = (options: RulerMarksOptions) => num(lines(drawRulerMarks(options))[0]!, "stroke-width");
    // 360 units / 300 millimetres / 2.
    expect(widthOf(ruler("centimeters", 30))).toBe(0.6);
    // 360 units / 192 sixteenths / 2 = 0.9375.
    expect(widthOf(ruler("inches", 12))).toBe(0.94);
    // 360 units / 50 millimetres / 2 = 3.6, above the default width.
    expect(widthOf(ruler("centimeters", 5))).toBe(defaultStyle.lineWidths.tick);
  });

  it("never draws a mark narrower than the floor, so no mark is drawn at width 0 (code review CR-004)", () => {
    expect(num(lines(drawRulerMarks(ruler("centimeters", 30, { to: [22, 100] })))[0]!, "stroke-width")).toBe(RULER_MIN_MARK_WIDTH);
  });
});

describe("numbers (NLC-REQ-043)", () => {
  it("numbers every whole unit of every ruler from 0 to the length, and nothing else", () => {
    for (const [unit, division, length] of EVERY_RULER) {
      const drawn = texts(drawRulerMarks(ruler(unit, length, withDivision(division))));
      expect(drawn.map((node) => node.text)).toEqual(Array.from({ length: length + 1 }, (_, i) => String(i)));
    }
  });

  it.each(EDGES)("centres each number on its whole mark and keeps every number clear of every mark, on a %s edge, on either side (quality review QR-004)", (_, from, to) => {
    for (const [unit, length] of [
      ["centimeters", 10],
      ["inches", 6],
    ] as const) {
      const { marks } = rulerScale(unit, length)!;
      for (const side of ["left", "right"] as const) {
        const nodes = drawRulerMarks(ruler(unit, length, { from: [from[0], from[1]], to: [to[0], to[1]], side, fontSize: 9 }));
        const drawn = lines(nodes);
        const wholes = drawn.filter((_mark, i) => marks[i]!.rank === 0);
        const numbers = texts(nodes);
        expect(numbers).toHaveLength(wholes.length);
        numbers.forEach((number, i) => {
          // The number's centre lies on the line through its mark.
          const [mx, my] = [num(wholes[i]!, "x1"), num(wholes[i]!, "y1")];
          const [ex, ey] = [num(wholes[i]!, "x2") - mx, num(wholes[i]!, "y2") - my];
          const box = boundsOf(number);
          const [cx, cy] = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
          expect(Math.abs(ex * (cy - my) - ey * (cx - mx)) / Math.hypot(ex, ey)).toBeLessThan(1.5);
          for (const mark of drawn) expect(overlap(box, boundsOf(mark)), `${number.text} on ${side}`).toBe(false);
        });
      }
    }
  });

  it("draws the numbers at the font size asked for, so a 30 cm ruler's numbers can be sized apart (code review CR-005)", () => {
    const boxes = (fontSize?: number) =>
      texts(drawRulerMarks(ruler("centimeters", 30, fontSize === undefined ? {} : { fontSize }))).map((node) => ({ size: num(node, "font-size"), box: boundsOf(node) }));
    expect(new Set(boxes().map((number) => number.size))).toEqual(new Set([defaultStyle.fontSizes.tickLabel]));
    const overlaps = (numbers: ReturnType<typeof boxes>) => numbers.slice(1).filter((number, i) => number.box.x0 < numbers[i]!.box.x1).length;
    // At the default size, "10" to "30" run together across 360 units; at 9.5 none do.
    expect(overlaps(boxes())).toBeGreaterThan(0);
    const small = boxes(9.5);
    expect(new Set(small.map((number) => number.size))).toEqual(new Set([9.5]));
    expect(overlaps(small)).toBe(0);
  });

  it("takes the default font size and division for options given as undefined (quality review QR-009)", () => {
    const plain = drawRulerMarks(ruler("inches", 3));
    expect(drawRulerMarks(ruler("inches", 3, { fontSize: undefined, smallestDivision: undefined }))).toEqual(plain);
  });

  it("reads the font size and division only as the options' own keys", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    const plain = drawRulerMarks(ruler("inches", 5));
    for (const [key, value] of [
      ["fontSize", 40],
      ["smallestDivision", "half"],
    ] as const) {
      Object.defineProperty(prototype, key, { value, configurable: true, writable: true });
      try {
        expect(drawRulerMarks(ruler("inches", 5)), key).toEqual(plain);
      } finally {
        delete prototype[key];
      }
    }
  });
});

describe("room for the marks and numbers (quality review QR-010)", () => {
  it("reaches no further past a horizontal edge than rulerMarksDepth, and no further past its ends than rulerNumberOverhang, on every ruler", () => {
    for (const fontSize of [9, 12]) {
      for (const [unit, division, length] of EVERY_RULER) {
        const nodes = drawRulerMarks(ruler(unit, length, { ...withDivision(division), fontSize }));
        const boxes = nodes.map(boundsOf);
        const deepest = Math.max(...boxes.map((box) => box.y1)) - 100;
        expect(deepest).toBeLessThanOrEqual(rulerMarksDepth(unit, fontSize));
        expect(deepest).toBeGreaterThan(Math.max(...RULER_MARK_LENGTHS[unit]));
        const { start, end } = rulerNumberOverhang(length, fontSize);
        expect(20 - Math.min(...boxes.map((box) => box.x0))).toBeCloseTo(start, 1);
        expect(Math.max(...boxes.map((box) => box.x1)) - 380).toBeCloseTo(end, 1);
      }
    }
  });
});

describe("options no validated ruler gives", () => {
  it.each<[string, Partial<RulerMarksOptions>, RegExp]>([
    ["a length of 0", { length: 0 }, /no ruler is 0 centimeters/],
    ["a length that is not whole", { length: 4.5 }, /no ruler/],
    ["a length past the maximum", { length: 31 }, /no ruler/],
    ["an unknown unit", { unit: "feet" as RulerUnit }, /no ruler/],
    ["a division on a centimetre ruler", { smallestDivision: "half" }, /no ruler .* marked to half/],
    ["an unknown division", { unit: "inches", smallestDivision: "third" }, /no ruler/],
    ["a null division on an inch ruler (code review CR-001)", { unit: "inches", smallestDivision: null as unknown as string }, /no ruler/],
    ["an end that is not finite", { to: [Number.NaN, 100] }, /from and to/],
    ["a zero-length edge", { to: [20, 100] }, /different points/],
    ["an unknown side", { side: "below" as "left" }, /side must be/],
    ["a font size of 0", { fontSize: 0 }, /fontSize/],
    ["a font size that rounds to 0 (quality review QR-008)", { fontSize: 0.004 }, /fontSize/],
    ["a font size that is not finite", { fontSize: Number.NaN }, /fontSize/],
  ])("throw on %s, naming the option", (_, extra, message) => {
    expect(() => drawRulerMarks({ ...ruler("centimeters", 10), ...extra })).toThrow(RangeError);
    expect(() => drawRulerMarks({ ...ruler("centimeters", 10), ...extra })).toThrow(message);
  });

  it("draw the two largest rulers cleanly: 301 and 193 marks", () => {
    for (const [unit, count] of [
      ["centimeters", 301],
      ["inches", 193],
    ] as const) {
      const nodes = drawRulerMarks(ruler(unit, RULER_MAX_LENGTH[unit]));
      expect(lines(nodes)).toHaveLength(count);
      expect(checkScene({ width: 400, height: fmt(200), textAlternative: "A ruler.", nodes })).toEqual([]);
    }
  });
});
