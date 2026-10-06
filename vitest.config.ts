import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globalSetup: ["tests/setup/build.ts"],
    testTimeout: 30_000,
    // Samples are kept so the GSV-NFR-001 bench can compute the p95 it asserts.
    benchmark: { include: ["tests/**/*.bench.ts"], retainSamples: true },
  },
});
