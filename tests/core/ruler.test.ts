import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_INCH_DIVISION,
  INCH_DIVISIONS,
  RULER_MAX_LENGTH,
  RULER_UNITS,
  type RulerUnit,
  isRulerLength,
  marksPerUnit,
  rulerScale,
} from "../../src/core/ruler";
import { EVERY_RULER } from "../fixtures/rulers";

const scale = (unit: string, length: number, division?: string) => rulerScale(unit, length, division)!;
const ranksOf = (unit: string, length: number, division?: string) => scale(unit, length, division).marks.map((mark) => mark.rank);

describe("the ruler's units, divisions and limits", () => {
  it("names the units and divisions in the vocabulary's spelling, with a sixteenth by default", () => {
    expect([...RULER_UNITS]).toEqual(["centimeters", "inches"]);
    expect(INCH_DIVISIONS).toEqual({ half: 2, quarter: 4, eighth: 8, sixteenth: 16 });
    expect(DEFAULT_INCH_DIVISION).toBe("sixteenth");
  });

  it("states the provisional maximum lengths: 30 cm and 12 in (NLC OQ-009)", () => {
    expect(RULER_MAX_LENGTH).toEqual({ centimeters: 30, inches: 12 });
    expect(isRulerLength("centimeters", 30)).toBe(true);
    expect(isRulerLength("centimeters", 31)).toBe(false);
    expect(isRulerLength("inches", 12)).toBe(true);
    expect(isRulerLength("inches", 13)).toBe(false);
    expect(isRulerLength("toString", 1)).toBe(false);
  });

  it("gives 10 marks per centimetre, the division's count per inch, and nothing for a ruler that cannot be", () => {
    expect(marksPerUnit("centimeters")).toBe(10);
    expect(marksPerUnit("inches")).toBe(16);
    expect(marksPerUnit("inches", "quarter")).toBe(4);
    expect(marksPerUnit("centimeters", "half")).toBeUndefined();
    expect(marksPerUnit("inches", "third")).toBeUndefined();
    expect(marksPerUnit("inches", "toString")).toBeUndefined();
    expect(marksPerUnit("inches", 8)).toBeUndefined();
    expect(marksPerUnit("cm")).toBeUndefined();
    // Only an absent division takes the default: null is not a division (code review CR-001).
    expect(marksPerUnit("inches", null)).toBeUndefined();
    expect(marksPerUnit("centimeters", null)).toBeUndefined();
  });
});

describe("a ruler's marks (NLC-REQ-044, NLC-REQ-047)", () => {
  it("has a mark at every millimetre of a centimetre ruler, ends included: 10L + 1", () => {
    const { marks } = scale("centimeters", 3);
    expect(marks).toHaveLength(31);
    expect(marks.map((mark) => mark.value).slice(0, 12)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1]);
    // Each value is k / 10, so the seventh millimetre is exactly the number written 0.7.
    expect(marks[7]!.value).toBe(0.7);
    expect(marks[23]!.value).toBe(2.3);
    expect(marks.at(-1)!.value).toBe(3);
  });

  it("has a mark at every multiple of an inch ruler's smallest division: dL + 1", () => {
    expect(scale("inches", 6).marks).toHaveLength(97);
    expect(scale("inches", 6, "quarter").marks).toHaveLength(25);
    expect(scale("inches", 2, "half").marks.map((mark) => mark.value)).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(scale("inches", 1).marks[1]!.value).toBe(0.0625);
  });

  it("lists the two largest rulers: 301 marks for 30 cm, 193 for 12 in at sixteenths", () => {
    expect(scale("centimeters", 30).marks).toHaveLength(301);
    expect(scale("inches", 12).marks).toHaveLength(193);
  });

  it.each([
    ["centimeters", 0, undefined],
    ["centimeters", -3, undefined],
    ["centimeters", 4.5, undefined],
    ["centimeters", 31, undefined],
    ["inches", 13, undefined],
    ["inches", Number.NaN, undefined],
    ["inches", "6", undefined],
    ["feet", 3, undefined],
    ["centimeters", 5, "half"],
    ["inches", 5, "third"],
    ["inches", 6, null],
    ["centimeters", 6, null],
  ])("is no ruler, and throws nothing, for one no description gives: %s, %s, %s", (unit, length, division) => {
    expect(rulerScale(unit, length, division)).toBeUndefined();
  });

  it("lists every ruler a description can give, each mark index / marksPerUnit, with whole units ranked 0 (quality review QR-003)", () => {
    expect(EVERY_RULER).toHaveLength(78);
    for (const [unit, division, length] of EVERY_RULER) {
      const ruler = rulerScale(unit, length, division);
      expect(ruler, `${length} ${unit} at ${String(division)}`).toBeDefined();
      expect(ruler!.marksPerUnit).toBe(marksPerUnit(unit, division));
      expect(ruler!.marks).toHaveLength(length * ruler!.marksPerUnit + 1);
      for (const [i, mark] of ruler!.marks.entries()) {
        expect(mark.index).toBe(i);
        expect(mark.value).toBe(i / ruler!.marksPerUnit);
        expect(mark.rank === 0).toBe(Number.isInteger(mark.value));
      }
    }
  });

  it("is frozen, marks included", () => {
    const ruler = scale("centimeters", 2);
    expect(Object.isFrozen(ruler)).toBe(true);
    expect(Object.isFrozen(ruler.marks)).toBe(true);
    expect(Object.isFrozen(ruler.marks[0])).toBe(true);
  });
});

describe("mark ranks (NLC-REQ-045, NLC-REQ-048)", () => {
  it("ranks 0 to 1 cm as whole, millimetres, half, millimetres, whole", () => {
    expect(ranksOf("centimeters", 1)).toEqual([0, 2, 2, 2, 2, 1, 2, 2, 2, 2, 0]);
  });

  it("ranks 0 to 1 in at sixteenths by how many times the inch is halved", () => {
    expect(ranksOf("inches", 1)).toEqual([0, 4, 3, 4, 2, 4, 3, 4, 1, 4, 3, 4, 2, 4, 3, 4, 0]);
  });

  it.each([
    ["eighth", [0, 3, 2, 3, 1, 3, 2, 3, 0]],
    ["quarter", [0, 2, 1, 2, 0]],
    ["half", [0, 1, 0]],
  ])("ranks 0 to 1 in at %ss with the same rank for the same fraction", (division, ranks) => {
    expect(ranksOf("inches", 1, division)).toEqual(ranks);
  });

  it("repeats each unit's ranks in every unit of every ruler", () => {
    for (const [unit, division, length] of EVERY_RULER) {
      const { marks, marksPerUnit: perUnit } = scale(unit, length, division);
      const first = marks.slice(0, perUnit + 1).map((mark) => mark.rank);
      for (let u = 0; u < length; u++) expect(marks.slice(u * perUnit, (u + 1) * perUnit + 1).map((mark) => mark.rank)).toEqual(first);
    }
  });
});

describe("where a value lies on a ruler (NLC-REQ-052, NLC-REQ-053)", () => {
  it.each([
    [0.7, "centimeters", undefined, 7],
    [2.3, "centimeters", undefined, 23],
    [3.4, "centimeters", undefined, 34],
    [0, "centimeters", undefined, 0],
    [30, "centimeters", undefined, 300],
    [2.0625, "inches", undefined, 33],
    [1.375, "inches", "eighth", 11],
    [11.5, "inches", "half", 23],
  ])("puts %d on its mark on a %s ruler at %s: index %d", (value, unit, division, index) => {
    expect(scale(unit, RULER_MAX_LENGTH[unit as RulerUnit], division).locate(value)).toEqual({ kind: "mark", index, value });
  });

  it("puts a value a caller's code computed with decimal noise on its mark, at the ends too (DEL-003, code review CR-003)", () => {
    const ruler = scale("centimeters", 30);
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(ruler.locate(0.1 + 0.2)).toEqual({ kind: "mark", index: 3, value: 0.3 });
    expect(ruler.locate(1.1 + 2.2)).toEqual({ kind: "mark", index: 33, value: 3.3 });
    expect(0.3 - 0.1 - 0.2).toBeLessThan(0);
    const zero = ruler.locate(0.3 - 0.1 - 0.2);
    expect(zero).toEqual({ kind: "mark", index: 0, value: 0 });
    expect(zero.kind === "mark" && Object.is(zero.value, 0) && Object.is(zero.index, 0)).toBe(true);
    expect(0.1 * 3 * 100).toBeGreaterThan(30);
    expect(ruler.locate(0.1 * 3 * 100)).toEqual({ kind: "mark", index: 300, value: 30 });
  });

  it("orders two ends by their marks, so 0.3 and 0.1 + 0.2 are the same mark (quality review QR-001)", () => {
    const ruler = scale("centimeters", 30);
    const index = (value: number) => {
      const location = ruler.locate(value);
      return location.kind === "mark" ? location.index : Number.NaN;
    };
    expect(index(0.3)).toBe(index(0.1 + 0.2));
    expect(index(2.3)).toBeLessThan(index(2.4));
  });

  it("pins the allowance: a ten-millionth of a centimetre off is between marks, a trillionth is on (quality review QR-002)", () => {
    const ruler = scale("centimeters", 30);
    expect(ruler.locate(0.7 + 1e-12)).toMatchObject({ kind: "mark", index: 7 });
    expect(ruler.locate(0.7 + 1e-7)).toEqual({ kind: "between", below: 0.7, above: 0.8 });
    expect(ruler.locate(0.7 - 1e-7)).toEqual({ kind: "between", below: 0.6, above: 0.7 });
    expect(ruler.locate(30 + 1e-12)).toMatchObject({ kind: "mark", index: 300 });
    expect(ruler.locate(30 + 1e-7)).toEqual({ kind: "off" });
    expect(ruler.locate(-1e-12)).toMatchObject({ kind: "mark", index: 0 });
    expect(ruler.locate(-1e-7)).toEqual({ kind: "off" });
  });

  it("names the marks on either side of a value between them, all on the ruler", () => {
    expect(scale("centimeters", 30).locate(3.25)).toEqual({ kind: "between", below: 3.2, above: 3.3 });
    expect(scale("inches", 6, "eighth").locate(1.3)).toEqual({ kind: "between", below: 1.25, above: 1.375 });
    expect(scale("inches", 6, "eighth").locate(2.0625)).toEqual({ kind: "between", below: 2, above: 2.125 });
    expect(scale("centimeters", 30).locate(0.05)).toEqual({ kind: "between", below: 0, above: 0.1 });
  });

  it.each([-0.05, 30.05, -1, 31, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("puts %d off a 30 cm ruler", (value) => {
    expect(scale("centimeters", 30).locate(value)).toEqual({ kind: "off" });
  });

  it("puts anything but a number off the ruler, never converting it or running its code (security review SEC-001)", () => {
    const ruler = scale("centimeters", 30);
    let called = false;
    const sneaky = {
      valueOf() {
        called = true;
        return 3;
      },
    };
    for (const value of [null, "", [], false, true, "2.3", sneaky, 1n, Symbol("x"), undefined, [3]]) {
      expect(ruler.locate(value), String(typeof value)).toEqual({ kind: "off" });
    }
    expect(called).toBe(false);
  });

  it("puts every mark, written with noise far below the allowance, on that mark, and every index past the ends off the ruler", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10, max: 310 }), fc.double({ min: -1e-11, max: 1e-11, noNaN: true }), (k, noise) => {
        const location = scale("centimeters", 30).locate(k / 10 + noise);
        if (k >= 0 && k <= 300) expect(location).toEqual({ kind: "mark", index: k, value: k / 10 });
        else expect(location).toEqual({ kind: "off" });
      }),
    );
  });

  it("puts every value at least a millionth of a mark from the nearest mark between exactly the two around it", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 191 }), fc.double({ min: 1e-6, max: 1 - 1e-6, noNaN: true }), (k, offset) => {
        expect(scale("inches", 12).locate((k + offset) / 16)).toEqual({ kind: "between", below: k / 16, above: (k + 1) / 16 });
      }),
    );
  });
});
