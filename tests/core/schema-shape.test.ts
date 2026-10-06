import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { definitions } from "../../src/core/definitions/index";
import { getSchema, getToolSchema, getVocabulary } from "../../src/core/index";
import {
  COLOR_PATTERN,
  type JsonSchema,
  buildDescriptionTypes,
  buildSchema,
  buildToolSchema,
  buildVocabulary,
} from "../../src/core/schema";
import { resolveColor } from "../../src/core/style";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import type { GraphDescription } from "../fixtures/generated/description";

// Type-level test (GSV-REQ-015): every fixture example is a GraphDescription generated from the
// fixture definitions. `pnpm typecheck` fails if the generated types and the definitions disagree.
const typedExamples: readonly GraphDescription[] = fixtureExamples;

const published = buildSchema(fixtureRegistry);
const tool = buildToolSchema(fixtureRegistry);
const vocabulary = buildVocabulary(fixtureRegistry);

/** Every schema object inside a schema, with its JSON path. */
function walk(schema: unknown, path = "#", found: Array<[string, JsonSchema]> = []): Array<[string, JsonSchema]> {
  if (schema !== null && typeof schema === "object" && !Array.isArray(schema)) {
    found.push([path, schema as JsonSchema]);
    for (const [key, value] of Object.entries(schema)) {
      if (key === "properties") {
        for (const [name, inner] of Object.entries(value as object)) walk(inner, `${path}/properties/${name}`, found);
      } else if (key === "items" || key === "not") walk(value, `${path}/${key}`, found);
      else if (key === "anyOf" || key === "allOf") (value as unknown[]).forEach((inner, i) => walk(inner, `${path}/${key}/${i}`, found));
    }
  }
  return found;
}

const objects = (schema: JsonSchema) => walk(schema).filter(([, node]) => node["properties"] !== undefined);
const keywordsIn = (schema: JsonSchema) => new Set(walk(schema).flatMap(([, node]) => Object.keys(node)));

describe("published schema (GSV-REQ-007, GSV-REQ-008, GSV-REQ-009; AD-006)", () => {
  it("is JSON Schema 2020-12 with a root anyOf of one closed object per type, selected by a type constant", () => {
    expect(published["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
    const types = published["anyOf"] as JsonSchema[];
    expect(types.map((type) => (type["properties"] as Record<string, JsonSchema>)["type"]!["const"])).toEqual([
      "number-line",
      "xy-graph",
      "circle",
    ]);
    for (const type of types) {
      expect(type["type"]).toBe("object");
      expect(type["additionalProperties"]).toBe(false);
    }
  });

  it("closes every object and never uses oneOf or a discriminator", () => {
    for (const [path, node] of objects(published)) expect(node["additionalProperties"], path).toBe(false);
    expect(keywordsIn(published).has("oneOf")).toBe(false);
    expect(keywordsIn(published).has("discriminator")).toBe(false);
  });

  it("requires only the required properties, and leaves version optional", () => {
    const xy = (published["anyOf"] as JsonSchema[])[1]!;
    expect(xy["required"]).toEqual(["type", "xAxis", "yAxis"]);
    const axis = (xy["properties"] as Record<string, JsonSchema>)["xAxis"]!;
    expect(axis["required"]).toEqual(["min", "max"]);
  });

  it("describes every type and every property", () => {
    for (const [path, node] of walk(published)) {
      if (path === "#" || node["properties"] !== undefined || node["type"] !== undefined || node["const"] !== undefined) {
        expect(typeof node["description"], path).toBe("string");
        expect((node["description"] as string).length, path).toBeGreaterThan(5);
      }
    }
  });

  it("maps each kind to its JSON Schema keywords", () => {
    const circle = (published["anyOf"] as JsonSchema[])[2]!;
    const properties = circle["properties"] as Record<string, JsonSchema>;
    expect(properties["radius"]).toMatchObject({ type: "number", minimum: 0.000001, maximum: 1_000_000 });
    expect(properties["shadedFraction"]).toMatchObject({ type: "number", minimum: 0, exclusiveMaximum: 1 });
    expect(properties["lineColor"]).toMatchObject({ type: "string", pattern: COLOR_PATTERN });
    expect(properties["version"]).toMatchObject({ const: 1 });
    const numberLine = (published["anyOf"] as JsonSchema[])[0]!["properties"] as Record<string, JsonSchema>;
    expect(numberLine["arrowheads"]).toMatchObject({ type: "string", enum: ["none", "left", "right", "both"] });
    expect(numberLine["tickCount"]).toMatchObject({ type: "integer", minimum: 1, maximum: 100 });
    expect(numberLine["points"]).toMatchObject({ type: "array", maxItems: 1000, items: { type: "object" } });
    expect(numberLine["title"]!["description"]).toContain("Plain text");
    expect(numberLine["axis"]!["description"]).toContain("max must be greater than min.");
  });

  it("requires one member of a required derivation group (DEL-005)", () => {
    const circle = (published["anyOf"] as JsonSchema[])[2]!;
    expect(circle["anyOf"]).toEqual([{ required: ["radius"] }, { required: ["diameter"] }, { required: ["circumference"] }]);
    expect(circle["description"]).toContain("Give one of radius, diameter or circumference");
  });

  it("accepts exactly the colors resolveColor accepts", () => {
    const pattern = new RegExp(COLOR_PATTERN, "u");
    for (const value of ["blue", "Blue", "GRAY", "#abc", "#AABBCC", "#0072b2", "blurple", "#abcd", " blue", "", `blac${String.fromCharCode(0x212a)}`]) {
      expect(pattern.test(value), value).toBe(resolveColor(value) !== undefined);
    }
  });
});

describe("tool schema (AD-006, prd/IC-001)", () => {
  it("has an object root holding the description under graph", () => {
    expect(tool).toMatchObject({ type: "object", required: ["graph"], additionalProperties: false });
    expect(Object.keys(tool["properties"] as object)).toEqual(["graph"]);
    expect(((tool["properties"] as Record<string, JsonSchema>)["graph"]!["anyOf"] as unknown[]).length).toBe(3);
  });

  it("closes every object and requires every property", () => {
    for (const [path, node] of objects(tool)) {
      expect(node["additionalProperties"], path).toBe(false);
      expect([...(node["required"] as string[])].sort(), path).toEqual(Object.keys(node["properties"] as object).sort());
    }
  });

  it("makes optional properties nullable, and required ones not", () => {
    const circle = ((tool["properties"] as Record<string, JsonSchema>)["graph"]!["anyOf"] as JsonSchema[])[2]!;
    const properties = circle["properties"] as Record<string, JsonSchema>;
    expect(properties["radius"]!["type"]).toEqual(["number", "null"]);
    expect(properties["version"]).toMatchObject({ type: ["integer", "null"], enum: [1, null] });
    expect(properties["type"]).toMatchObject({ type: "string", enum: ["circle"] });
    const xy = ((tool["properties"] as Record<string, JsonSchema>)["graph"]!["anyOf"] as JsonSchema[])[1]!;
    const xAxis = (xy["properties"] as Record<string, JsonSchema>)["xAxis"]!;
    expect(xAxis["type"]).toBe("object");
    expect((xAxis["properties"] as Record<string, JsonSchema>)["tickSpacing"]!["type"]).toEqual(["number", "null"]);
    const numberLine = ((tool["properties"] as Record<string, JsonSchema>)["graph"]!["anyOf"] as JsonSchema[])[0]!;
    expect((numberLine["properties"] as Record<string, JsonSchema>)["arrowheads"]!["enum"]).toEqual(["none", "left", "right", "both", null]);
  });

  it("uses none of the keywords strict providers reject", () => {
    const used = keywordsIn(tool);
    for (const keyword of ["oneOf", "if", "then", "else", "patternProperties", "format", "discriminator", "$ref", "allOf", "const"]) {
      expect(used.has(keyword), keyword).toBe(false);
    }
  });
});

describe("vocabulary (GSV-REQ-013, GSV-REQ-014, GSV-REQ-035)", () => {
  it("defines every term once, with its kind", () => {
    expect(vocabulary.terms["radius"]).toEqual({ definition: "The distance from the center to the edge.", kind: "number" });
    expect(vocabulary.terms["title"]?.kind).toBe("string");
    expect(Object.keys(vocabulary.terms)).toEqual([...Object.keys(vocabulary.terms)].sort());
  });

  it("lists per type each term's required flag, kind, range, values, limits and nesting", () => {
    const xy = vocabulary.graphTypes["xy-graph"]!;
    expect(xy.properties["xAxis"]).toMatchObject({ kind: "object", required: true, ordered: [["min", "max"]] });
    expect(xy.properties["xAxis"]!.properties!["tickSpacing"]).toEqual({ kind: "number", required: false, range: { min: 0, exclusiveMin: true } });
    expect(xy.properties["points"]).toMatchObject({ kind: "array", required: false, maxItems: 1000, items: { kind: "object" } });
    expect(vocabulary.graphTypes["number-line"]!.properties["arrowheads"]).toMatchObject({ values: ["none", "left", "right", "both"] });
    expect(xy.checks).toEqual(["points inside the axes"]);
  });

  it("publishes derivation groups with members in defining order, description and required", () => {
    expect(vocabulary.graphTypes.circle!.derivations).toEqual([
      { members: ["radius", "diameter", "circumference"], description: "diameter = 2 × radius; circumference = 2π × radius", required: true },
    ]);
  });

  it("publishes colors and limits, and never the internal applicability fields", () => {
    expect(vocabulary.colors["blue"]).toBe("#0072b2");
    expect(vocabulary.limits.descriptionValues).toBe(10_000);
    expect(JSON.stringify(vocabulary)).not.toMatch(/appliesTo|elementsOf|presentation/);
    expect(JSON.stringify(published)).not.toMatch(/appliesTo|elementsOf/);
  });

  it("is plain JSON data", () => {
    expect(JSON.parse(JSON.stringify(vocabulary))).toEqual(vocabulary);
  });
});

describe("generated files and getters (GSV-REQ-010, GSV-REQ-015)", () => {
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

  it("are committed exactly as a fresh build writes them", () => {
    expect(read("src/generated/schema.json")).toBe(json(buildSchema(definitions)));
    expect(read("src/generated/tool-schema.json")).toBe(json(buildToolSchema(definitions)));
    expect(read("src/generated/vocabulary.json")).toBe(json(buildVocabulary(definitions)));
    expect(read("src/generated/description.ts")).toBe(buildDescriptionTypes(definitions));
    expect(read("tests/fixtures/generated/description.ts")).toBe(buildDescriptionTypes(fixtureRegistry));
  });

  it("describe zero types while none is registered", () => {
    expect(buildSchema({})).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Graph description",
      description: "No graph types are registered yet.",
      not: {},
    });
    expect(buildDescriptionTypes({})).toContain("export type GraphDescription = never;");
    expect(buildVocabulary({}).graphTypes).toEqual({});
  });

  it("are served by getters from ./core, frozen and identical to the files", () => {
    expect(getSchema()).toEqual(buildSchema(definitions));
    expect(getToolSchema()).toEqual(buildToolSchema(definitions));
    expect(getVocabulary()).toEqual(buildVocabulary(definitions));
    expect(getSchema()).toBe(getSchema());
    expect(Object.isFrozen(getVocabulary())).toBe(true);
    expect(typedExamples.length).toBe(3);
  });
});
