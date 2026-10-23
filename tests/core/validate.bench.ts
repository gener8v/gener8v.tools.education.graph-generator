import { readFileSync } from "node:fs";
import { describe, test } from "vitest";
import { definitions, registeredTypes } from "../../src/core/definitions/index";
import { validateWith } from "../../src/core/validate/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import { expectP95 } from "../helpers/bench";

// GSV-NFR-001: validating one description of any type takes at most 5 ms at p95 in Node.js on a
// CI runner. Vitest runs benchmarks in their own project, through `pnpm bench` (a CI step), not
// `pnpm test`. It covers every registered type's documented example, `examples/<type>.json`, so
// each type joins without an edit here, and the fixture types, which stay as the validator's
// stand-ins (GSS TICKET-002 quality review QR-009).
const P95_LIMIT_MS = 5;

const cases = [
  ...registeredTypes(definitions).map((type) => ({
    name: type,
    example: JSON.parse(readFileSync(`examples/${type}.json`, "utf8")) as unknown,
    registry: definitions,
  })),
  ...fixtureExamples.map((example) => ({ name: `fixture ${example.type}`, example, registry: fixtureRegistry })),
];

describe("validation speed (GSV-NFR-001)", () => {
  for (const { name, example, registry } of cases) {
    test(`${name}: p95 at most ${P95_LIMIT_MS} ms`, async ({ bench }) => {
      const result = await bench(name, () => {
        validateWith(example, registry);
      }).run({ time: 300, warmupTime: 50 });
      // Printed on every run, so the CI log records the measurement (quality review QR-002).
      expectP95(result, { requirement: "GSV-NFR-001", name, limitMs: P95_LIMIT_MS });
    });
  }
});
