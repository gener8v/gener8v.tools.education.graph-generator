import { expect } from "vitest";

/**
 * The fewest generated samples, of `runs`, that a feature of rate `rate` shows in with overwhelming
 * odds: the expected count `runs * rate` less five standard deviations of the binomial,
 * `sqrt(runs * rate * (1 - rate))`. A count below it happens about once in 3.5 million runs (one-sided
 * normal tail; the binomial's is a little fatter at low rates, so a threshold with a small margin
 * over this floor is still no more than a one-in-a-million flake). It is what a coverage threshold
 * ("at least a quarter of the samples had decimal values") is checked against, so a threshold is
 * derived from a stated rate and not a number that happened to pass (CPSE TICKET-010).
 *
 * Measure the rate over at least ten times `runs` samples (for example, tally the feature over
 * `fc.sample(arb, 15_000)`), and date the measurement beside it. Re-measure when an arbitrary changes:
 * the stated rate is then wrong, and `expectCovered` fails or passes on a rate that no longer holds.
 */
export function fiveSigmaFloor(runs: number, rate: number): number {
  return runs * rate - 5 * Math.sqrt(runs * rate * (1 - rate));
}

/**
 * Asserts a feature turned up in more than `threshold` of `runs` samples, and that `threshold` is no
 * higher than `fiveSigmaFloor(runs, rate)` for the feature's measured `rate`: the check cannot fail on
 * chance, and cannot be raised past what the stated rate supports without the second assertion saying so.
 */
export function expectCovered(count: number | undefined, threshold: number, runs: number, rate: number): void {
  const floor = fiveSigmaFloor(runs, rate);
  expect(threshold, `threshold ${threshold} is above the five-sigma floor ${floor.toFixed(1)} of rate ${rate} over ${runs} runs`).toBeLessThanOrEqual(floor);
  expect(count).toBeGreaterThan(threshold);
}
