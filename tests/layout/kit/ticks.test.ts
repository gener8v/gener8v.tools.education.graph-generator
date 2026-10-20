import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AXIS_DEFAULT_INTERVALS, niceTicks, tickCount, tickLabel } from "../../../src/layout/kit/ticks";

/** Whether `x` is 1, 2 or 5 times a power of ten. */
const isNice = (x: number) => {
  const mantissa = Number((x / 10 ** Math.floor(Math.log10(x) + 1e-12)).toPrecision(12));
  return [1, 2, 5].includes(mantissa);
};

const end = fc.double({ min: -1e6, max: 1e6, noNaN: true });

describe("ticks at whole multiples of the spacing (NLC-REQ-004)", () => {
  it("returns every multiple inside the range, ends included, and nothing else", () => {
    expect(niceTicks(-3, 3, 1).ticks).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(niceTicks(-10, -2, 2).ticks).toEqual([-10, -8, -6, -4, -2]);
    // An end that is not a multiple gets no tick; the multiples are anchored at zero, not at min.
    expect(niceTicks(0.5, 7.25, 2).ticks).toEqual([2, 4, 6]);
    expect(niceTicks(-3.5, 7.25, 2.5).ticks).toEqual([-2.5, 0, 2.5, 5]);
    // A spacing wider than the range may leave no tick at all.
    expect(niceTicks(0.2, 0.8, 1).ticks).toEqual([]);
  });

  it("returns only multiples inside the range, one spacing apart, missing none at either end, for any range and spacing", () => {
    fc.assert(
      fc.property(end, end, fc.integer({ min: 1, max: 99 }), (a, b, steps) => {
        fc.pre(Math.abs(a - b) > 1e-3);
        const [min, max] = a < b ? [a, b] : [b, a];
        const spacing = Number(((max - min) / steps).toPrecision(3));
        fc.pre(spacing > 0 && tickCount(min, max, spacing) <= 100);
        const { ticks } = niceTicks(min, max, spacing);
        const tolerance = 1e-9 * Math.max(1, Math.abs(min), Math.abs(max));
        expect(ticks.length).toBe(tickCount(min, max, spacing));
        for (const [i, tick] of ticks.entries()) {
          // Inside the range, a whole multiple of the spacing, and one spacing past the previous tick.
          expect(tick).toBeGreaterThanOrEqual(min - tolerance);
          expect(tick).toBeLessThanOrEqual(max + tolerance);
          expect(Math.abs(tick / spacing - Math.round(tick / spacing))).toBeLessThan(1e-6);
          if (i > 0) expect(Math.abs(tick - ticks[i - 1]! - spacing)).toBeLessThan(tolerance);
        }
        // No multiple is left out at either end.
        expect(ticks[0] ?? Infinity).toBeLessThan(min + spacing + tolerance);
        expect(ticks.at(-1) ?? -Infinity).toBeGreaterThan(max - spacing - tolerance);
      }),
      { numRuns: 300 },
    );
  });

  it("always ticks zero when the range includes it", () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-3, max: 1e6, noNaN: true }), fc.double({ min: 0, max: 1e6, noNaN: true }), fc.boolean(), (low, high, given) => {
        const spacing = given ? Number((low / 3).toPrecision(2)) : undefined;
        fc.pre(spacing === undefined || (spacing > 0 && tickCount(-low, high, spacing) <= 100));
        expect(niceTicks(-low, high, spacing).ticks).toContain(0);
      }),
      { numRuns: 200 },
    );
    expect(niceTicks(-0.1, 0, 0.03).ticks.at(-1)).toBe(0);
    expect(Object.is(niceTicks(-1, 1, 0.5).ticks[2], 0)).toBe(true); // never -0
  });

  it("computes each tick as k × spacing, so 0.1-spaced ticks are exact decimals, not running sums", () => {
    expect(niceTicks(0, 1, 0.1).ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(niceTicks(-0.3, 0.3, 0.1).ticks).toEqual([-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]);
    // A running sum drifts: 0.1 + 0.1 + 0.1 is not 0.3.
    expect(0.1 + 0.1 + 0.1).not.toBe(0.3);
    expect(niceTicks(0, 3, 0.3).ticks.at(-1)).toBe(3);
  });
});

describe("the default spacing (NLC-REQ-005)", () => {
  it(`is 1, 2 or 5 × 10ⁿ, giving between 5 and 20 ticks, for ranges 0.001 to 10⁶ wide (at most ${AXIS_DEFAULT_INTERVALS} intervals)`, () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 6, noNaN: true }), fc.double({ min: -1e6, max: 1e6, noNaN: true }), (logWidth, start) => {
        const width = 10 ** logWidth;
        const { spacing, ticks } = niceTicks(start, start + width);
        expect(isNice(spacing), String(spacing)).toBe(true);
        expect(ticks.length, `${start} to ${start + width} by ${spacing}`).toBeGreaterThanOrEqual(5);
        expect(ticks.length, `${start} to ${start + width} by ${spacing}`).toBeLessThanOrEqual(20);
      }),
      { numRuns: 500 },
    );
  });

  it("pins the rule on familiar ranges", () => {
    expect(niceTicks(-10, 10).spacing).toBe(2);
    expect(niceTicks(0, 10).spacing).toBe(1);
    expect(niceTicks(0, 100).spacing).toBe(10);
    expect(niceTicks(0, 0.001).spacing).toBe(0.0001);
    expect(niceTicks(0, 1e6).spacing).toBe(100000);
    expect(niceTicks(-3.5, 7.25).ticks).toEqual([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("tick counts", () => {
  it("counts the ticks without listing them, even for absurd spacings", () => {
    expect(tickCount(0, 10, 1)).toBe(11);
    expect(tickCount(0.5, 7.25, 2)).toBe(3);
    expect(tickCount(0.2, 0.8, 1)).toBe(0);
    expect(tickCount(0, 1, 1e-300)).toBeGreaterThan(1e299);
    expect(tickCount(-1e9, 1e9, 1e-310)).toBe(Infinity);
  });

  it("refuses to list an axis the validator would refuse", () => {
    expect(() => niceTicks(0, 10, 0)).toThrow(RangeError);
    expect(() => niceTicks(0, 100, 0.5)).toThrow(RangeError);
    expect(() => niceTicks(5, 5)).toThrow(RangeError);
  });
});

describe("tick labels", () => {
  it("show no more decimal places than the spacing needs, dropping trailing zeros", () => {
    expect(tickLabel(0.75, 0.25)).toBe("0.75");
    expect(tickLabel(0.5, 0.25)).toBe("0.5");
    expect(tickLabel(4, 2)).toBe("4");
    expect(tickLabel(-1.5, 0.5)).toBe("-1.5");
    expect(tickLabel(0.30000000000000004, 0.1)).toBe("0.3");
    expect(tickLabel(1000000, 100000)).toBe("1000000");
    expect(tickLabel(0.0003, 0.0001)).toBe("0.0003");
    expect(tickLabel(-0, 1)).toBe("0");
  });

  it("label every default tick with digits that join back to its value", () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 6, noNaN: true }), fc.double({ min: -1e6, max: 1e6, noNaN: true }), (logWidth, start) => {
        const { spacing, ticks } = niceTicks(start, start + 10 ** logWidth);
        for (const tick of ticks) {
          const label = tickLabel(tick, spacing);
          expect(label).not.toMatch(/e|^-0$/);
          expect(Math.abs(Number(label) - tick)).toBeLessThanOrEqual(spacing / 1e6);
        }
      }),
      { numRuns: 200 },
    );
  });
});
