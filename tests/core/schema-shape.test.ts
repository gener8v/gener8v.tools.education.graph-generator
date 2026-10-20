import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { generatedFiles } from "../../scripts/generated-files";
import { type Registry, definitions, propertiesOf, registeredTypes } from "../../src/core/definitions/index";
import type { PropertyMap } from "../../src/core/definitions/types";
import { PLAIN_TEXT_PATTERN, findUnsafeTextChar } from "../../src/core/format";
import { getSchema, getToolSchema, getVocabulary } from "../../src/core/index";
import { COLOR_PATTERN, type JsonSchema, buildDescriptionTypes, buildSchema, buildToolSchema, buildVocabulary } from "../../src/core/schema";
import { resolveColor } from "../../src/core/style";
import { conditionalRegistry } from "../fixtures/definitions/conditional-ruler";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import { createAjv } from "../helpers/ajv";

const published = buildSchema(fixtureRegistry);
const tool = buildToolSchema(fixtureRegistry);
const vocabulary = buildVocabulary(fixtureRegistry);
const ajv = createAjv();

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
const graphTypes = (schema: JsonSchema) => ((schema["properties"] as Record<string, JsonSchema>)["graph"]!["anyOf"] as JsonSchema[] | undefined) ?? [];
const propertiesIn = (node: JsonSchema) => node["properties"] as Record<string, JsonSchema>;

/** Every property node that should carry a description. */
function described(schema: JsonSchema): Array<[string, JsonSchema]> {
  return walk(schema).filter(([path, node]) => path === "#" || /\/properties\/[^/]+$/.test(path) || node["title"] !== undefined);
}

/** A description in tool form: wrapped in `graph`, with `null` for every absent optional property. */
function toolForm(description: Record<string, unknown>, registry: Registry): unknown {
  const fill = (value: Record<string, unknown>, properties: PropertyMap): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...value };
    for (const spec of Object.values(properties)) {
      const inner = out[spec.term];
      if (inner === undefined) out[spec.term] = null;
      else if (spec.kind === "object") out[spec.term] = fill(inner as Record<string, unknown>, spec.properties);
      else if (spec.kind === "array" && spec.items.kind === "object") {
        const items = spec.items;
        out[spec.term] = (inner as Array<Record<string, unknown>>).map((element) => fill(element, items.properties));
      }
    }
    return out;
  };
  const type = description["type"] as Parameters<typeof propertiesOf>[0];
  return { graph: { version: null, ...fill(description, propertiesOf(type, registry)) } };
}

describe("published schema (GSV-REQ-007, GSV-REQ-008, GSV-REQ-009; AD-006)", () => {
  it("is JSON Schema 2020-12 with a root anyOf of one closed object per type, selected by a type constant", () => {
    expect(published["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
    const types = published["anyOf"] as JsonSchema[];
    expect(types.map((type) => propertiesIn(type)["type"]!["const"])).toEqual(["number-line", "xy-graph", "circle"]);
    for (const type of types) expect(type).toMatchObject({ type: "object", additionalProperties: false });
  });

  it("closes every object and never uses oneOf or a discriminator", () => {
    for (const [path, node] of objects(published)) expect(node["additionalProperties"], path).toBe(false);
    expect(keywordsIn(published).has("oneOf")).toBe(false);
    expect(keywordsIn(published).has("discriminator")).toBe(false);
  });

  it("requires only the required properties, and leaves version optional", () => {
    const xy = (published["anyOf"] as JsonSchema[])[1]!;
    expect(xy["required"]).toEqual(["type", "xAxis", "yAxis"]);
    expect(propertiesIn(xy)["xAxis"]!["required"]).toEqual(["min", "max"]);
    expect(propertiesIn(xy)["version"]).toMatchObject({ enum: [1] });
  });

  it("describes every type and every property", () => {
    for (const [path, node] of described(published)) {
      expect(typeof node["description"], path).toBe("string");
      expect((node["description"] as string).length, path).toBeGreaterThan(5);
    }
  });

  it("states the shared rules once, at the root, not on every property (quality review QR-008)", () => {
    expect(published["description"]).toContain("Text is plain text");
    expect(published["description"]).toContain("A color is a color name (black, gray");
    expect(published["description"]).toContain("agree on the JSON form");
    const descriptions = described(published).map(([, node]) => node["description"] as string);
    expect(descriptions.filter((text) => text.includes("Text is plain text"))).toHaveLength(1);
  });

  it("maps each kind to its JSON Schema keywords", () => {
    const circle = propertiesIn((published["anyOf"] as JsonSchema[])[2]!);
    expect(circle["radius"]).toMatchObject({ type: "number", minimum: 0.000001, maximum: 1_000_000 });
    expect(circle["shadedFraction"]).toMatchObject({ type: "number", minimum: 0, exclusiveMaximum: 1 });
    expect(circle["lineColor"]).toMatchObject({ type: "string", pattern: COLOR_PATTERN });
    expect(circle["unit"]).toMatchObject({ type: "string", pattern: PLAIN_TEXT_PATTERN });
    const numberLine = propertiesIn((published["anyOf"] as JsonSchema[])[0]!);
    expect(numberLine["arrowheads"]).toMatchObject({ type: "string", enum: ["none", "left", "right", "both"] });
    expect(numberLine["tickCount"]).toMatchObject({ type: "integer", minimum: 1, maximum: 100 });
    expect(numberLine["points"]).toMatchObject({ type: "array", maxItems: 1000, items: { type: "object" } });
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

  it("checks plain text with a pattern that never rejects what the validator accepts, with or without the u flag (security review SEC-001)", () => {
    for (const flags of ["u", ""]) {
      const pattern = new RegExp(PLAIN_TEXT_PATTERN, flags);
      fc.assert(
        fc.property(fc.string({ unit: "binary", maxLength: 16 }), (text) => findUnsafeTextChar(text) !== -1 || pattern.test(text)),
        { numRuns: 20_000 },
      );
      for (const code of [0x00, 0x0a, 0x1b, 0x9b, 0xad, 0x200b, 0x2028, 0x202e, 0x2067, 0xfeff]) {
        expect(pattern.test(`a${String.fromCharCode(code)}b`), `U+${code.toString(16)} with flags "${flags}"`).toBe(false);
      }
      for (const text of ["Fractions", "{1, 2, 3}", `${String.fromCodePoint(0x1f469, 0x200d, 0x1f3eb)} teacher`, "数轴"]) {
        expect(pattern.test(text), text).toBe(true);
      }
    }
  });
});

describe("tool schema (AD-006, prd/IC-001)", () => {
  const FORBIDDEN = ["oneOf", "if", "then", "else", "patternProperties", "format", "discriminator", "$ref", "allOf", "const", "not"];

  for (const [name, registry] of [
    ["fixture types", fixtureRegistry],
    ["registered types", definitions],
  ] as const) {
    describe(`for the ${name}`, () => {
      const schema = buildToolSchema(registry);

      it("has an object root holding the description under graph", () => {
        expect(schema).toMatchObject({ type: "object", required: ["graph"], additionalProperties: false });
        expect(Object.keys(propertiesIn(schema))).toEqual(["graph"]);
        expect(graphTypes(schema)).toHaveLength(registeredTypes(registry).length);
      });

      it("closes every object and requires every property", () => {
        for (const [path, node] of objects(schema)) {
          expect(node["additionalProperties"], path).toBe(false);
          expect([...(node["required"] as string[])].sort(), path).toEqual(Object.keys(node["properties"] as object).sort());
        }
      });

      it("uses none of the keywords strict providers reject (code review CR-006)", () => {
        const used = keywordsIn(schema);
        for (const keyword of FORBIDDEN) expect(used.has(keyword), keyword).toBe(false);
      });

      it("describes every property (quality review QR-004)", () => {
        for (const [path, node] of described(schema)) {
          if (path === "#") continue;
          expect(typeof node["description"], path).toBe("string");
        }
      });
    });
  }

  it("makes optional properties nullable, and required ones not", () => {
    const circle = propertiesIn(graphTypes(tool)[2]!);
    expect(circle["radius"]!["type"]).toEqual(["number", "null"]);
    expect(circle["version"]).toMatchObject({ type: ["integer", "null"], enum: [1, null] });
    expect(circle["type"]).toMatchObject({ type: "string", enum: ["circle"] });
    const xAxis = propertiesIn(graphTypes(tool)[1]!)["xAxis"]!;
    expect(xAxis["type"]).toBe("object");
    expect(propertiesIn(xAxis)["tickSpacing"]!["type"]).toEqual(["number", "null"]);
    expect(propertiesIn(graphTypes(tool)[0]!)["arrowheads"]!["enum"]).toEqual(["none", "left", "right", "both", null]);
  });

  it("accepts every example in tool form, and rejects null for a required property or an unknown key (quality review QR-004)", () => {
    const accepts = ajv.compile(tool);
    for (const example of fixtureExamples) {
      const form = toolForm(example as Record<string, unknown>, fixtureRegistry);
      expect(accepts(form), `${example.type}: ${JSON.stringify(accepts.errors)}`).toBe(true);
    }
    const circle = toolForm({ type: "circle", radius: 2 }, fixtureRegistry) as { graph: Record<string, unknown> };
    expect(accepts(circle)).toBe(true);
    expect(accepts({ graph: { ...circle.graph, type: null } })).toBe(false);
    expect(accepts({ graph: { ...circle.graph, sparkle: 1 } })).toBe(false);
    expect(accepts({ ...circle, extra: 1 })).toBe(false);
  });

  it("stays within the strict profile with no type registered", () => {
    expect(buildToolSchema({})).toEqual({
      type: "object",
      properties: { graph: { type: "object", description: "No graph types are registered yet.", properties: {}, required: [], additionalProperties: false } },
      required: ["graph"],
      additionalProperties: false,
    });
  });
});

describe("vocabulary (GSV-REQ-012, GSV-REQ-013, GSV-REQ-014, GSV-REQ-035)", () => {
  it("defines every term once, with its kind, including type and version (code review CR-002)", () => {
    expect(vocabulary.terms["radius"]).toEqual({ definition: "The distance from the center to the edge.", kind: "number" });
    expect(vocabulary.terms["type"]?.kind).toBe("enum");
    expect(vocabulary.terms["version"]?.kind).toBe("integer");
    expect(Object.keys(vocabulary.terms)).toEqual([...Object.keys(vocabulary.terms)].sort());
  });

  it("lists every term each type accepts, the envelope included", () => {
    for (const type of registeredTypes(fixtureRegistry)) {
      const listed = Object.keys(vocabulary.graphTypes[type]!.properties).sort();
      expect(listed, type).toEqual(["type", "version", ...Object.keys(propertiesOf(type, fixtureRegistry))].sort());
    }
    expect(vocabulary.graphTypes.circle!.properties["type"]).toEqual({ kind: "enum", required: true, values: ["circle"] });
    expect(vocabulary.graphTypes.circle!.properties["version"]).toEqual({ kind: "integer", required: false, range: { min: 1, max: 1 } });
    expect(vocabulary.descriptionVersions).toEqual([1]);
  });

  it("lists per type each term's required flag, kind, range, values, value descriptions, limits and nesting", () => {
    const xy = vocabulary.graphTypes["xy-graph"]!;
    expect(xy.properties["xAxis"]).toMatchObject({ kind: "object", required: true, ordered: [["min", "max"]] });
    expect(xy.properties["xAxis"]!.properties!["tickSpacing"]).toEqual({ kind: "number", required: false, range: { min: 0, exclusiveMin: true } });
    expect(xy.properties["points"]).toMatchObject({ kind: "array", required: false, maxItems: 1000, items: { kind: "object" } });
    expect(vocabulary.graphTypes["number-line"]!.properties["arrowheads"]).toMatchObject({
      values: ["none", "left", "right", "both"],
      valueDescriptions: { none: "No arrowheads.", both: "An arrowhead at each end." },
    });
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

  it("keeps every term when Object.prototype is polluted (security review SEC-002)", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    prototype["radius"] = { definition: "polluted", kind: "string" };
    prototype["title"] = 1;
    try {
      const polluted = buildVocabulary(fixtureRegistry);
      expect(Object.keys(polluted.terms)).toEqual(Object.keys(vocabulary.terms));
      expect(polluted.terms["radius"]).toEqual(vocabulary.terms["radius"]);
    } finally {
      delete prototype["radius"];
      delete prototype["title"];
    }
  });

  it("is plain JSON data", () => {
    expect(JSON.parse(JSON.stringify(vocabulary))).toEqual(vocabulary);
  });
});

describe("generated types (GSV-REQ-015)", () => {
  // The fixture examples are literals checked against these generated types in
  // tests/fixtures/definitions/index.ts (`satisfies`), so typecheck fails if an example's property
  // is missing from them. This test checks every term, used by an example or not (QR-003).
  const source = buildDescriptionTypes(fixtureRegistry);

  it("declares every term at every depth, optional exactly when the term is", () => {
    const missing: string[] = [];
    const visit = (properties: PropertyMap, indent: string) => {
      for (const spec of Object.values(properties)) {
        const member = `\n${indent}${spec.term}${spec.required ? "" : "?"}: `;
        if (!source.includes(member)) missing.push(`${indent.length / 2}:${spec.term}${spec.required ? "" : "?"}`);
        if (spec.kind === "object") visit(spec.properties, `${indent}  `);
        if (spec.kind === "array" && spec.items.kind === "object") visit(spec.items.properties, `${indent}  `);
      }
    };
    for (const type of registeredTypes(fixtureRegistry)) visit(propertiesOf(type, fixtureRegistry), "  ");
    expect(missing).toEqual([]);
    expect(source).toContain("\n  type: \"circle\";\n");
    expect(source).toContain("\n  version?: 1;\n");
  });

  it("is never while no type is registered", () => {
    expect(buildDescriptionTypes({})).toContain("export type GraphDescription = never;");
  });
});

describe("generated files and getters (GSV-REQ-010, GSV-REQ-015)", () => {
  it("are committed exactly as a fresh build writes them", () => {
    for (const [path, content] of Object.entries(generatedFiles())) {
      expect(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), path).toBe(content);
    }
  });

  it("describe zero types while none is registered", () => {
    expect(buildSchema({})).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Graph description",
      description: "No graph types are registered yet.",
      not: {},
    });
    expect(buildVocabulary({}).graphTypes).toEqual({});
  });

  it("are served by getters from ./core, frozen, read-only in type, and identical to the files", () => {
    expect(getSchema()).toEqual(buildSchema(definitions));
    expect(getToolSchema()).toEqual(buildToolSchema(definitions));
    expect(getVocabulary()).toEqual(buildVocabulary(definitions));
    expect(getSchema()).toBe(getSchema());
    expect(Object.isFrozen(getVocabulary())).toBe(true);
    expect(() => {
      // @ts-expect-error The getters' results are read-only (quality review QR-007).
      getVocabulary().colors["teal"] = "#008080";
    }).toThrow(TypeError);
  });
});

describe("terms with fixed lists and conditions in the published vocabulary and schemas (GSV-REQ-049..051, rulers GSV TICKET-001)", () => {
  it("publishes each fixed list with its value descriptions, and each condition on a term", () => {
    const ruler = buildVocabulary(conditionalRegistry).graphTypes.ruler!;
    expect(ruler.properties["unit"]).toMatchObject({
      kind: "enum",
      values: ["centimeters", "inches"],
      valueDescriptions: { centimeters: "Marked in centimetres and millimetres.", inches: "Marked in inches and fractions of an inch." },
    });
    expect(ruler.properties["smallestDivision"]).toMatchObject({
      kind: "enum",
      values: ["half", "quarter", "eighth", "sixteenth"],
      appliesWhen: { term: "unit", values: ["inches"] },
    });
    expect(ruler.properties["length"]!.appliesWhen).toBeUndefined();
  });

  it("keeps the conditional term out of the schemas' logic: both accept it, and the tool schema has no conditional keywords (AD-006, prd/IC-001)", () => {
    const ajv = createAjv();
    const description = { type: "ruler", unit: "centimeters", length: 6, smallestDivision: "half" };
    for (const schema of [buildSchema(conditionalRegistry), buildToolSchema(conditionalRegistry)]) {
      const text = JSON.stringify(schema);
      for (const keyword of ['"if"', '"then"', '"else"', '"dependentSchemas"', '"dependentRequired"']) expect(text).not.toContain(keyword);
    }
    // Validation is stricter than the schema here, never looser (GSV-NFR-003).
    expect(ajv.validate(buildSchema(conditionalRegistry), description)).toBe(true);
  });
});
