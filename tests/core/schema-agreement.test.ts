import Ajv2020 from "ajv/dist/2020";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type Registry, definitions, propertiesOf } from "../../src/core/definitions/index";
import { GRAPH_TYPES, type GraphType, type PropertyMap, type ValueSpec } from "../../src/core/definitions/types";
import { buildSchema } from "../../src/core/schema";
import { namedColors } from "../../src/core/style";
import { validateWith } from "../../src/core/validate/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";

// GSV-NFR-003 (and GSV-REQ-011): no description the published schema rejects passes `validate`.
// fast-check generates at least 1,000 descriptions per registered graph type, in three families:
// built from the definition (mostly well-formed), mutated (wrong kinds, out-of-range values, extra
// and dropped keys) and random JSON. The registered types join as each type ticket lands; the
// fixture types stand in until then.
const RUNS = 1_000;
// strictRequired is an Ajv lint, not a JSON Schema rule: a derivation group's `anyOf: [{ required }]`
// names properties defined beside it, which the specification allows.
const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });

const colorNames = Object.keys(namedColors);

/** Values for one spec: usually well-formed, sometimes not. */
function value(spec: ValueSpec): fc.Arbitrary<unknown> {
  const anything = fc.jsonValue({ maxDepth: 2 });
  switch (spec.kind) {
    case "number":
    case "integer": {
      const min = spec.min ?? -1e6;
      const max = spec.max ?? 1e6;
      const inside =
        spec.kind === "integer"
          ? fc.integer({ min: Math.ceil(min), max: Math.floor(max) })
          : fc.double({ min, max, minExcluded: spec.exclusiveMin === true, maxExcluded: spec.exclusiveMax === true, noNaN: true });
      return fc.oneof({ weight: 6, arbitrary: inside }, fc.double({ noNaN: true, noDefaultInfinity: true }), fc.constantFrom(min, max, 0, -1), anything);
    }
    case "string":
      return fc.oneof({ weight: 4, arbitrary: fc.string({ maxLength: 12 }) }, fc.constantFrom("", "A title", "x < 5"), anything);
    case "boolean":
      return fc.oneof({ weight: 4, arbitrary: fc.boolean() }, anything);
    case "color":
      return fc.oneof(
        { weight: 4, arbitrary: fc.constantFrom(...colorNames, ...colorNames.map((name) => name.toUpperCase()), "#abc", "#0072B2") },
        fc.constantFrom("blurple", "#abcd", " red", ""),
        anything,
      );
    case "enum":
      return fc.oneof({ weight: 4, arbitrary: fc.constantFrom(...spec.values) }, fc.string({ maxLength: 6 }), anything);
    case "object":
      return fc.oneof({ weight: 6, arbitrary: object(spec.properties) }, anything);
    case "array":
      return fc.oneof({ weight: 6, arbitrary: fc.array(value(spec.items), { maxLength: Math.min(spec.maxItems + 1, 4) }) }, anything);
  }
}

/** An object for a property map: required keys usually present, optional ones sometimes, and now and then an extra key. */
function object(properties: PropertyMap): fc.Arbitrary<Record<string, unknown>> {
  const specs = Object.values(properties);
  const record = fc.record(Object.fromEntries(specs.map((spec) => [spec.term, value(spec)])), {
    requiredKeys: specs.filter((spec) => spec.required).map((spec) => spec.term),
  });
  return fc
    .tuple(record, fc.option(fc.tuple(fc.constantFrom("sparkle", "raduis", "colour"), fc.jsonValue({ maxDepth: 1 })), { freq: 8 }), fc.option(fc.constantFrom(...specs.map((spec) => spec.term)), { freq: 6 }))
    .map(([base, extra, drop]) => {
      const result: Record<string, unknown> = { ...base };
      if (extra !== null) result[extra[0]] = extra[1];
      if (drop !== null) delete result[drop];
      return result;
    });
}

/** Descriptions of one type: built, mutated, of another type, random, and known-valid examples. */
function descriptions(type: GraphType, registry: Registry, examples: readonly unknown[]): fc.Arbitrary<unknown> {
  const body = object(propertiesOf(type, registry));
  const version = fc.option(fc.constantFrom<unknown>(1, 2, "1", null), { freq: 4 });
  const built = fc.tuple(body, version).map(([properties, v]) => ({ type, ...properties, ...(v === null ? {} : { version: v }) }));
  const otherType = fc.tuple(body, fc.constantFrom<unknown>("pie", ...GRAPH_TYPES)).map(([properties, t]) => ({ ...properties, type: t }));
  const families = [
    { weight: 6, arbitrary: built },
    { weight: 1, arbitrary: otherType },
    { weight: 1, arbitrary: fc.jsonValue({ maxDepth: 3 }) as fc.Arbitrary<unknown> },
  ];
  if (examples.length > 0) families.push({ weight: 1, arbitrary: fc.constantFrom(...examples) });
  return fc.oneof(...families);
}

const examplesOf = (type: GraphType, examples: readonly unknown[]) =>
  examples.filter((example) => (example as { type?: unknown }).type === type);

const registered = (registry: Registry) => GRAPH_TYPES.filter((type) => registry[type] !== undefined);

describe("the published schema and the validator agree (GSV-NFR-003, GSV-REQ-011)", () => {
  for (const [name, registry] of [
    ["fixture", fixtureRegistry],
    ["registered", definitions],
  ] as const) {
    const accepts = ajv.compile(buildSchema(registry));
    for (const type of registered(registry)) {
      it(`${name} ${type}: nothing the schema rejects passes validate (${RUNS} descriptions)`, () => {
        let schemaRejected = 0;
        let bothAccepted = 0;
        fc.assert(
          fc.property(descriptions(type, registry, examplesOf(type, name === "fixture" ? fixtureExamples : [])), (description) => {
            const schemaValid = accepts(description);
            const result = validateWith(description, registry);
            if (!schemaValid) schemaRejected += 1;
            if (schemaValid && result.valid) bothAccepted += 1;
            // The validator may be stricter than the schema, never looser.
            return schemaValid || !result.valid;
          }),
          { numRuns: RUNS },
        );
        // The generator explores both sides of the boundary.
        expect(schemaRejected).toBeGreaterThan(RUNS / 10);
        expect(bothAccepted).toBeGreaterThan(0);
      });
    }
  }

  it("accepts every fixture example in both", () => {
    const accepts = ajv.compile(buildSchema(fixtureRegistry));
    for (const example of fixtureExamples) {
      expect(accepts(example), JSON.stringify(accepts.errors)).toBe(true);
      expect(validateWith(example, fixtureRegistry).valid).toBe(true);
    }
  });
});
