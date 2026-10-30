import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { definitions } from "../../src/core/definitions/index";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { ISSUE_CODES, issueDocs } from "../../src/core/issues";
import { validate } from "../../src/core/validate/index";
import { layouts } from "../../src/layout/registry";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const readJson = (path: string): Json => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as Json;

interface PublishedVocabulary {
  terms: Record<string, { definition?: unknown }>;
  graphTypes: Record<string, { description?: unknown }>;
}
const vocabulary = readJson("../../src/generated/vocabulary.json") as unknown as PublishedVocabulary;
const schema = readJson("../../src/generated/schema.json") as { anyOf: Array<{ properties: { type: { const: string } } }> };

const blank = (text: unknown): boolean => typeof text !== "string" || text.trim() === "";

/**
 * Every vocabulary term, issue code and graph type whose documentation is missing or blank, each
 * named by kind and key. A graph type is also reported when the vocabulary has no entry for it.
 */
function undocumented(
  published: PublishedVocabulary,
  docs: Readonly<Record<string, string | undefined>>,
  types: readonly string[] = GRAPH_TYPES,
  codes: readonly string[] = ISSUE_CODES,
): string[] {
  const gaps: string[] = [];
  for (const [term, entry] of Object.entries(published.terms)) if (blank(entry?.definition)) gaps.push(`term ${term}`);
  for (const code of codes) if (blank(docs[code])) gaps.push(`issue code ${code}`);
  for (const type of types) if (blank(published.graphTypes[type]?.description)) gaps.push(`graph type ${type}`);
  return gaps;
}

describe("GSV-REQ-003: exactly the supported graph types", () => {
  it("registers a definition for every graph type, and no other", () => {
    expect(new Set(Object.keys(definitions))).toEqual(new Set(GRAPH_TYPES));
    expect(Object.keys(definitions)).toHaveLength(GRAPH_TYPES.length);
  });

  it("registers a layout for every graph type, and no other", () => {
    expect(new Set(Object.keys(layouts))).toEqual(new Set(GRAPH_TYPES));
    expect(Object.keys(layouts)).toHaveLength(GRAPH_TYPES.length);
  });

  it("has one schema branch per graph type, each naming its type", () => {
    const named = schema.anyOf.map((branch) => branch.properties.type.const);
    expect(new Set(named)).toEqual(new Set(GRAPH_TYPES));
    expect(named).toHaveLength(GRAPH_TYPES.length);
  });

  it("publishes a vocabulary entry for every graph type, and no other", () => {
    expect(new Set(Object.keys(vocabulary.graphTypes))).toEqual(new Set(GRAPH_TYPES));
  });

  for (const type of GRAPH_TYPES) {
    it(`${type}: examples/${type}.json passes validate`, () => {
      const result = validate(readJson(`../../examples/${type}.json`));
      expect(result.valid ? [] : result.issues).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe("GSV-NFR-005: every term, issue code and graph type is documented", () => {
  it("finds no undocumented entry in the published data", () => {
    expect(undocumented(vocabulary, issueDocs)).toEqual([]);
  });

  it("reports a blank term, issue code and graph type in a broken copy", () => {
    const [firstTerm = ""] = Object.keys(vocabulary.terms);
    const code = ISSUE_CODES[0];
    const type = GRAPH_TYPES[0];
    const broken: PublishedVocabulary = {
      terms: { ...vocabulary.terms, [firstTerm]: { definition: "   " } },
      graphTypes: { ...vocabulary.graphTypes, [type]: { description: "" } },
    };
    expect(undocumented(broken, { ...issueDocs, [code]: " " })).toEqual([`term ${firstTerm}`, `issue code ${code}`, `graph type ${type}`]);
  });

  it("reports a graph type or issue code missing altogether", () => {
    expect(undocumented({ terms: {}, graphTypes: {} }, {}, ["circle"], ["wrong_kind"])).toEqual(["issue code wrong_kind", "graph type circle"]);
  });
});

describe("GSV-NFR-005: every string term shows its limit", () => {
  it("gives every string property of every graph type a maxLength", () => {
    const missing: string[] = [];
    const walk = (node: Json, path: string): void => {
      if (Array.isArray(node)) node.forEach((item, index) => walk(item, `${path}/${index}`));
      else if (node !== null && typeof node === "object") {
        if (node.kind === "string" && typeof node.maxLength !== "number") missing.push(path);
        for (const [key, child] of Object.entries(node)) walk(child, `${path}/${key}`);
      }
    };
    walk(vocabulary.graphTypes as unknown as Json, "");
    expect(missing).toEqual([]);
  });
});
