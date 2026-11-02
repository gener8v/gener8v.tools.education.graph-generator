import { expect } from "vitest";

/** What `bench(...).run()` resolves to, as far as the p95 needs it. */
interface BenchResult {
  latency: { samples?: readonly number[] | undefined };
}

export interface P95Check {
  /**
   * The requirement the benchmark verifies, printed first on its line, e.g. "NLC-NFR-008"; or, for a
   * bound no requirement states, the constraint or security finding it comes from, e.g. "GSS TICKET-002
   * SEC-001".
   */
  requirement: string;
  name: string;
  limitMs: number;
  /**
   * The fewest timed runs a p95 is taken over. The benchmarks run a fixed number of iterations
   * (`time: 0`), so this fails only on a misconfigured run, never on a slow runner (CPSE TICKET-010).
   */
  minSamples?: number;
  /** Printed after the measurement, for anything the log should explain. */
  note?: string;
}

/**
 * The run options that make a benchmark exactly `runs` timed runs long on any runner, however slow:
 * spread them into `.run({ ...fixedRuns(n), warmupTime: ... })`. In tinybench's sequential mode both
 * `time` and `iterations` are minimums (a task keeps running while `elapsed < time || samples <
 * iterations`), so `time: 0` is what makes `iterations` the exact count; with the default `time` a
 * fast task runs far more than `iterations` and a slow one is cut short of the samples a p95 needs
 * (CPSE TICKET-010). Keep `runs` at or above the `minSamples` of the `expectP95` that follows.
 */
export function fixedRuns(runs: number): { time: 0; iterations: number } {
  return { time: 0, iterations: runs };
}

/**
 * Asserts a benchmark's p95 is within its limit, and prints the measurement on every run so the CI
 * log records it. Latencies are in milliseconds, sorted ascending, kept by Vitest's
 * `benchmark.retainSamples`. The one p95 rule every benchmark uses (rulers NLC TICKET-004 quality
 * review QR-005).
 */
export function expectP95(result: BenchResult, { requirement, name, limitMs, minSamples = 100, note }: P95Check): number {
  const samples = result.latency.samples;
  if (samples === undefined || samples.length === 0) throw new Error("No latency samples were kept; set benchmark.retainSamples");
  const p95 = samples[Math.floor(samples.length * 0.95)]!;
  const summary = `${name}: p95 ${p95.toFixed(4)} ms over ${samples.length} runs`;
  console.log(`${requirement} ${summary}${note === undefined ? "" : ` (${note})`}`);
  expect(samples.length, `${summary}: fewer than ${minSamples} runs`).toBeGreaterThanOrEqual(minSamples);
  expect(p95, summary).toBeLessThanOrEqual(limitMs);
  return p95;
}
