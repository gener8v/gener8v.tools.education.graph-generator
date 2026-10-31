import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { validate } from "../../src/core/index";
import { CROSS_ENGINE_SAMPLE, DESCRIPTION_ARBS, ONE_CLUSTER_TEXTS_AT_LIMIT, sampleDescriptions, textsOf } from "./descriptions";

// The generators the browser checks sample (tests/e2e/cross-engine.spec.ts), checked in the fast
// suite, so a definition change that makes one reject its samples or miss a type fails `pnpm test`
// and not only the browser job (graph-library CPSE TICKET-004 quality review QR-002).

describe("valid-description generators for every graph type", () => {
  for (const type of GRAPH_TYPES) {
    it(`gives valid ${type} descriptions`, () => {
      for (const description of fc.sample(DESCRIPTION_ARBS[type], { numRuns: 50, seed: 1 })) {
        expect(description.type).toBe(type);
        const result = validate(description);
        expect(result.valid ? [] : result.issues, JSON.stringify(description)).toEqual([]);
      }
    });
  }

  it("reaches every graph type and caller text at the limit in the cross-engine sample", () => {
    const sample = sampleDescriptions(CROSS_ENGINE_SAMPLE.count, CROSS_ENGINE_SAMPLE.seed);
    expect(sample).toHaveLength(CROSS_ENGINE_SAMPLE.count);
    expect(new Set(sample.map(({ type }) => type))).toEqual(new Set(GRAPH_TYPES));
    const texts = sample.flatMap(textsOf);
    expect(texts.some((text) => [...text].length === CALLER_TEXT_LIMIT)).toBe(true);
    expect(texts.some((text) => ONE_CLUSTER_TEXTS_AT_LIMIT.includes(text))).toBe(true);
  });
});
