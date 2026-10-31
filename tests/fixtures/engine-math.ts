import { vi } from "vitest";

// Another engine's `Math`, simulated (graph-library CPSE TICKET-004 code review CR-002, TR-002).
// ECMAScript leaves the transcendental functions "implementation-approximated", so V8,
// JavaScriptCore and SpiderMonkey may differ in a result's last bit; the basic operations and
// `Math.sqrt` are exact everywhere and are never moved. A result is moved a whole number of units
// in the last place; 0, the infinities and NaN are left alone, as every engine computes them exactly.

/**
 * Every `Math` function the language lets an engine approximate, whether the package calls it or
 * not, so a layout that starts calling one is covered. The package calls `hypot`, `sin`, `cos`,
 * `atan2` and `log10`; its `**` is an operator, which no spy can reach.
 */
export const APPROXIMATED_MATH = [
  "acos", "acosh", "asin", "asinh", "atan", "atanh", "atan2", "cbrt", "cos", "cosh", "exp",
  "expm1", "hypot", "log", "log1p", "log10", "log2", "pow", "sin", "sinh", "tan", "tanh",
] as const;

export type ApproximatedMath = (typeof APPROXIMATED_MATH)[number];

const view = new DataView(new ArrayBuffer(8));

/** `x` moved `steps` units in the last place, toward +∞ for a positive `steps`; 0, ±∞ and NaN unchanged. */
export function ulpStep(x: number, steps: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  view.setFloat64(0, x);
  // A float's bits, read as an integer, count up with its magnitude.
  view.setBigInt64(0, view.getBigInt64(0) + BigInt(x > 0 ? steps : -steps));
  return view.getFloat64(0);
}

/**
 * Spies on each of `names` so its result is `steps` units in the last place off, as another engine
 * may compute it. Undo with `vi.restoreAllMocks()`.
 */
export function mathOff(steps: number, names: readonly ApproximatedMath[] = APPROXIMATED_MATH): void {
  for (const name of names) {
    const exact = (Math[name] as (...values: number[]) => number).bind(Math);
    vi.spyOn(Math, name).mockImplementation((...values: number[]) => ulpStep(exact(...values), steps));
  }
}
