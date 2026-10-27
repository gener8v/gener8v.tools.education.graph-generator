import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { axisSpacing, drawableTicks, fittedAxisSpacing, niceInterval, tickLabelWidth } from "../../../src/core/value-scale";
import { textWidth } from "../../../src/layout/kit/text";
import { AXIS_DEFAULT_INTERVALS, isTickValue, niceTicks, tickCount, tickLabel } from "../../../src/layout/kit/ticks";

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
        // No multiple is left out at either end; with none at all, no multiple fits the range, as
        // when one step's spacing rounds up past the span (quality review QR-001).
        if (ticks.length === 0) {
          // The smallest multiple on or above min, with the same decimal-noise allowance as the rule,
          // measured against the multiple (security review SEC-001), lies past max.
          const near = (value: number, k: number) => Math.abs(k * spacing - value) <= 1e-12 * Math.max(Math.abs(value), Math.abs(k * spacing));
          const k = Math.ceil(min / spacing);
          const first = near(min, k - 1) ? k - 1 : k;
          expect(first * spacing > max && !near(max, first)).toBe(true);
        }
        else {
          expect(ticks[0]!).toBeLessThan(min + spacing + tolerance);
          expect(ticks.at(-1)!).toBeGreaterThan(max - spacing - tolerance);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("keeps ticks far from zero on their multiples, so labels state their true values (quality review QR-002)", () => {
    const { ticks, spacing } = niceTicks(1e8, 1e8 + 0.2, 0.0025);
    expect(ticks[1]).toBe(100000000.0025);
    expect(tickLabel(ticks[1]!, spacing)).toBe("100000000.0025");
    expect(ticks.at(-1)).toBe(100000000.2);
    fc.assert(
      fc.property(fc.double({ min: -1, max: 1, noNaN: true }), fc.constantFrom(0.0025, 0.01, 0.125, 0.5, 2.5), fc.integer({ min: 5, max: 90 }), (where, step, steps) => {
        // A range starting on a multiple, anywhere up to ±1e9.
        const min = Math.round((where * 1e9) / step) * step;
        const max = min + step * steps;
        fc.pre(max <= 1e9 && max - min >= 1e-9 * Math.max(1, Math.abs(min), Math.abs(max)));
        const { ticks } = niceTicks(min, max, step);
        expect(ticks).toHaveLength(steps + 1);
        ticks.forEach((tick, i) => {
          // Each tick is the decimal its label states, within a millionth of the spacing. The expected
          // value carries rounding of its own, up to a few ulps at 1e9, which can exceed a millionth
          // of the spacing (security review, on QR-002's test).
          const expected = min + i * step;
          const tolerance = Math.max(step * 1e-6, 4 * Number.EPSILON * Math.abs(expected));
          expect(Math.abs(Number(tickLabel(tick, step)) - expected)).toBeLessThanOrEqual(tolerance);
        });
      }),
      { numRuns: 300 },
    );
  });

  it("lists every tick it counts for a spacing longer than twelve significant digits, end ticks included (NLC TICKET-006 security review SEC-001)", () => {
    // Labels clean the spacing's noise (DS-001); ticks must not, or rounding moves an end tick out of range.
    const end = 2.9999999999958;
    expect(niceTicks(0, end, end / 10).ticks).toHaveLength(11);
    expect(niceTicks(0, end, end / 10).ticks.at(-1)).toBe(end);
    expect(niceTicks(-end, 0, end / 10).ticks[0]).toBe(-end);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999 }), fc.integer({ min: 0, max: 3 }), fc.double({ min: -5e-13, max: 5e-13, noNaN: true }), fc.integer({ min: 2, max: 60 }), fc.double({ min: -5e-13, max: 5e-13, noNaN: true }), (whole, places, drift, steps, off) => {
        // A spacing within 5e-13 of a short decimal, and an end well within the 1e-12 a multiple is matched at.
        const spacing = (whole / 10 ** places) * (1 + drift);
        const max = spacing * steps * (1 + off);
        fc.pre(max <= 1e9);
        expect(niceTicks(0, max, spacing).ticks).toHaveLength(tickCount(0, max, spacing));
        expect(niceTicks(-max, 0, spacing).ticks).toHaveLength(tickCount(-max, 0, spacing));
      }),
      { numRuns: 2000 },
    );
  });

  it("adds no tick outside the range far from zero, where a tick's index is large (code review CR-001)", () => {
    expect(niceTicks(999_999_998.4, 999_999_999.6, 1).ticks).toEqual([999_999_999]);
    expect(tickCount(999_999_900.4, 999_999_999.6, 1)).toBe(99);
    expect(niceTicks(-999_999_999.6, -999_999_998.4, 1).ticks).toEqual([-999_999_999]);
    // An end exactly on a multiple keeps its tick.
    expect(niceTicks(999_999_998, 999_999_999.5, 0.5).ticks).toEqual([999_999_998, 999_999_998.5, 999_999_999, 999_999_999.5]);
    fc.assert(
      fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), fc.double({ min: -2, max: 3, noNaN: true }), fc.integer({ min: 3, max: 90 }), (min, logWidth, steps) => {
        const max = min + 10 ** logWidth;
        fc.pre(max <= 1e9 && max - min >= 1e-9 * Math.max(1, Math.abs(min), Math.abs(max)));
        const spacing = Number(((max - min) / steps).toPrecision(2));
        fc.pre(spacing > 0 && tickCount(min, max, spacing) <= 100);
        const tolerance = 1e-12 * Math.max(Math.abs(min), Math.abs(max), spacing);
        for (const tick of niceTicks(min, max, spacing).ticks) {
          expect(tick).toBeGreaterThanOrEqual(min - tolerance);
          expect(tick).toBeLessThanOrEqual(max + tolerance);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("adds no tick at zero to a range near zero that excludes it, whatever the spacing (security review SEC-001)", () => {
    for (const [min, max, spacing] of [
      [0.001, 0.002, 2e9],
      [0.0019, 0.0019000011, 2e9],
      [-0.002, -0.0019999989, 2e9],
      [1e-7, 2e-7, 1e6],
      [0.0001, 0.002, 2e9],
    ] as const) {
      expect(tickCount(min, max, spacing), `${min} to ${max} by ${spacing}`).toBe(0);
      expect(niceTicks(min, max, spacing).ticks).toEqual([]);
    }
    // An end at zero keeps its tick.
    expect(niceTicks(0, 0.002, 2e9).ticks).toEqual([0]);
    expect(niceTicks(-0.002, 0, 2e9).ticks).toEqual([0]);
    fc.assert(
      fc.property(fc.double({ min: 1e-9, max: 1e-3, noNaN: true }), fc.double({ min: 1, max: 1e6, noNaN: true }), fc.double({ min: 1e3, max: 2e9, noNaN: true }), fc.boolean(), (near, widen, spacing, negative) => {
        const [low, high] = [near, near * (1 + widen)];
        fc.pre(high <= 1e9);
        const [min, max] = negative ? [-high, -low] : [low, high];
        const result = drawableTicks(min, max, spacing);
        fc.pre(result !== undefined);
        for (const tick of result!.ticks) {
          expect(tick).toBeGreaterThanOrEqual(min);
          expect(tick).toBeLessThanOrEqual(max);
        }
      }),
      { numRuns: 500 },
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
    // At most 19 intervals: 0 to 19 by 1 is 20 ticks; 0 to 19.5 needs 2 (quality review QR-003).
    expect(niceTicks(0, 19).spacing).toBe(1);
    expect(niceTicks(0, 19.5).spacing).toBe(2);
    expect(AXIS_DEFAULT_INTERVALS).toBe(19);
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
    // A range too narrow to draw: one decision with drawableTicks (quality review QR-005).
    expect(() => niceTicks(1e6, 1e6 + 1e-6)).toThrow(RangeError);
  });
});

describe("ticks for a check (code review CR-006)", () => {
  it("are listed for an axis that can be drawn, and undefined, never thrown, for one that cannot", () => {
    expect(drawableTicks(0, 10, 2)).toEqual(niceTicks(0, 10, 2));
    expect(drawableTicks(-3.5, 7.25)).toEqual(niceTicks(-3.5, 7.25));
    for (const [min, max, spacing] of [
      [0, 10, 0],
      [0, 10, -1],
      [0, 100, 0.5],
      [5, 5, undefined],
      [5, 1, 1],
      [0, 1e-10, undefined],
      [0, 1, 1e-300],
      [Number.NaN, 1, 1],
      [0, 1, Number.POSITIVE_INFINITY],
    ] as const) {
      expect(drawableTicks(min, max, spacing), `${min} to ${max} by ${spacing}`).toBeUndefined();
    }
  });
});

describe("custom label matching", () => {
  it("matches a value written in full to its tick, and nothing a hundredth of a spacing away (quality review QR-004)", () => {
    expect(isTickValue(2 / 3, 0.666666666667, 1 / 3)).toBe(true);
    expect(isTickValue(1_000_000 + 2 / 3, 1_000_000.6666666666, 1 / 3)).toBe(true);
    expect(isTickValue(0.51, 0.5, 1)).toBe(false);
    expect(isTickValue(0.5025, 0.5, 0.25)).toBe(false);
    expect(isTickValue(0.49, 0.5, 1)).toBe(false);
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

  // A spacing worked out in floating point carries noise (0.1 * 3 is 0.30000000000000004); the labels
  // state the value the caller meant, not the noise (defect sweep DS-001).
  it.each([
    ["0.1 * 3", 0.1 * 3, 1.2, ["0", "0.3", "0.6", "0.9", "1.2"]],
    ["0.1 + 0.2", 0.1 + 0.2, 1.2, ["0", "0.3", "0.6", "0.9", "1.2"]],
    ["0.7 / 7", 0.7 / 7, 0.4, ["0", "0.1", "0.2", "0.3", "0.4"]],
    ["0.2 * 3", 0.2 * 3, 2.4, ["0", "0.6", "1.2", "1.8", "2.4"]],
  ])("label a spacing of %s with the decimals of the value meant (defect sweep DS-001)", (_name, spacing, max, labels) => {
    const { ticks, spacing: used } = niceTicks(0, max, spacing);
    expect(ticks.map((tick) => tickLabel(tick, used))).toEqual(labels);
    expect(tickLabel(spacing, spacing)).toBe(labels[1]);
  });

  it("labels a spacing longer than twelve significant digits at twelve significant digits (defect sweep DS-001; quality review QR-002)", () => {
    expect(tickLabel(1 / 3, 1 / 3)).toBe("0.333333333333");
    expect(niceTicks(0, 1, 1 / 3).ticks.map((tick) => tickLabel(tick, 1 / 3))).toEqual(["0", "0.333333333333", "0.666666666667", "1"]);
    // Twelve significant digits, not twelve decimal places: five of them come before the point here.
    expect(niceTicks(0, 24691.357802469, 12345.6789012345).ticks.map((tick) => tickLabel(tick, 12345.6789012345))).toEqual(["0", "12345.6789012", "24691.3578025"]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("refuse a value of %d, which no axis ticks (security review SEC-004)", (value) => {
    expect(() => tickLabel(value, 1)).toThrow(RangeError);
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

describe("the default spacing for the length an axis is drawn at (NLC-REQ-005, NLC-REQ-006; NLC TICKET-009)", () => {
  // The x,y graph's figures: a gap of a fifth of the 12-unit tick font between labels side by side,
  // and a label's height plus that gap between labels stacked.
  const ACROSS = 2.4;
  const STACKED = 14.4;

  it("keeps the range's own spacing where its labels stand apart at the length", () => {
    expect(fittedAxisSpacing(-10, 10, 400, ACROSS, 12)).toBe(axisSpacing(-10, 10));
    expect(fittedAxisSpacing(-10, 10, 400, ACROSS, 12)).toBe(2);
    expect(fittedAxisSpacing(0, 100, 360, STACKED)).toBe(10);
  });

  it("is coarser where neighbouring labels would run together: x -2..2 across 120 units, y -2..2 64 units tall", () => {
    // Every 0.5 puts "-2" and "-1.5" 15 units apart, where half of each label's width and the gap need 19.6.
    expect(axisSpacing(-2, 2)).toBe(0.5);
    expect(fittedAxisSpacing(-2, 2, 120, ACROSS, 12)).toBe(1);
    // Labels 12 units tall, level with their ticks: every 0.5 is 8 units apart, every 1 is 16.
    expect(fittedAxisSpacing(-2, 2, 64, STACKED)).toBe(1);
  });

  it("falls back to the coarsest spacing that leaves two ticks where none clears, where labels may touch", () => {
    // 10 units across: nothing clears; every 5 leaves one tick (0), so every 2: -2, 0 and 2.
    expect(fittedAxisSpacing(-2, 2, 10, ACROSS, 12)).toBe(2);
    expect(niceTicks(-2, 2, 2).ticks).toEqual([-2, 0, 2]);
    // One unit tall: every 1 leaves 0 and 1; every 2 leaves only 0.
    expect(fittedAxisSpacing(0, 1, 1, STACKED)).toBe(1);
  });

  it("is 1, 2 or 5 × 10ⁿ, never finer than the range's own, always leaves two ticks, and is what a room gives niceTicks", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -3, max: 6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: 0, max: 30, noNaN: true }),
        fc.constantFrom(0, 12),
        (logWidth, start, length, extent, textSize) => {
          const [min, max] = [start, start + 10 ** logWidth];
          const spacing = fittedAxisSpacing(min, max, length, extent, textSize);
          expect(isNice(spacing), String(spacing)).toBe(true);
          expect(spacing).toBeGreaterThanOrEqual(axisSpacing(min, max));
          expect(drawableTicks(min, max, spacing)!.ticks.length, `${min} to ${max} by ${spacing}`).toBeGreaterThanOrEqual(2);
          expect(niceTicks(min, max, undefined, { length, extent, textSize }).spacing).toBe(spacing);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("measures a tick label exactly as the layout's textWidth does, from the three widths a label's characters have", () => {
    fc.assert(
      fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), fc.constantFrom(1e-9, 0.0025, 0.1, 0.5, 2, 5, 1 / 3, 100000), fc.constantFrom(7.5, 12, 14), (value, spacing, size) => {
        const label = tickLabel(value, spacing);
        expect(tickLabelWidth(label, size), label).toBe(textWidth(label, size));
      }),
      { numRuns: 300 },
    );
    expect(tickLabelWidth("-10.5", 12)).toBe(textWidth("-10.5", 12));
  });

  it("leaves every result as it was without a room, and a given spacing as given with one", () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 6, noNaN: true }), fc.double({ min: -1e6, max: 1e6, noNaN: true }), (logWidth, start) => {
        const [min, max] = [start, start + 10 ** logWidth];
        const ranged = niceInterval(max - min, AXIS_DEFAULT_INTERVALS);
        expect(axisSpacing(min, max)).toBe(ranged);
        expect(drawableTicks(min, max)).toEqual(drawableTicks(min, max, ranged));
        expect(niceTicks(min, max)).toEqual(niceTicks(min, max, ranged));
        const cramped = { length: 10, extent: STACKED, textSize: 12 };
        expect(axisSpacing(min, max, ranged, cramped)).toBe(ranged);
        expect(drawableTicks(min, max, ranged, cramped)).toEqual(drawableTicks(min, max, ranged));
        expect(niceTicks(min, max, ranged, cramped)).toEqual(niceTicks(min, max, ranged));
      }),
      { numRuns: 200 },
    );
    expect(niceTicks(-10, 10).spacing).toBe(2);
  });
});
