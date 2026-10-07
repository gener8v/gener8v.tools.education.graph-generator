/**
 * A linear map from a data interval onto an interval of the 400-unit drawing space (AD-007).
 * Either interval may run in reverse (a y axis maps upward values to smaller y). The result is not
 * rounded: pass it through `fmt()` when writing it into a Scene. A zero-width domain maps every
 * value to the middle of the range.
 */
// @spec CPSE-REQ-013
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) {
    const middle = (r0 + r1) / 2;
    return () => middle;
  }
  const ratio = (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * ratio;
}
