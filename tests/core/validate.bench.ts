import { describe, expect, test } from "vitest";
import { validateWith } from "../../src/core/validate/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";

// GSV-NFR-001: validating one description of any type takes at most 5 ms at p95 in Node.js on a
// CI runner. Vitest runs benchmarks in their own project, through `pnpm bench` (a CI step), not
// `pnpm test`. Until the type tickets land it covers the fixture types; each type ticket adds its
// example here.
const P95_LIMIT_MS = 5;

describe("validation speed (GSV-NFR-001)", () => {
  for (const example of fixtureExamples) {
    test(`${example.type}: p95 at most ${P95_LIMIT_MS} ms`, async ({ bench }) => {
      const result = await bench(example.type, () => {
        validateWith(example, fixtureRegistry);
      }).run({ time: 300, warmupTime: 50 });
      // Latencies in milliseconds, sorted ascending; kept by `benchmark.retainSamples`.
      const samples = result.latency.samples;
      if (samples === undefined || samples.length === 0) throw new Error("No latency samples were kept; set benchmark.retainSamples");
      const p95 = samples[Math.floor(samples.length * 0.95)]!;
      const summary = `${example.type}: p95 ${p95.toFixed(4)} ms over ${samples.length} runs`;
      // Printed on every run, so the CI log records the measurement (quality review QR-002).
      console.log(`GSV-NFR-001 ${summary}`);
      expect(p95, summary).toBeLessThanOrEqual(P95_LIMIT_MS);
    });
  }
});
