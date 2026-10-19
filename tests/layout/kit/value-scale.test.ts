import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  MAX_VALUE_TICKS,
  VALUE_LIMIT,
  checkTickInterval,
  checkValueScale,
  intervalsIn,
  resolveValueScale,
} from "../../../src/core/value-scale";
import { defaultStyle } from "../../../src/core/style";
import type { SceneNode } from "../../../src/layout/scene";
import { textWidth } from "../../../src/layout/kit/text";
import {
  AXIS_LABEL_MAX_LINES,
  axisLabelDepth,
  axisLabelLines,
  categorySlots,
  drawBottomAxisLabel,
  drawLeftAxisLabel,
  defaultValueScale,
  drawCategoryNames,
  drawValueAxis,
  tickLabel,
  valueAxisExtent,
  valuePosition,
  valueTicks,
} from "../../../src/layout/kit/value-scale";

const BOX = { x: 60, y: 40, width: 300, height: 200 };
const textsOf = (nodes: readonly SceneNode[]) => nodes.flatMap((node) => (node.kind === "text" ? [node.text] : []));
const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];

/** Every number in the nodes' attributes, which must all have passed through `fmt()`. */
function numbersOf(nodes: readonly SceneNode[]): number[] {
  return nodes.flatMap((node) => node.attrs.flatMap(([, value]) => (typeof value === "number" ? [value] : [])));
}

const value = fc.double({ min: -VALUE_LIMIT, max: VALUE_LIMIT, noNaN: true, noDefaultInfinity: true });

describe("defaultValueScale (DGP-REQ-006)", () => {
  it.each([
    [[3, 5, 2], false, { minimum: 0, maximum: 5, tickInterval: 0.5 }],
    [[37, 12], false, { minimum: 0, maximum: 40, tickInterval: 5 }],
    [[100], false, { minimum: 0, maximum: 100, tickInterval: 10 }],
    [[0.3, 0.07], false, { minimum: 0, maximum: 0.3, tickInterval: 0.05 }],
    [[1250], false, { minimum: 0, maximum: 1400, tickInterval: 200 }],
    [[-3, 5], true, { minimum: -3, maximum: 5, tickInterval: 1 }],
    [[-12, 4], true, { minimum: -12, maximum: 4, tickInterval: 2 }],
    [[3, 5], true, { minimum: 0, maximum: 5, tickInterval: 0.5 }],
  ])("chooses a scale for %j (negative allowed: %s)", (values, allowNegative, expected) => {
    expect(defaultValueScale(values, { allowNegative })).toEqual({ ...expected, tickBase: 0 });
  });

  it("uses 0 to 1 for all-zero data", () => {
    expect(defaultValueScale([0, 0, 0], { allowNegative: false })).toMatchObject({ minimum: 0, maximum: 1 });
    expect(defaultValueScale([0], { allowNegative: true })).toMatchObject({ minimum: 0, maximum: 1 });
    expect(defaultValueScale([], { allowNegative: false })).toMatchObject({ minimum: 0, maximum: 1 });
  });

  it("starts at zero unless negative values are allowed and present (DGP TICKET-001 Known Hazards)", () => {
    expect(defaultValueScale([-3, 5], { allowNegative: false }).minimum).toBe(0);
  });

  it("never lets the interval underflow to zero for vanishingly small values", () => {
    expect(defaultValueScale([5e-324], { allowNegative: false })).toEqual({ minimum: 0, maximum: 1e-9, tickInterval: 1e-9, tickBase: 0 });
    expect(defaultValueScale([-5e-324], { allowNegative: true })).toEqual({ minimum: -1e-9, maximum: 0, tickInterval: 1e-9, tickBase: 0 });
  });

  it("starts at zero, includes every value, and gives a drawable number of ticks, for any data", () => {
    fc.assert(
      fc.property(fc.array(value, { maxLength: 100 }), fc.boolean(), (values, allowNegative) => {
        const scale = defaultValueScale(values, { allowNegative });
        const hasNegative = values.some((v) => v < 0);
        if (!(allowNegative && hasNegative)) expect(scale.minimum).toBe(0);
        expect(scale.minimum).toBeLessThanOrEqual(0);
        if (allowNegative) for (const v of values) expect(scale.minimum).toBeLessThanOrEqual(v);
        for (const v of values) expect(scale.maximum).toBeGreaterThanOrEqual(v);
        expect(scale.maximum).toBeGreaterThan(scale.minimum);
        const ticks = valueTicks(scale);
        expect(ticks[0]).toBe(scale.minimum);
        expect(ticks.length).toBeLessThanOrEqual(12);
        expect(ticks.at(-1)).toBe(scale.maximum);
      }),
      { numRuns: 500 },
    );
  });
});

describe("resolveValueScale (DGP-REQ-005)", () => {
  it("fills only the parts left out", () => {
    const resolve = (given: Parameters<typeof resolveValueScale>[0], values: number[], allowNegative = false) =>
      resolveValueScale(given, values, { allowNegative });
    // A given interval counts its ticks from the minimum.
    expect(resolve({ tickInterval: 2 }, [7])).toEqual({ minimum: 0, maximum: 8, tickInterval: 2, tickBase: 0 });
    expect(resolve({ tickInterval: 2 }, [0])).toEqual({ minimum: 0, maximum: 2, tickInterval: 2, tickBase: 0 });
    expect(resolve({ tickInterval: 4 }, [-7, 3], true)).toEqual({ minimum: -8, maximum: 4, tickInterval: 4, tickBase: -8 });
    expect(resolve({ minimum: 1, tickInterval: 3 }, [8])).toEqual({ minimum: 1, maximum: 10, tickInterval: 3, tickBase: 1 });
    // A chosen interval is chosen first, and a chosen end is a multiple of it.
    expect(resolve({ maximum: 50 }, [7])).toEqual({ minimum: 0, maximum: 50, tickInterval: 5, tickBase: 0 });
    expect(resolve({ minimum: 10 }, [15, 37])).toEqual({ minimum: 10, maximum: 40, tickInterval: 5, tickBase: 0 });
  });
});

describe("a partly given scale ends on a labeled tick, never crowded (quality review QR-002)", () => {
  const ticksFor = (given: Parameters<typeof resolveValueScale>[0], values: number[], allowNegative = false) =>
    valueTicks(resolveValueScale(given, values, { allowNegative }));

  it.each([
    [{ maximum: 97 }, [7], false, [0, 10, 20, 30, 40, 50, 60, 70, 80, 97]],
    [{ maximum: 15 }, [7], false, [0, 2, 4, 6, 8, 10, 12, 15]],
    [{ maximum: 17 }, [7], false, [0, 2, 4, 6, 8, 10, 12, 14, 17]],
    [{ maximum: 15 }, [-3, 5], true, [-4, -2, 0, 2, 4, 6, 8, 10, 12, 15]],
    [{ minimum: 3 }, [10], false, [3, 4, 5, 6, 7, 8, 9, 10]],
    // A chosen maximum is a multiple of the chosen interval (40), not a count of intervals from a given minimum (38).
    [{ minimum: 3 }, [37], false, [3, 10, 15, 20, 25, 30, 35, 40]],
    [{ minimum: 0, maximum: 1 / 3 }, [0.1], false, [0, 0.05, 0.1, 0.15, 0.2, 0.25, 1 / 3]],
  ])("%j over %j (negative allowed: %s)", (given, values, allowNegative, expected) => {
    expect(ticksFor(given, values, allowNegative)).toEqual(expected);
  });

  it("for every scale the checks accept: ends on both ends, ticks at least one interval apart, few ticks when the interval is chosen", () => {
    const end = fc.option(fc.integer({ min: -1000, max: 1000 }).map((n) => n / 10), { nil: undefined });
    const interval = fc.option(fc.constantFrom(0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 25), { nil: undefined });
    fc.assert(
      fc.property(
        fc.array(value.map((v) => Math.round(v) / 1e7), { maxLength: 20 }),
        end,
        end,
        interval,
        fc.boolean(),
        (values, minimum, maximum, tickInterval, allowNegative) => {
          const given = { minimum, maximum, tickInterval };
          const scaled = values.map((v, i) => ({ path: `/values/${i}`, term: `values[${i}]`, value: v }));
          if (minimum !== undefined && maximum !== undefined && !(minimum < maximum)) return; // stage 2 rejects it
          if (checkTickInterval(given).length + checkValueScale(scaled, given, { allowNegative }).length > 0) return;
          const scale = resolveValueScale(given, values, { allowNegative });
          const ticks = valueTicks(scale);
          expect(ticks[0]).toBe(scale.minimum);
          expect(ticks.at(-1)).toBe(scale.maximum);
          for (let i = 1; i < ticks.length; i++) expect(ticks[i]! - ticks[i - 1]!).toBeGreaterThanOrEqual(scale.tickInterval * (1 - 1e-9));
          if (tickInterval === undefined) expect(ticks.length).toBeLessThanOrEqual(12);
          else expect(ticks.length).toBeLessThanOrEqual(MAX_VALUE_TICKS);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("never resolves a vanishingly small given maximum to an interval of 0 (quality review QR-004)", () => {
    // The checks now reject it (security review SEC-003); drawing it anyway still does not fail.
    expect(checkValueScale([{ path: "/values/0", term: "values[0]", value: 0 }], { maximum: 5e-324 }, { allowNegative: false })).toMatchObject([
      { code: "out_of_range", path: "/valueScale/maximum" },
    ]);
    expect(ticksFor({ maximum: 5e-324 }, [0])).toEqual([0, 5e-324]);
  });
});

describe("scales too fine to draw (security review SEC-001, SEC-003)", () => {
  const values = (...list: number[]) => list.map((value, i) => ({ path: `/values/${i}`, term: `values[${i}]`, value }));

  it("refuses, never loops over, grid indices a double cannot count", () => {
    // The ticks of 999999999.9999999 .. 1e9 by 2e-8 are numbered near 5e16, past 2^53, where k++ stops.
    const scale = resolveValueScale({ minimum: 999999999.9999999 }, [1e9], { allowNegative: true });
    expect(() => valueTicks(scale)).toThrow(RangeError);
    expect(checkValueScale(values(1e9), { minimum: 999999999.9999999 }, { allowNegative: true })).toMatchObject([
      { code: "out_of_range", path: "/valueScale/minimum", range: { max: 999999999 } },
    ]);
  });

  it("reports a span narrower than a billionth of its ends at the given end", () => {
    expect(checkValueScale(values(5), { minimum: -1e9, maximum: -999999999.5 }, { allowNegative: true })).toMatchObject([
      { code: "out_of_range", path: "/valueScale/maximum" },
    ]);
    expect(checkValueScale(values(1e9 - 1), { minimum: 999999998, maximum: 1e9 }, { allowNegative: false })).toEqual([]);
  });

  it.each([
    ["maximum", 5e-324, { min: 1e-9 }],
    ["minimum", -5e-324, { max: -1e-9 }],
    ["minimum", 1e-12, { min: 1e-9 }],
  ] as const)("reports a %s of %s, too small to print", (part, end, range) => {
    expect(checkValueScale(values(0), { [part]: end }, { allowNegative: true })).toMatchObject([
      { code: "out_of_range", path: `/valueScale/${part}`, range },
    ]);
  });

  it("reports a tick interval too small to print, once it gives few enough ticks", () => {
    // Found by the property test below: over -5e-324 this interval drew a 36-character label.
    expect(checkValueScale(values(-5e-324), { tickInterval: 9.278598811535001e-10 }, { allowNegative: true })).toMatchObject([
      { code: "out_of_range", path: "/valueScale/tickInterval", range: { min: 1e-9 } },
    ]);
  });

  it("takes a leftover far below the interval as exactly 0", () => {
    // -0.3 + 3 × 0.1 is 5.6e-17 in binary arithmetic, which would print as a 29-character label.
    const ticks = valueTicks({ minimum: -0.3, maximum: 0.3, tickInterval: 0.1, tickBase: -0.3 });
    expect(ticks).toEqual([-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]);
  });

  it("draws every scale the checks accept in bounded work, even at the edge of the value range", () => {
    const near = fc.oneof(
      fc.double({ min: 1e9 - 1, max: 1e9, noNaN: true }),
      fc.double({ min: -1e9, max: -1e9 + 1, noNaN: true }),
      fc.double({ min: -1e-6, max: 1e-6, noNaN: true }),
    );
    const part = fc.option(near, { nil: undefined });
    const interval = fc.option(fc.oneof(fc.double({ min: 1e-12, max: 1, noNaN: true }), fc.constantFrom(5e-324, 1e-9, 0.5, 2e9)), {
      nil: undefined,
    });
    fc.assert(
      fc.property(fc.array(near, { maxLength: 5 }), part, part, interval, fc.boolean(), (data, minimum, maximum, tickInterval, allowNegative) => {
        const given = { minimum, maximum, tickInterval };
        if (minimum !== undefined && maximum !== undefined && !(minimum < maximum)) return;
        if (checkTickInterval(given).length + checkValueScale(values(...data), given, { allowNegative }).length > 0) return;
        const ticks = valueTicks(resolveValueScale(given, data, { allowNegative }));
        expect(ticks.length).toBeLessThanOrEqual(MAX_VALUE_TICKS + 2);
        for (const tick of ticks) expect(tickLabel(tick).length).toBeLessThanOrEqual(30);
      }),
      { numRuns: 2000 },
    );
  });
});

describe("valueTicks", () => {
  it("lists both ends and every interval between, without decimal noise", () => {
    expect(valueTicks({ minimum: 0, maximum: 1, tickInterval: 0.1, tickBase: 0 })).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(valueTicks({ minimum: -6, maximum: 6, tickInterval: 3, tickBase: -6 })).toEqual([-6, -3, 0, 3, 6]);
    expect(valueTicks({ minimum: 0.1, maximum: 0.7, tickInterval: 0.2, tickBase: 0.1 })).toEqual([0.1, 0.3, 0.5, 0.7]);
  });

  it("drops a grid tick less than one interval from an end, which takes its place", () => {
    expect(valueTicks({ minimum: 0, maximum: 7, tickInterval: 2, tickBase: 0 })).toEqual([0, 2, 4, 7]);
    expect(valueTicks({ minimum: 1, maximum: 10, tickInterval: 2, tickBase: 0 })).toEqual([1, 4, 6, 8, 10]);
  });

  it(`throws rather than list more than ${MAX_VALUE_TICKS} ticks, or ticks for a bad scale`, () => {
    expect(valueTicks({ minimum: 0, maximum: 99, tickInterval: 1, tickBase: 0 })).toHaveLength(MAX_VALUE_TICKS);
    expect(() => valueTicks({ minimum: 0, maximum: 100, tickInterval: 1, tickBase: 0 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 1e9, tickInterval: 1e-300, tickBase: 0 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 10, tickInterval: 0, tickBase: 0 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 10, tickInterval: -1, tickBase: 0 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 10, maximum: 10, tickInterval: 1, tickBase: 0 })).toThrow(RangeError);
  });

  it("counts intervals as the validator does, at the tick limit (quality review QR-003)", () => {
    const valid = (given: { maximum: number; tickInterval: number }) =>
      checkValueScale([{ path: "/values/0", term: "values[0]", value: 0.5 }], given, { allowNegative: false });
    // 0.7 / 0.007 is 99.99999999999999 in binary: 100 intervals, 101 ticks, both sides agree.
    expect(valid({ maximum: 0.7, tickInterval: 0.007 }).map((issue) => issue.code)).toEqual(["too_many_ticks"]);
    expect(intervalsIn(0.7, 0.007)).toEqual({ count: 100, exact: true });
    // 0.693 / 0.007 is 99 intervals: accepted, and drawn with exactly 100 ticks.
    expect(valid({ maximum: 0.693, tickInterval: 0.007 })).toEqual([]);
    expect(valueTicks(resolveValueScale({ maximum: 0.693, tickInterval: 0.007 }, [0.5], { allowNegative: false }))).toHaveLength(100);
  });
});

describe("drawValueAxis (DGP-REQ-009, AD-007)", () => {
  const scale = { minimum: 0, maximum: 50, tickInterval: 10, tickBase: 0 };
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const tickLength = defaultStyle.tickLength;

  it.each(["vertical", "horizontal"] as const)("labels every tick with its value (%s)", (orientation) => {
    const nodes = drawValueAxis(scale, orientation, BOX);
    expect(textsOf(nodes)).toEqual(["0", "10", "20", "30", "40", "50"]);
    // One axis line, then a tick line and a label per tick.
    expect(nodes.filter((node) => node.kind === "line")).toHaveLength(1 + 6);
  });

  it("runs a vertical axis up the left edge and a horizontal one along the bottom", () => {
    const up = drawValueAxis(scale, "vertical", BOX);
    expect([attr(up[0]!, "x1"), attr(up[0]!, "y1"), attr(up[0]!, "x2"), attr(up[0]!, "y2")]).toEqual([60, 40, 60, 240]);
    const across = drawValueAxis(scale, "horizontal", BOX);
    expect([attr(across[0]!, "x1"), attr(across[0]!, "y1"), attr(across[0]!, "x2"), attr(across[0]!, "y2")]).toEqual([60, 240, 360, 240]);
  });

  it("draws each vertical tick out to the left at its value, its label right-aligned beside it (quality review QR-001)", () => {
    const nodes = drawValueAxis(scale, "vertical", BOX);
    const ticks = nodes.slice(1).filter((node) => node.kind === "line");
    const labels = nodes.filter((node) => node.kind === "text");
    // Ticks 0, 10, … 50 sit at y = 240, 200, … 40.
    ticks.forEach((tick, i) => {
      const y = 240 - i * 40;
      expect([attr(tick, "x1"), attr(tick, "y1"), attr(tick, "x2"), attr(tick, "y2")]).toEqual([60 - tickLength, y, 60, y]);
      expect([attr(labels[i]!, "x"), attr(labels[i]!, "y"), attr(labels[i]!, "text-anchor")]).toEqual([
        60 - tickLength - 4,
        Math.round((y + fontSize * 0.35) * 100) / 100,
        "end",
      ]);
    });
  });

  it("draws each horizontal tick down at its value, its label centered below it (quality review QR-001)", () => {
    const nodes = drawValueAxis(scale, "horizontal", BOX);
    const ticks = nodes.slice(1).filter((node) => node.kind === "line");
    const labels = nodes.filter((node) => node.kind === "text");
    ticks.forEach((tick, i) => {
      const x = 60 + i * 60;
      expect([attr(tick, "x1"), attr(tick, "y1"), attr(tick, "x2"), attr(tick, "y2")]).toEqual([x, 240, x, 240 + tickLength]);
      expect([attr(labels[i]!, "x"), attr(labels[i]!, "y"), attr(labels[i]!, "text-anchor")]).toEqual([
        x,
        Math.round((240 + tickLength + 4 + fontSize * 0.8) * 100) / 100,
        "middle",
      ]);
    });
  });

  it("places the minimum and maximum ticks at the ends of the box, exactly in proportion between", () => {
    const at = valuePosition(scale, "vertical", BOX);
    expect([at(0), at(25), at(50)]).toEqual([240, 140, 40]);
    const across = valuePosition(scale, "horizontal", BOX);
    expect([across(0), across(10), across(50)]).toEqual([60, 120, 360]);
  });

  it("writes every number through fmt(): at most two decimals", () => {
    fc.assert(
      fc.property(fc.array(value, { minLength: 1, maxLength: 20 }), fc.constantFrom("vertical", "horizontal"), (values, orientation) => {
        const box = { x: 33.333, y: 17.777, width: 301.111, height: 199.999 };
        const nodes = drawValueAxis(defaultValueScale(values, { allowNegative: true }), orientation as "vertical" | "horizontal", box);
        for (const n of numbersOf(nodes)) expect(Math.round(n * 100) / 100).toBe(n);
      }),
      { numRuns: 200 },
    );
  });

  it("shows tick values as plain numbers, never in exponent form", () => {
    expect(tickLabel(0.0000001)).toBe("0.0000001");
    expect(tickLabel(1e9)).toBe("1000000000");
    expect(tickLabel(-2.5)).toBe("-2.5");
  });

  it("says how far the ticks and labels reach outside the box", () => {
    expect(valueAxisExtent(scale, "vertical")).toBeCloseTo(tickLength + 4 + textWidth("50", fontSize));
    expect(valueAxisExtent(scale, "horizontal")).toBeCloseTo(tickLength + 4 + fontSize * 1.2);
  });
});

describe("categorySlots (DGP-REQ-001, DGP-REQ-003)", () => {
  const names = (...list: string[]) => list.map((name) => ({ name }));

  it("lays the categories out in description order, in equal slots across the box", () => {
    const slots = categorySlots(names("Wed", "Mon", "Tue"), BOX, "vertical");
    expect(slots.map((slot) => slot.name)).toEqual(["Wed", "Mon", "Tue"]);
    expect(slots.map((slot) => [slot.start, slot.center, slot.end])).toEqual([
      [60, 110, 160],
      [160, 210, 260],
      [260, 310, 360],
    ]);
    const down = categorySlots(names("Wed", "Mon"), BOX, "horizontal");
    expect(down.map((slot) => [slot.start, slot.end])).toEqual([
      [40, 140],
      [140, 240],
    ]);
  });

  it("wraps a long name onto more lines, keeping every word (never truncated)", () => {
    const name = "Average number of hours of sleep each night";
    const [slot] = categorySlots(names(name, "B", "C", "D", "E"), BOX, "vertical");
    expect(slot!.lines.length).toBeGreaterThan(1);
    expect(slot!.lines.join(" ")).toBe(name);
    for (const line of slot!.lines) expect(textWidth(line, defaultStyle.fontSizes.tickLabel)).toBeLessThanOrEqual(slot!.labelWidth);
    expect(slot!.labelHeight).toBeCloseTo(slot!.lines.length * defaultStyle.fontSizes.tickLabel * 1.2);
  });

  it("splits a single word wider than the name column beside a horizontal plot without dropping any of it", () => {
    const word = "Pneumonoultramicroscopicsilicovolcanoconiosis";
    const [slot] = categorySlots(names(word), BOX, "horizontal", 60);
    expect(slot!.lines.length).toBeGreaterThan(1);
    expect(slot!.lines.join("")).toBe(word);
  });

  it("wraps names beside a horizontal plot to the name width", () => {
    const [slot] = categorySlots(names("A rather long category name"), BOX, "horizontal", 60);
    expect(slot!.labelWidth).toBe(60);
    expect(slot!.lines.join(" ")).toBe("A rather long category name");
  });

  describe("rotated names below a vertical plot (DGP TICKET-005 quality review QR-002)", () => {
    const PLOT = { x: 16, y: 40, width: 368, height: 200 };
    const lineHeight = defaultStyle.fontSizes.tickLabel * 1.2;
    const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    it("keeps names level while every word fits under its column", () => {
      const slots = categorySlots(names("Cats", "Dogs", "Fish"), PLOT, "vertical");
      expect(slots.map((slot) => [slot.rotated, slot.lines])).toEqual([
        [false, ["Cats"]],
        [false, ["Dogs"]],
        [false, ["Fish"]],
      ]);
    });

    it.each([
      ["five weekdays", week.slice(0, 5)],
      ["the week", week],
      ["the months", months],
      ["a long word", ["Pneumonoultramicroscopicsilicovolcanoconiosis", "B", "C", "D", "E", "F"]],
    ])("rotates every name when a word would not fit, never splitting a word: %s", (_, list) => {
      const slots = categorySlots(names(...list), PLOT, "vertical");
      for (const slot of slots) {
        expect(slot.rotated, slot.name).toBe(true);
        expect(slot.lines.join(" "), slot.name).toBe(slot.name);
        // Each line holds whole words only.
        for (const line of slot.lines) for (const word of line.split(" ")) expect(slot.name.split(" ")).toContain(word);
        // Read upward, a name reaches as far below the plot as its widest line.
        expect(slot.labelHeight).toBeCloseTo(Math.max(...slot.lines.map((line) => textWidth(line, defaultStyle.fontSizes.tickLabel))));
      }
    });

    it("wraps a long rotated name onto lines side by side that fit across its column", () => {
      const name = "Average number of hours of sleep each night, counted over one school week";
      const slots = categorySlots(names(name, ...week.slice(1)), PLOT, "vertical");
      const [slot] = slots;
      expect(slot!.rotated).toBe(true);
      expect(slot!.lines.length).toBeGreaterThan(1);
      expect(slot!.lines.join(" ")).toBe(name);
      expect(slot!.lines.length * lineHeight).toBeLessThanOrEqual(slot!.end - slot!.start);
    });

    it("keeps rotated names apart while one line fits a column, up to 25 categories", () => {
      for (const count of [8, 13, 20, 25]) {
        const list = Array.from({ length: count }, (_, i) => `${months[i % 12]} week ${i + 1}`);
        for (const slot of categorySlots(names(...list), PLOT, "vertical")) {
          expect(slot.rotated).toBe(true);
          expect(slot.lines.length * lineHeight, `${count}: ${slot.name}`).toBeLessThanOrEqual(slot.end - slot.start);
        }
      }
    });

    it("keeps a crowded name block inside the plot's span, moving the end ones inward (DGP TICKET-003 DEL-001)", () => {
      const many = Array.from({ length: 100 }, (_, i) => ({ name: `Category ${i}` }));
      const slots = categorySlots(many, PLOT, "vertical");
      const nodes = drawCategoryNames(slots, "vertical", PLOT);
      const xs = nodes.map((node) => Number(attr(node, "x")));
      const fontSize = defaultStyle.fontSizes.tickLabel;
      // A one-line block's glyphs run from 0.8 of the font size left of its x to 0.2 right.
      expect(Math.min(...xs) - 0.8 * fontSize).toBeGreaterThanOrEqual(PLOT.x - 0.01);
      expect(Math.max(...xs) + 0.2 * fontSize).toBeLessThanOrEqual(PLOT.x + PLOT.width + 0.01);
      // Uncrowded middle names stay centered on their slot.
      expect(xs[50]! - (lineHeight - fontSize) / 2 - fontSize * 0.8 + lineHeight / 2).toBeCloseTo(slots[50]!.center, 1);
    });

    it("rotates names of narrow words once a line no longer fits across a column, so none stacks a word per line (DGP TICKET-003 security review SEC-002)", () => {
      // 25 columns are 14.72 wide, room for a line (14.4); 26 are not.
      const narrow = (count: number) => Array.from({ length: count }, (_, i) => ({ name: Array.from({ length: 100 }, (_, j) => (j === i ? "\u0301" : "\u0300")).join(" ") }));
      expect(categorySlots(narrow(25), PLOT, "vertical").every((slot) => !slot.rotated)).toBe(true);
      for (const count of [26, 87, 100]) {
        const slots = categorySlots(narrow(count), PLOT, "vertical");
        expect(slots.every((slot) => slot.rotated && slot.lines.length === 1 && slot.lines[0] === slot.name), String(count)).toBe(true);
      }
    });

    it("still lays out 100 categories, one line each", () => {
      const many = Array.from({ length: 100 }, (_, i) => ({ name: `Category ${i}` }));
      const slots = categorySlots(many, PLOT, "vertical");
      expect(slots).toHaveLength(100);
      expect(slots.every((slot) => slot.rotated && slot.lines.length === 1)).toBe(true);
      expect(slots.map((slot) => slot.lines[0])).toEqual(many.map((c) => c.name));
    });

    it("draws each line reading upward, ending just below the plot, the lines centered across the column", () => {
      const slots = categorySlots(names("Wednesday afternoon club", ...week.slice(1)), PLOT, "vertical");
      const nodes = drawCategoryNames(slots, "vertical", PLOT);
      expect(textsOf(nodes)).toEqual(slots.flatMap((slot) => slot.lines));
      const first = slots[0]!;
      const top = PLOT.y + PLOT.height + 4;
      const left = first.center - (first.lines.length * lineHeight) / 2;
      const firstNodes = nodes.slice(0, first.lines.length);
      firstNodes.forEach((node, i) => {
        const x = Math.round((left + i * lineHeight + 1.2 + 9.6) * 100) / 100;
        expect([attr(node, "x"), attr(node, "y"), attr(node, "text-anchor"), attr(node, "transform")]).toEqual([x, top, "end", `rotate(-90 ${x} ${top})`]);
      });
    });
  });

  it("sizes each slot beside a horizontal plot from its own wrapped name, wrapping once (DGP TICKET-005 QR-006, SEC-002)", () => {
    const seen: number[] = [];
    const slots = categorySlots(names("A rather long category name", "B", "C"), { x: 100, y: 10, width: 200, height: 0 }, "horizontal", 60, (height) => {
      seen.push(height);
      return height + 4;
    });
    const [tall, short] = [slots[0]!.labelHeight, slots[1]!.labelHeight];
    expect(tall).toBeGreaterThan(short);
    expect(seen).toEqual([tall, short, short]);
    // One long name makes one tall slot; the others keep their own height.
    const expected = [
      [10, 10 + tall + 4],
      [10 + tall + 4, 10 + tall + short + 8],
      [10 + tall + short + 8, 10 + tall + 2 * short + 12],
    ];
    slots.forEach((slot, i) => {
      expect(slot.start).toBeCloseTo(expected[i]![0]!, 9);
      expect(slot.end).toBeCloseTo(expected[i]![1]!, 9);
    });
  });

  it("centers each name under its slot below a vertical plot (quality review QR-001)", () => {
    const slots = categorySlots(names("Wed", "Mon", "Tue"), BOX, "vertical");
    const nodes = drawCategoryNames(slots, "vertical", BOX);
    // First line's top is 4 below the plot; its baseline 1.2 + 9.6 further down (`textLines`).
    expect(nodes.map((node) => [attr(node, "x"), attr(node, "y"), attr(node, "text-anchor")])).toEqual([
      [110, 254.8, "middle"],
      [210, 254.8, "middle"],
      [310, 254.8, "middle"],
    ]);
  });

  it("centers each name in a column left of a horizontal plot, level with its slot (quality review QR-001)", () => {
    const slots = categorySlots(names("Wed", "Mon"), BOX, "horizontal");
    const nodes = drawCategoryNames(slots, "horizontal", BOX);
    // Column 96 wide ending 4 left of the plot: center x = 60 - 4 - 48. One line, 14.4 tall, centered on the slot.
    expect(nodes.map((node) => [attr(node, "x"), attr(node, "y"), attr(node, "text-anchor")])).toEqual([
      [8, 93.6, "middle"],
      [8, 193.6, "middle"],
    ]);
  });

  it("draws every line of every name, in order, through fmt()", () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const slots = categorySlots(names("Monday", "A very long name for a day of the week", "Wed"), BOX, orientation);
      const nodes = drawCategoryNames(slots, orientation, BOX);
      expect(textsOf(nodes)).toEqual(slots.flatMap((slot) => slot.lines));
      for (const n of numbersOf(nodes)) expect(Math.round(n * 100) / 100).toBe(n);
    }
  });
});

describe("fewer chosen intervals for a short axis (DGP TICKET-003 DEL-004)", () => {
  it("chooses an interval for at most the intervals asked, and uses a given one as given", () => {
    expect(resolveValueScale(undefined, [8000], { allowNegative: false })).toMatchObject({ maximum: 8000, tickInterval: 1000 });
    expect(resolveValueScale(undefined, [8000], { allowNegative: false, intervals: 3 })).toMatchObject({ maximum: 10000, tickInterval: 5000 });
    expect(resolveValueScale(undefined, [8000], { allowNegative: false, intervals: 1 })).toMatchObject({ maximum: 10000, tickInterval: 10000 });
    expect(resolveValueScale({ tickInterval: 500 }, [8000], { allowNegative: false, intervals: 2 })).toMatchObject({ tickInterval: 500 });
  });
});

describe("axis labels (DGP-REQ-002; DGP TICKET-002 quality review QR-003)", () => {
  const labelSize = defaultStyle.fontSizes.label;
  const lineHeight = labelSize * 1.2;

  it("wraps a label to the length it has, cleaned, and caps it at two lines ending in an ellipsis", () => {
    expect(axisLabelLines(undefined, 200)).toEqual([]);
    expect(axisLabelLines(" \u00a0 ", 200)).toEqual([]);
    expect(axisLabelLines("Day", 200)).toEqual(["Day"]);
    const long = axisLabelLines("word ".repeat(200), 200);
    expect(long).toHaveLength(AXIS_LABEL_MAX_LINES);
    expect(long.at(-1)!.endsWith("…")).toBe(true);
    for (const line of long) expect(textWidth(line, labelSize)).toBeLessThanOrEqual(200);
    expect(axisLabelDepth(long)).toBeCloseTo(2 * lineHeight);
    expect(axisLabelDepth([])).toBe(0);
  });

  it("reads the value-axis label upward, centered on the plot's height, its lines in order from the left", () => {
    const lines = ["Temperature in degrees", "Celsius"];
    const nodes = drawLeftAxisLabel(lines, 16, BOX);
    const centerY = BOX.y + BOX.height / 2;
    expect(textsOf(nodes)).toEqual(lines);
    nodes.forEach((node, i) => {
      const x = Math.round((16 + i * lineHeight + (lineHeight - labelSize) / 2 + labelSize * 0.8) * 100) / 100;
      expect([attr(node, "x"), attr(node, "y"), attr(node, "text-anchor"), attr(node, "transform")]).toEqual([x, centerY, "middle", `rotate(-90 ${x} ${centerY})`]);
    });
    // The first line is the leftmost: read upward, it is the top line of the label.
    expect(Number(attr(nodes[0]!, "x"))).toBeLessThan(Number(attr(nodes[1]!, "x")));
  });

  it("centers the category-axis label under the plot, from the top it is given", () => {
    const nodes = drawBottomAxisLabel(["Day of the week", "before school"], BOX, 300);
    expect(textsOf(nodes)).toEqual(["Day of the week", "before school"]);
    for (const node of nodes) expect([attr(node, "x"), attr(node, "text-anchor")]).toEqual([BOX.x + BOX.width / 2, "middle"]);
    expect(Number(attr(nodes[0]!, "y"))).toBeCloseTo(300 + (lineHeight - labelSize) / 2 + labelSize * 0.8, 2);
    expect(Number(attr(nodes[1]!, "y")) - Number(attr(nodes[0]!, "y"))).toBeCloseTo(lineHeight, 2);
  });
});

describe("value-scale.ts", () => {
  it("imports nothing from React (AD-001)", () => {
    const source = readFileSync(new URL("../../../src/layout/kit/value-scale.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["']react/);
  });
});
