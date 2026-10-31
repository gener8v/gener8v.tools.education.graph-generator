import { afterEach, describe, expect, it, vi } from "vitest";
import { length, unit } from "../../../src/layout/kit/vec";
import { mathOff } from "../../fixtures/engine-math";

describe("length and unit in every engine (CPSE TICKET-004 code review CR-002, TR-002)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("measures a horizontal or vertical vector exactly, whatever the last bit of Math.hypot", () => {
    for (const steps of [-3, -1, 1, 3]) {
      mathOff(steps, ["hypot"]);
      expect(length([0, -112]), `${steps} in the last place`).toBe(112);
      expect(length([309.2868, 0])).toBe(309.2868);
      expect(length([-0, 0])).toBe(0);
      expect(unit([0, 240], [1, 0])).toEqual([0, 1]);
      expect(unit([-17.5, 0], [0, 1])).toEqual([-1, 0]);
      vi.restoreAllMocks();
    }
  });

  it("measures any other vector with Math.hypot", () => {
    expect(length([3, 4])).toBe(5);
    expect(length([1e200, 1e200])).toBe(Math.hypot(1e200, 1e200));
    expect(unit([0, 0], [0, -1])).toEqual([0, -1]);
  });
});
