import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { definitions } from "../../src/core/definitions/index";
import { buildSchema, buildToolSchema } from "../../src/core/schema";
import { fixtureRegistry } from "../fixtures/definitions/index";

// GSV-NFR-002: the published schema is valid against the meta-schema it declares (JSON Schema
// 2020-12). The tool schema is checked against the same meta-schema. Runs in CI with `pnpm test`.
// strictRequired is an Ajv lint, not a JSON Schema rule: a derivation group's `anyOf: [{ required }]`
// names properties defined beside it, which the specification allows.
const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });

describe("schemas are valid JSON Schema 2020-12 (GSV-NFR-002)", () => {
  for (const [name, registry] of [
    ["the registered types", definitions],
    ["the fixture types", fixtureRegistry],
  ] as const) {
    it(`published schema, for ${name}`, () => {
      const schema = buildSchema(registry);
      expect(schema["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(ajv.validateSchema(schema), JSON.stringify(ajv.errors)).toBe(true);
      expect(() => ajv.compile(schema)).not.toThrow();
    });

    it(`tool schema, for ${name}`, () => {
      const schema = buildToolSchema(registry);
      expect(ajv.validateSchema(schema), JSON.stringify(ajv.errors)).toBe(true);
      expect(() => ajv.compile(schema)).not.toThrow();
    });
  }

  it("rejects an invalid schema, so the check is real", () => {
    expect(ajv.validateSchema({ type: "object", additionalProperties: "no" })).toBe(false);
  });
});
