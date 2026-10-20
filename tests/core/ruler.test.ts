import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_INCH_DIVISION,
  INCH_DIVISIONS,
  RULER_MAX_LENGTH,
  RULER_UNITS,
  divisionsPerUnit,
  isRulerMark,
  nearestRulerMarks,
  rulerMarks,
} from "../../src/core/ruler";

const ranksOf = (unit: string, length: number, division?: string) => rulerMarks(unit, length, division)!.map((mark) => mark.rank);

describe("the ruler's units, divisions and limits", () => {
  it("names the units and divisions in the vocabulary's spelling, with a sixteenth by default", () => {
    expect([...RULER_UNITS]).toEqual(["centimeters", "inches"]);
    expect(INCH_DIVISIONS).toEqual({ half: 2, quarter: 4, eighth: 8, sixteenth: 16 });
    expect(DEFAULT_INCH_DIVISION).toBe("sixteenth");
  });

  it("states the provisional maximum lengths: 30 cm and 12 in (NLC OQ-009)", () => {
    expect(RULER_MAX_LENGTH).toEqual({ centimeters: 30, inches: 12 });
  });

  it("gives 10 marks per centimetre, the division's count per inch, and nothing for a ruler that cannot be", () => {
    expect(divisionsPerUnit("centimeters")).toBe(10);
    expect(divisionsPerUnit("inches")).toBe(16);
    expect(divisionsPerUnit("inches", "quarter")).toBe(4);
    expect(divisionsPerUnit("centimeters", "half")).toBeUndefined();
    expect(divisionsPerUnit("inches", "third")).toBeUndefined();
    expect(divisionsPerUnit("inches", "toString")).toBeUndefined();
    expect(divisionsPerUnit("cm")).toBeUndefined();
  });
});

describe("a ruler's marks (NLC-REQ-044, NLC-REQ-047)", () => {
  it("has a mark at every millimetre of a centimetre ruler, ends included: 10L + 1", () => {
    const marks = rulerMarks("centimeters", 3)!;
    expect(marks).toHaveLength(31);
    expect(marks.map((mark) => mark.value).slice(0, 12)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1]);
    // Each value is k / 10, so the seventh millimetre is exactly the number written 0.7.
    expect(marks[7]!.value).toBe(0.7);
    expect(marks[23]!.value).toBe(2.3);
    expect(marks.at(-1)!.value).toBe(3);
  });

  it("has a mark at every multiple of an inch ruler's smallest division: dL + 1", () => {
    expect(rulerMarks("inches", 6)).toHaveLength(97);
    expect(rulerMarks("inches", 6, "quarter")).toHaveLength(25);
    expect(rulerMarks("inches", 2, "half")!.map((mark) => mark.value)).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(rulerMarks("inches", 1)![1]!.value).toBe(0.0625);
  });

  it("lists the two largest rulers: 301 marks for 30 cm, 193 for 12 in at sixteenths", () => {
    expect(rulerMarks("centimeters", 30)).toHaveLength(301);
    expect(rulerMarks("inches", 12)).toHaveLength(193);
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
  ])("lists nothing, and throws nothing, for a ruler no description gives: %s, %s, %s", (unit, length, division) => {
    expect(rulerMarks(unit, length, division)).toBeUndefined();
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

  it("ranks every whole unit 0, and only whole units, on every ruler", () => {
    fc.assert(
      fc.property(fc.constantFrom<[string, string | undefined]>(["centimeters", undefined], ["inches", "half"], ["inches", "quarter"], ["inches", "eighth"], ["inches", undefined]), fc.integer({ min: 1, max: 30 }), ([unit, division], length) => {
        const marks = rulerMarks(unit, length, division);
        fc.pre(marks !== undefined);
        const divisions = divisionsPerUnit(unit, division)!;
        expect(marks).toHaveLength(length * divisions + 1);
        for (const [i, mark] of marks!.entries()) {
          expect(mark.index).toBe(i);
          expect(mark.value).toBe(i / divisions);
          expect(mark.rank === 0).toBe(Number.isInteger(mark.value));
        }
      }),
    );
  });
});

describe("whether a value is a mark (NLC-REQ-053)", () => {
  it.each([
    [0.7, 10],
    [2.3, 10],
    [3.4, 10],
    [0, 10],
    [30, 10],
    [2.0625, 16],
    [1.375, 8],
    [11.5, 2],
  ])("counts %d as a mark at %d per unit, through decimal noise", (value, divisions) => {
    expect(isRulerMark(value, divisions)).toBe(true);
  });

  it("counts a mark a caller's code computed with decimal noise, such as 0.1 + 0.2 (DEL-003)", () => {
    // Written decimals from 0.0 to 30.0 times 10 are exact; computed ones are not.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(isRulerMark(0.1 + 0.2, 10)).toBe(true);
    expect(isRulerMark(1.1 + 2.2, 10)).toBe(true);
    expect(isRulerMark(0.7 * 3, 10)).toBe(true);
    expect(nearestRulerMarks(0.1 + 0.2, 10)).toEqual([0.3, 0.3]);
  });

  it.each([
    [3.25, 10],
    [1.3, 8],
    [2.0625, 8],
    [0.05, 10],
    [Number.NaN, 10],
    [Number.POSITIVE_INFINITY, 10],
  ])("does not count %d as a mark at %d per unit", (value, divisions) => {
    expect(isRulerMark(value, divisions)).toBe(false);
  });

  it("counts every listed mark as a mark, written as its decimal", () => {
    for (const mark of rulerMarks("centimeters", 30)!) expect(isRulerMark(Number(mark.value.toFixed(1)), 10)).toBe(true);
    for (const mark of rulerMarks("inches", 12)!) expect(isRulerMark(Number(mark.value.toFixed(4)), 16)).toBe(true);
  });

  it("names the marks on either side of a value between them, and the mark itself for one on it", () => {
    expect(nearestRulerMarks(3.25, 10)).toEqual([3.2, 3.3]);
    expect(nearestRulerMarks(1.3, 8)).toEqual([1.25, 1.375]);
    expect(nearestRulerMarks(0.7, 10)).toEqual([0.7, 0.7]);
  });
});
