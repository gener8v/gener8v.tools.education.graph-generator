import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globalSetup: ["tests/setup/build.ts"],
    testTimeout: 30_000,
    // Samples are kept so the benches can compute the p95 they assert (tests/helpers/bench.ts).
    benchmark: { include: ["tests/**/*.bench.ts"], retainSamples: true },
  },
});
