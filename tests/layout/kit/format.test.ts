import { describe, expect, it } from "vitest";
import { formatDerived, formatSupplied } from "../../../src/core/format";
import { displayValue, fmt, fmtPoints } from "../../../src/layout/kit/format";
import type { SceneNode } from "../../../src/layout/scene";

describe("fmt (AD-007, prd/TC-002)", () => {
  it("rounds to 2 decimal places", () => {
    expect(fmt(1.234)).toBe(1.23);
    expect(fmt(1.235)).toBe(1.24);
    expect(fmt(199.999)).toBe(200);
    expect(fmt(0.005)).toBe(0.01);
    expect(fmt(0.004)).toBe(0);
    expect(fmt(400)).toBe(400);
  });

  it("rounds negatives, half toward positive infinity as Math.round does", () => {
    expect(fmt(-1.234)).toBe(-1.23);
    expect(fmt(-1.236)).toBe(-1.24);
    expect(fmt(-0.125)).toBe(-0.12);
  });

  it("normalizes -0 to 0, including values that round to zero from below", () => {
    expect(Object.is(fmt(-0), 0)).toBe(true);
    expect(Object.is(fmt(-0.004), 0)).toBe(true);
    expect(Object.is(fmt(-0.005), 0)).toBe(true);
    expect(String(fmt(-0.001))).toBe("0");
  });

  it("prints without exponent form for drawing-space magnitudes", () => {
    expect(String(fmt(Math.PI * 100))).toBe("314.16");
    expect(String(fmt(1 / 3))).toBe("0.33");
  });

  it("throws on non-finite input so NaN and Infinity never reach markup", () => {
    expect(() => fmt(Number.NaN)).toThrow(RangeError);
    expect(() => fmt(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => fmt(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it("builds points lists from rounded coordinates", () => {
    expect(fmtPoints([[0.001, -0.001], [10.126, 20.5]])).toBe("0,0 10.13,20.5");
    expect(fmtPoints([])).toBe("");
  });
});

describe("Scene attrs accept only fmt()-ed numbers", () => {
  it("rejects a raw number at compile time (pnpm typecheck fails if this stops being an error)", () => {
    const ok: SceneNode = { kind: "circle", attrs: [["cx", fmt(10)], ["fill", "#000000"]] };
    // @ts-expect-error a raw number must go through fmt() before it enters a Scene (AD-007)
    const raw: SceneNode = { kind: "circle", attrs: [["cx", 10.123]] };
    // @ts-expect-error attributes outside the closed set (here an id; AD-008) are rejected
    const id: SceneNode = { kind: "circle", attrs: [["id", "a"]] };
    expect([ok, raw, id]).toHaveLength(3);
  });
});

describe("displayValue (GSS-REQ-034; GSV TICKET-001 CR-007)", () => {
  it("returns a supplied value as given", () => {
    expect(displayValue(3.14159, true)).toBe("3.14159");
    expect(displayValue(5, true)).toBe("5");
    expect(displayValue(-0, true)).toBe("0");
    expect(displayValue(1e21, true)).toBe("1000000000000000000000");
  });

  it("returns a derived value at the display precision", () => {
    expect(displayValue(2 * Math.PI * 5, false)).toBe("31.42");
    expect(displayValue(1.005, false)).toBe("1.01");
    expect(displayValue(-2.5, false)).toBe("-2.5");
    expect(displayValue(-0.001, false)).toBe("-0.001");
    expect(displayValue(0.0012, false)).toBe("0.0012");
  });

  it("agrees with the text-alternative formatters, so labels and text alternatives match", () => {
    for (const n of [0, -0, 1, 1.005, 2.675, -3.14159, 1e-7, 123456.789, 0.1 + 0.2]) {
      expect(displayValue(n, true)).toBe(formatSupplied(n));
      expect(displayValue(n, false)).toBe(formatDerived(n));
    }
  });
});
