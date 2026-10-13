import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_VALUE_TICKS, VALUE_LIMIT, checkValueScale, resolveValueScale } from "../../../src/core/definitions/categories";
import { defaultStyle } from "../../../src/core/style";
import type { SceneNode } from "../../../src/layout/scene";
import { textWidth } from "../../../src/layout/kit/text";
import {
  categorySlots,
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
    expect(defaultValueScale(values, { allowNegative })).toEqual(expected);
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
    expect(defaultValueScale([5e-324], { allowNegative: false })).toEqual({ minimum: 0, maximum: 1e-9, tickInterval: 1e-9 });
    expect(defaultValueScale([-5e-324], { allowNegative: true })).toEqual({ minimum: -1e-9, maximum: 0, tickInterval: 1e-9 });
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
    expect(resolveValueScale({ tickInterval: 2 }, [7], { allowNegative: false })).toEqual({ minimum: 0, maximum: 8, tickInterval: 2 });
    expect(resolveValueScale({ tickInterval: 2 }, [0], { allowNegative: false })).toEqual({ minimum: 0, maximum: 2, tickInterval: 2 });
    expect(resolveValueScale({ maximum: 50 }, [7], { allowNegative: false })).toEqual({ minimum: 0, maximum: 50, tickInterval: 5 });
    expect(resolveValueScale({ minimum: 10 }, [15, 37], { allowNegative: false })).toEqual({ minimum: 10, maximum: 40, tickInterval: 5 });
    expect(resolveValueScale({ tickInterval: 4 }, [-7, 3], { allowNegative: true })).toEqual({ minimum: -8, maximum: 4, tickInterval: 4 });
  });
});

describe("a partly given scale ends on a tick (code review CR-001)", () => {
  it.each([
    [{ maximum: 15 }, [7], { minimum: 0, maximum: 15, tickInterval: 5 }],
    [{ maximum: 17 }, [7], { minimum: 0, maximum: 17, tickInterval: 1 }],
    [{ maximum: 0.37 }, [0.1], { minimum: 0, maximum: 0.37, tickInterval: 0.01 }],
    [{ minimum: 3 }, [10], { minimum: 3, maximum: 10, tickInterval: 1 }],
    [{ minimum: 0, maximum: 7 }, [7], { minimum: 0, maximum: 7, tickInterval: 1 }],
    [{ minimum: 0, maximum: 1 / 3 }, [0.1], { minimum: 0, maximum: 1 / 3, tickInterval: 0.0333333333333 }],
  ])("%j over %j", (given, values, expected) => {
    expect(resolveValueScale(given, values, { allowNegative: false })).toEqual(expected);
  });

  it("for every partly given scale the checks accept, starts at the minimum and ends at the maximum", () => {
    const end = fc.option(fc.integer({ min: -1000, max: 1000 }).map((n) => n / 10), { nil: undefined });
    const interval = fc.option(fc.constantFrom(0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 25), { nil: undefined });
    fc.assert(
      fc.property(fc.array(value.map((v) => Math.round(v) / 1e7), { maxLength: 20 }), end, end, interval, fc.boolean(), (values, minimum, maximum, tickInterval, allowNegative) => {
        const given = { minimum, maximum, tickInterval };
        const scaled = values.map((v, i) => ({ path: `/values/${i}`, term: `values[${i}]`, value: v }));
        if (minimum !== undefined && maximum !== undefined && !(minimum < maximum)) return; // stage 2 rejects it
        if (checkValueScale(scaled, given, { allowNegative }).length > 0) return;
        const scale = resolveValueScale(given, values, { allowNegative });
        const ticks = valueTicks(scale);
        expect(ticks[0]).toBe(scale.minimum);
        expect(ticks.at(-1)).toBeCloseTo(scale.maximum, 9);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("valueTicks", () => {
  it("lists every tick from the minimum, without decimal noise", () => {
    expect(valueTicks({ minimum: 0, maximum: 1, tickInterval: 0.1 })).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(valueTicks({ minimum: -6, maximum: 6, tickInterval: 3 })).toEqual([-6, -3, 0, 3, 6]);
    expect(valueTicks({ minimum: 0.1, maximum: 0.7, tickInterval: 0.2 })).toEqual([0.1, 0.3, 0.5, 0.7]);
  });

  it("stops at the last tick inside a scale its interval does not divide (a defensive case: the checks reject such a scale)", () => {
    expect(valueTicks({ minimum: 0, maximum: 7, tickInterval: 2 })).toEqual([0, 2, 4, 6]);
  });

  it(`throws rather than list more than ${MAX_VALUE_TICKS} ticks, or ticks for a bad interval`, () => {
    expect(valueTicks({ minimum: 0, maximum: 99, tickInterval: 1 })).toHaveLength(MAX_VALUE_TICKS);
    expect(() => valueTicks({ minimum: 0, maximum: 100, tickInterval: 1 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 1e9, tickInterval: 1e-300 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 10, tickInterval: 0 })).toThrow(RangeError);
    expect(() => valueTicks({ minimum: 0, maximum: 10, tickInterval: -1 })).toThrow(RangeError);
  });
});

describe("drawValueAxis (DGP-REQ-009, AD-007)", () => {
  const scale = { minimum: 0, maximum: 50, tickInterval: 10 };

  it.each(["vertical", "horizontal"] as const)("labels every tick with its value (%s)", (orientation) => {
    const nodes = drawValueAxis(scale, orientation, BOX);
    expect(textsOf(nodes)).toEqual(["0", "10", "20", "30", "40", "50"]);
    // One axis line, then a tick line and a label per tick.
    expect(nodes.filter((node) => node.kind === "line")).toHaveLength(1 + 6);
  });

  it("runs a vertical axis up the left edge and a horizontal one along the bottom", () => {
    const up = drawValueAxis(scale, "vertical", BOX);
    expect([attr(up[0]!, "x1"), attr(up[0]!, "y1"), attr(up[0]!, "x2"), attr(up[0]!, "y2")]).toEqual([60, 40, 60, 240]);
    const ys = up.filter((node) => node.kind === "text").map((node) => attr(node, "y") as number);
    expect(ys).toEqual([...ys].sort((a, b) => b - a)); // larger values higher up

    const across = drawValueAxis(scale, "horizontal", BOX);
    expect([attr(across[0]!, "x1"), attr(across[0]!, "y1"), attr(across[0]!, "x2"), attr(across[0]!, "y2")]).toEqual([60, 240, 360, 240]);
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
    const fontSize = defaultStyle.fontSizes.tickLabel;
    expect(valueAxisExtent(scale, "vertical")).toBeCloseTo(defaultStyle.tickLength + 4 + textWidth("50", fontSize));
    expect(valueAxisExtent(scale, "horizontal")).toBeCloseTo(defaultStyle.tickLength + 4 + fontSize * 1.2);
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

  it("splits a single word wider than its slot without dropping any of it", () => {
    const word = "Pneumonoultramicroscopicsilicovolcanoconiosis";
    const [slot] = categorySlots(names(word, "B", "C", "D", "E", "F"), BOX, "vertical");
    expect(slot!.lines.length).toBeGreaterThan(1);
    expect(slot!.lines.join("")).toBe(word);
  });

  it("wraps names beside a horizontal plot to the name width", () => {
    const [slot] = categorySlots(names("A rather long category name"), BOX, "horizontal", 60);
    expect(slot!.labelWidth).toBe(60);
    expect(slot!.lines.join(" ")).toBe("A rather long category name");
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

describe("value-scale.ts", () => {
  it("imports nothing from React (AD-001)", () => {
    const source = readFileSync(new URL("../../../src/layout/kit/value-scale.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["']react/);
  });
});
