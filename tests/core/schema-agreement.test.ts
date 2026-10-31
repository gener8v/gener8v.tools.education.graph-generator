import { existsSync, readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type Registry, definitions, propertiesOf, registeredTypes } from "../../src/core/definitions/index";
import { GRAPH_TYPES, type GraphType, type PropertyMap, type ValueSpec } from "../../src/core/definitions/types";
import { type JsonSchema, buildSchema } from "../../src/core/schema";
import { namedColors } from "../../src/core/style";
import { validateWith } from "../../src/core/validate/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import { createAjv } from "../helpers/ajv";

// GSV-NFR-003 (and GSV-REQ-011): no description the published schema rejects passes `validate`.
// A counterexample is a description the validator accepts and the schema rejects, so the
// generator works one fault away from a valid base description of each type (code review CR-001,
// quality reviews QR-001 and QR-002 on TICKET-005):
//   - the base itself;
//   - one change at one place, at any depth: a value replaced, a property deleted, or an unknown
//     key added beside it;
//   - a list grown to exactly its maxItems, or one past it;
//   - the base under another type, and random JSON.
// Registered types take their base from examples/<type>.json, which each type ticket produces.
// The test covers the JSON form of a description (an `undefined`-valued key is not JSON).
const RUNS = 1_000;
/**
 * The seed of the two checks that need a rare sample (CPSE TICKET-010): the negative control finds
 * its counterexample in 1.4% of samples and the list check reaches maxItems in 0.9% and one past it
 * in 0.8% (measured over 20,000 and 10,000 samples, 2026-10-31), so unseeded each missed about once
 * in 2 million, 9,000 and 2,500 runs.
 */
const RARE_SEED = 20_261_031;
const ajv = createAjv();
const colorNames = Object.keys(namedColors);

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Path = Array<string | number>;

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
    case "string": {
      // Texts on both sides of the limit, in letters and in emoji, so schema and validator are
      // seen to count characters the same way (GSV-REQ-054; graph-library GSV TICKET-007).
      const limit = spec.maxLength === undefined ? [] : [spec.maxLength, spec.maxLength + 1].flatMap((n) => ["x".repeat(n), "🍎".repeat(n)]);
      return fc.oneof({ weight: 4, arbitrary: fc.string({ maxLength: 12, unit: "binary" }) }, fc.constantFrom("", "A title", "x < 5", ...limit), anything);
    }
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
    case "array":
      return anything;
  }
}

/** A place a single fault can go, found by walking a base description along its spec. */
type Site =
  | { kind: "value"; path: Path; spec: ValueSpec; deletable: boolean }
  | { kind: "extra"; path: Path }
  | { kind: "length"; path: Path; maxItems: number };

function sites(base: Json, properties: PropertyMap, path: Path = [], found: Site[] = []): Site[] {
  found.push({ kind: "extra", path });
  const object = base as Record<string, Json>;
  for (const spec of Object.values(properties)) {
    const at = [...path, spec.term];
    found.push({ kind: "value", path: at, spec, deletable: true });
    const inner = object[spec.term];
    if (inner === undefined) continue;
    if (spec.kind === "object") sites(inner, spec.properties, at, found);
    if (spec.kind === "array" && Array.isArray(inner)) {
      if (inner.length > 0) found.push({ kind: "length", path: at, maxItems: spec.maxItems });
      inner.forEach((element, index) => {
        if (spec.items.kind === "object") sites(element, spec.items.properties, [...at, index], found);
        else found.push({ kind: "value", path: [...at, index], spec: spec.items, deletable: false });
      });
    }
  }
  return found;
}

/** The parent object (or list) of a path, and the last key, in a copy of the base. */
function locate(root: Json, path: Path): [Record<string | number, unknown>, string | number] {
  let parent = root as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) parent = parent[key] as Record<string | number, unknown>;
  return [parent, path[path.length - 1]!];
}

function oneFault(base: Json, properties: PropertyMap): fc.Arbitrary<unknown> {
  const all = sites(base, properties);
  return fc.constantFrom(...all).chain((site) => {
    switch (site.kind) {
      case "value": {
        const change = site.deletable ? fc.oneof({ weight: 4, arbitrary: value(site.spec).map((v) => ({ set: v })) }, fc.constant({ delete: true })) : value(site.spec).map((v) => ({ set: v }));
        return change.map((action) => {
          const copy = structuredClone(base);
          const [parent, key] = locate(copy, site.path);
          if ("delete" in action) delete parent[key];
          else parent[key] = action.set;
          return copy;
        });
      }
      case "extra":
        return fc.tuple(fc.constantFrom("sparkle", "raduis", "colour", "lable"), fc.jsonValue({ maxDepth: 1 })).map(([key, extra]) => {
          const copy = structuredClone(base);
          const target = site.path.reduce<Record<string | number, unknown>>((node, step) => node[step] as Record<string | number, unknown>, copy as Record<string, unknown>);
          target[key] = extra;
          return copy;
        });
      case "length":
        return fc.constantFrom(site.maxItems, site.maxItems + 1).map((length) => {
          const copy = structuredClone(base);
          const [parent, key] = locate(copy, site.path);
          const list = parent[key] as Json[];
          parent[key] = Array.from({ length }, (_, index) => structuredClone(list[index % list.length]!));
          return copy;
        });
    }
  });
}

function descriptions(type: GraphType, registry: Registry, base: Json): fc.Arbitrary<unknown> {
  const properties = propertiesOf(type, registry);
  const otherType = fc.constantFrom<unknown>("pie", ...GRAPH_TYPES.filter((other) => other !== type)).map((other) => ({
    ...(base as object),
    type: other,
  }));
  const version = fc.constantFrom<unknown>(1, 2, "1", null).map((v) => ({ ...(base as object), version: v }));
  return fc.oneof(
    { weight: 1, arbitrary: fc.constant(base) },
    { weight: 12, arbitrary: oneFault(base, properties) },
    { weight: 1, arbitrary: version },
    { weight: 1, arbitrary: otherType },
    { weight: 1, arbitrary: fc.jsonValue({ maxDepth: 3 }) },
  );
}

/** The base description of a registered type: examples/<type>.json, which each type ticket produces. */
function exampleFile(type: GraphType): Json {
  const file = new URL(`../../examples/${type}.json`, import.meta.url);
  if (!existsSync(file)) {
    throw new Error(`No examples/${type}.json: add a valid ${type} description there; the agreement test (GSV-NFR-003) mutates it.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as Json;
}

/** Run the agreement property for one type; returns how often each side was exercised. */
function agreement(type: GraphType, registry: Registry, base: Json, schema: JsonSchema = buildSchema(registry), seed?: number) {
  const accepts = ajv.compile(schema);
  let schemaRejected = 0;
  let bothAccepted = 0;
  const outcome = fc.check(
    fc.property(descriptions(type, registry, base), (description) => {
      const schemaValid = accepts(description);
      const result = validateWith(description, registry);
      if (!schemaValid) schemaRejected += 1;
      if (schemaValid && result.valid) bothAccepted += 1;
      // The validator may be stricter than the schema, never looser.
      return schemaValid || !result.valid;
    }),
    { numRuns: RUNS, ...(seed !== undefined && { seed }) },
  );
  return { outcome, schemaRejected, bothAccepted };
}

describe("the published schema and the validator agree (GSV-NFR-003, GSV-REQ-011)", () => {
  const legs: Array<[string, Registry, (type: GraphType) => Json]> = [
    ["fixture", fixtureRegistry, (type) => fixtureExamples.find((example) => example.type === type) as unknown as Json],
    ["registered", definitions, exampleFile],
  ];
  for (const [name, registry, baseOf] of legs) {
    for (const type of registeredTypes(registry)) {
      it(`${name} ${type}: nothing the schema rejects passes validate (${RUNS} descriptions)`, () => {
        const base = baseOf(type);
        expect(validateWith(base, registry).valid, `the ${type} base description must be valid`).toBe(true);
        const { outcome, schemaRejected, bothAccepted } = agreement(type, registry, base);
        expect(outcome.failed, outcome.counterexample ? JSON.stringify(outcome.counterexample) : "").toBe(false);
        // Both sides of the boundary are exercised in earnest. Over 10,000 samples of each type
        // (2026-10-31; CPSE TICKET-010) the schema rejected 35% to 58% and both accepted 35% to 58%:
        // at the lowest, 347 of 1,000 expected and 272 five standard deviations below.
        expect(schemaRejected, "descriptions the schema rejected").toBeGreaterThan(RUNS / 10);
        expect(bothAccepted, `descriptions both accepted; check the ${type} base description`).toBeGreaterThan(RUNS / 10);
      });
    }
  }

  it("finds a validator that misses a nested schema rule (negative control)", () => {
    // A schema stricter than the validator in one nested place: number-line tickCount at most 10.
    const strict = structuredClone(buildSchema(fixtureRegistry)) as JsonSchema;
    const numberLine = (strict["anyOf"] as JsonSchema[]).find(
      (entry) => ((entry["properties"] as Record<string, JsonSchema>)["type"]!["const"] as string) === "number-line",
    )!;
    (numberLine["properties"] as Record<string, JsonSchema>)["tickCount"]!["maximum"] = 10;
    const base = fixtureExamples.find((example) => example.type === "number-line") as unknown as Json;
    const { outcome } = agreement("number-line", fixtureRegistry, base, strict, RARE_SEED);
    expect(outcome.failed).toBe(true);
  });

  it("reaches a list's maxItems and one past it", () => {
    const base = fixtureExamples.find((example) => example.type === "xy-graph") as unknown as Json;
    const lengths = new Set<number>();
    fc.assert(
      fc.property(descriptions("xy-graph", fixtureRegistry, base), (description) => {
        const points = description !== null && typeof description === "object" ? (description as { points?: unknown }).points : undefined;
        if (Array.isArray(points)) lengths.add(points.length);
        return true;
      }),
      { numRuns: RUNS, seed: RARE_SEED },
    );
    expect(lengths.has(1_000)).toBe(true);
    expect(lengths.has(1_001)).toBe(true);
  });
});
