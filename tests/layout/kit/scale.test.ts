import { describe, expect, it } from "vitest";
import { linearScale } from "../../../src/layout/kit/scale";

describe("linearScale (AD-007)", () => {
  it("maps a domain into the 400-unit space", () => {
    const x = linearScale([-10, 10], [0, 400]);
    expect(x(-10)).toBe(0);
    expect(x(0)).toBe(200);
    expect(x(10)).toBe(400);
    expect(x(15)).toBe(500);
  });

  it("maps a reversed range, as a y axis does", () => {
    const y = linearScale([0, 100], [300, 0]);
    expect(y(0)).toBe(300);
    expect(y(25)).toBe(225);
    expect(y(100)).toBe(0);
  });

  it("maps a zero-width domain to the middle of the range", () => {
    expect(linearScale([5, 5], [0, 400])(5)).toBe(200);
    expect(linearScale([5, 5], [0, 400])(99)).toBe(200);
  });
});
