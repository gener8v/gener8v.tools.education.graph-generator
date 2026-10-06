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
      const samples = result.latency.samples;
      // Latencies are in milliseconds, sorted ascending; p99 bounds p95 if samples are absent.
      const p95 = samples === undefined ? result.latency.p99 : samples[Math.floor(samples.length * 0.95)]!;
      expect(p95, `${example.type}: p95 ${p95.toFixed(4)} ms over ${result.latency.samplesCount} runs`).toBeLessThanOrEqual(P95_LIMIT_MS);
    });
  }
});
