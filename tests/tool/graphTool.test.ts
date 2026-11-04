import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { definitions, registeredTypes } from "../../src/core/definitions/index";
import { getToolSchema } from "../../src/core/schema";
import { graphTool } from "../../src/tool/index";
import { createAjv } from "../helpers/ajv";
import { anthropic } from "./provider-rules/anthropic";
import { google } from "./provider-rules/google";
import { openaiStrict } from "./provider-rules/openai-strict";

type Schema = Record<string, unknown>;

const generated = JSON.parse(readFileSync(new URL("../../src/generated/tool-schema.json", import.meta.url), "utf8")) as Schema;
const schema = graphTool.inputSchema as Schema;

/** Every schema object inside `root`, with how many objects enclose it (the root object is level 1). */
function subschemas(root: Schema): Array<{ schema: Schema; path: string; objectLevel: number }> {
  const found: Array<{ schema: Schema; path: string; objectLevel: number }> = [];
  const visit = (node: Schema, path: string, enclosing: number) => {
    const isObject = ([] as unknown[]).concat(node["type"]).includes("object");
    const level = isObject ? enclosing + 1 : enclosing;
    found.push({ schema: node, path, objectLevel: level });
    for (const [name, child] of Object.entries((node["properties"] as Record<string, Schema> | undefined) ?? {})) visit(child, `${path}/properties/${name}`, level);
    if (node["items"] !== undefined) visit(node["items"] as Schema, `${path}/items`, level);
    for (const [index, branch] of ((node["anyOf"] as Schema[] | undefined) ?? []).entries()) visit(branch, `${path}/anyOf/${index}`, enclosing);
  };
  visit(root, "", 0);
  return found;
}

const all = subschemas(schema);
const keywords = new Set(all.flatMap(({ schema: node }) => Object.keys(node)));
const objects = all.filter(({ schema: node }) => ([] as unknown[]).concat(node["type"]).includes("object"));
const enums = all.flatMap(({ schema: node }) => (node["enum"] as unknown[] | undefined) ?? []);
/** Parameters typed as a union: a type array, or an `anyOf`. */
const unionTyped = all.filter(({ schema: node }) => Array.isArray(node["type"]) || node["anyOf"] !== undefined);

describe("graphTool (CPSE-REQ-027, CPSE-REQ-028)", () => {
  it("is a frozen { name, description, inputSchema } named generate_graph, with a plain-English description", () => {
    expect(Object.keys(graphTool)).toEqual(["name", "description", "inputSchema"]);
    expect(graphTool.name).toBe("generate_graph");
    expect(graphTool.description).toMatch(/^[A-Z][^\n]{100,}\.$/);
    expect(Object.isFrozen(graphTool)).toBe(true);
    expect(Object.isFrozen(graphTool.inputSchema)).toBe(true);
  });

  it("names every registered graph type in its description, in the words it uses (CR-003)", () => {
    // The phrase for each type, as the description says it. The table must cover exactly the registry's
    // types, so a new type fails here until it has a phrase, and the description has it.
    const phrases: Record<string, string> = {
      "number-line": "number line",
      ruler: "ruler",
      "xy-graph": "x,y or x,y,z coordinate graph",
      "xyz-graph": "x,y or x,y,z coordinate graph",
      "line-graph": "line graph",
      "bar-graph": "bar graph",
      pictograph: "pictograph",
      circle: "circle",
      square: "square",
      triangle: "triangle",
      cube: "cube",
      cylinder: "cylinder",
    };
    expect(Object.keys(phrases).sort()).toEqual([...registeredTypes(definitions)].sort());
    for (const [type, phrase] of Object.entries(phrases)) expect(graphTool.description, type).toContain(phrase);
  });

  it("takes its input schema from the generated tool schema, never a hand-written copy", () => {
    expect(graphTool.inputSchema).toBe(getToolSchema());
    expect(graphTool.inputSchema).toEqual(generated);
  });
});

describe("the tool input schema is valid JSON Schema 2020-12 (CPSE-NFR-004)", () => {
  // The tool schema declares no `$schema` (AD-006 emits it in the 2020-12 dialect of the published
  // schema, and leaves the keyword out of what a provider receives), so it is checked against
  // 2020-12, the dialect its generator writes.
  it("declares no other dialect and validates against the 2020-12 meta-schema", () => {
    expect(keywords.has("$schema")).toBe(false);
    const ajv = createAjv();
    expect(ajv.validateSchema(schema), JSON.stringify(ajv.errors)).toBe(true);
    expect(() => ajv.compile(schema)).not.toThrow();
  });
});

describe("provider rules, as documented on the date checked (TQ-002, prd/IC-001)", () => {
  it("each rule file cites its sources and the date it was checked", () => {
    for (const rules of [anthropic, openaiStrict, google]) {
      expect(rules.checked).toBe("2026-11-04");
      expect(rules.sources.length).toBeGreaterThan(0);
      for (const source of rules.sources) expect(source).toMatch(/^https:\/\//);
    }
  });

  describe(anthropic.mode, () => {
    it("has a name the API accepts and an input schema that is a JSON Schema object", () => {
      expect(graphTool.name).toMatch(anthropic.namePattern);
      expect(schema["type"]).toBe("object");
    });

    it("is outside the strict subset, which the README documents as unsupported", () => {
      // Shown, not wished away: if this fails, the schema now fits strict mode and the README is out of date.
      expect(anthropic.strictMode.unsupportedKeywords.filter((keyword) => keywords.has(keyword))).toEqual(["minimum", "maximum", "maxLength", "maxItems"]);
      expect(unionTyped.length).toBeGreaterThan(anthropic.strictMode.maxUnionTypedParameters);
    });
  });

  describe(openaiStrict.mode, () => {
    it("has an object root that does not use anyOf", () => {
      expect(schema["type"]).toBe("object");
      expect(schema["anyOf"]).toBeUndefined();
    });

    it("closes every object and lists every property as required", () => {
      for (const { schema: node, path } of objects) {
        expect(node["additionalProperties"], path).toBe(false);
        expect([...(node["required"] as string[])].sort(), path).toEqual(Object.keys(node["properties"] as object).sort());
      }
    });

    it("is within the documented size limits", () => {
      const properties = objects.flatMap(({ schema: node }) => Object.keys(node["properties"] as object));
      expect(properties.length).toBeLessThanOrEqual(openaiStrict.maxObjectProperties);
      expect(Math.max(...all.map(({ objectLevel }) => objectLevel))).toBeLessThanOrEqual(openaiStrict.maxNestingLevels);
      const characters = [...properties, ...enums.filter((value): value is string => typeof value === "string")].join("").length;
      expect(characters).toBeLessThanOrEqual(openaiStrict.maxNameAndEnumCharacters);
      expect(enums.length).toBeLessThanOrEqual(openaiStrict.maxEnumValues);
      for (const { schema: node, path } of all) {
        const values = (node["enum"] as unknown[] | undefined) ?? [];
        if (values.length > openaiStrict.largeEnum.values) expect(values.join("").length, path).toBeLessThanOrEqual(openaiStrict.largeEnum.maxCharacters);
      }
    });

    it("uses no unsupported keyword, and no keyword the guide does not name beyond the recorded ones", () => {
      for (const keyword of openaiStrict.unsupportedKeywords) expect(keywords.has(keyword), keyword).toBe(false);
      const named = new Set<string>([...openaiStrict.documentedKeywords, ...openaiStrict.undocumentedKeywords]);
      expect([...keywords].filter((keyword) => !named.has(keyword))).toEqual([]);
    });
  });

  describe(google.mode, () => {
    it("describes an object whose properties are the parameters", () => {
      expect(schema["type"]).toBe("object");
      expect(Object.keys(schema["properties"] as object)).toEqual(["graph"]);
    });

    it("writes null as a type array, never OpenAPI's nullable", () => {
      expect(keywords.has("nullable")).toBe(false);
      expect(all.some(({ schema: node }) => Array.isArray(node["type"]) && (node["type"] as unknown[]).includes("null"))).toBe(google.nullAsTypeArray);
    });

    it("uses only keywords the documentation names, ignores, or the rule file records as undocumented", () => {
      const named = new Set<string>([...google.documentedKeywords, ...google.ignoredKeywords, ...google.undocumentedKeywords]);
      expect([...keywords].filter((keyword) => !named.has(keyword))).toEqual([]);
    });
  });
});
