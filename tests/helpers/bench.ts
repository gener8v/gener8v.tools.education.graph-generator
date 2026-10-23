import { expect } from "vitest";

/** What `bench(...).run()` resolves to, as far as the p95 needs it. */
interface BenchResult {
  latency: { samples?: readonly number[] | undefined };
}

export interface P95Check {
  /** The requirement the benchmark verifies, printed first on its line, e.g. "NLC-NFR-008". */
  requirement: string;
  name: string;
  limitMs: number;
  /** The fewest timed runs a p95 is taken over. */
  minSamples?: number;
  /** Printed after the measurement, for anything the log should explain. */
  note?: string;
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
