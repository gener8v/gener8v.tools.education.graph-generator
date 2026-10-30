import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { definitions, propertiesOf } from "../../src/core/definitions/index";
import { GRAPH_TYPES, type ValueSpec } from "../../src/core/definitions/types";
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

/** The envelope's own terms, published beside the graph types' terms. */
const ENVELOPE_TERMS = ["type", "version"] as const;

/**
 * What the definitions themselves declare, independent of the generated files (code review CR-001,
 * quality review QR-001, security review SEC-001): every term of every registered type, nested
 * terms included, with the envelope's; and how many string values (terms and list items) they hold.
 */
function declared(): { terms: Set<string>; strings: number } {
  const terms = new Set<string>(ENVELOPE_TERMS);
  let strings = 0;
  const visit = (spec: ValueSpec & { term?: string }): void => {
    if (spec.term !== undefined) terms.add(spec.term);
    if (spec.kind === "string") strings++;
    if (spec.kind === "object") for (const child of Object.values(spec.properties)) visit(child);
    if (spec.kind === "array") visit(spec.items);
  };
  for (const type of GRAPH_TYPES) for (const spec of Object.values(propertiesOf(type, definitions))) visit(spec);
  return { terms, strings };
}
const DECLARED = declared();

/**
 * Every vocabulary term, issue code and graph type whose documentation is missing or blank, each
 * named by kind and key. A graph type is also reported when the vocabulary has no entry for it.
 */
function undocumented(
  published: PublishedVocabulary,
  docs: Readonly<Record<string, string | undefined>>,
  types: readonly string[] = GRAPH_TYPES,
  codes: readonly string[] = ISSUE_CODES,
  terms: Iterable<string> = DECLARED.terms,
): string[] {
  const gaps: string[] = [];
  // Every declared term, so a term dropped from the vocabulary is reported too (code review CR-001).
  for (const term of terms) if (blank(Object.hasOwn(published.terms, term) ? published.terms[term]?.definition : undefined)) gaps.push(`term ${term}`);
  for (const code of codes) if (blank(docs[code])) gaps.push(`issue code ${code}`);
  for (const type of types) if (blank(published.graphTypes[type]?.description)) gaps.push(`graph type ${type}`);
  return gaps;
}

describe("GSV-REQ-003: exactly the supported graph types", () => {
  it("registers a definition for every graph type, and no other", () => {
    expect(new Set(Object.keys(definitions))).toEqual(new Set(GRAPH_TYPES));
  });

  it("registers a layout for every graph type, and no other", () => {
    expect(new Set(Object.keys(layouts))).toEqual(new Set(GRAPH_TYPES));
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
    });
  }
});

describe("GSV-NFR-005: every term, issue code and graph type is documented", () => {
  it("finds no undocumented entry in the published data", () => {
    expect(undocumented(vocabulary, issueDocs)).toEqual([]);
  });

  it("publishes exactly the terms the definitions declare, never an empty list (code review CR-001; security review SEC-001)", () => {
    expect(DECLARED.terms.size).toBeGreaterThan(ENVELOPE_TERMS.length);
    expect(new Set(Object.keys(vocabulary.terms))).toEqual(DECLARED.terms);
  });

  it("reports a declared term the vocabulary dropped (code review CR-001)", () => {
    const [dropped] = [...DECLARED.terms];
    const terms = { ...vocabulary.terms };
    delete terms[dropped!];
    expect(undocumented({ ...vocabulary, terms }, issueDocs)).toEqual([`term ${dropped}`]);
  });

  it("reports a blank term, issue code and graph type in a broken copy", () => {
    const [firstTerm] = [...DECLARED.terms] as [string];
    const code = ISSUE_CODES[0];
    const type = GRAPH_TYPES[0];
    const broken: PublishedVocabulary = {
      terms: { ...vocabulary.terms, [firstTerm]: { definition: "   " } },
      graphTypes: { ...vocabulary.graphTypes, [type]: { description: "" } },
    };
    expect(undocumented(broken, { ...issueDocs, [code]: " " })).toEqual([`term ${firstTerm}`, `issue code ${code}`, `graph type ${type}`]);
  });

  it("reports a graph type or issue code missing altogether", () => {
    expect(undocumented({ terms: {}, graphTypes: {} }, {}, ["circle"], ["wrong_kind"], [])).toEqual(["issue code wrong_kind", "graph type circle"]);
  });
});

/** The string values under `graphTypes` without a numeric `maxLength`, and how many string values it holds in all. */
function stringLimits(graphTypes: Json): { missing: string[]; visited: number } {
  const missing: string[] = [];
  let visited = 0;
  const walk = (node: Json, path: string): void => {
    if (Array.isArray(node)) node.forEach((item, index) => walk(item, `${path}/${index}`));
    else if (node !== null && typeof node === "object") {
      if (node.kind === "string") {
        visited++;
        if (typeof node.maxLength !== "number") missing.push(path);
      }
      for (const [key, child] of Object.entries(node)) walk(child, `${path}/${key}`);
    }
  };
  walk(graphTypes, "");
  return { missing, visited };
}

describe("GSV-NFR-005: every string term shows its limit", () => {
  it("gives every string property of every graph type a maxLength, checking every one the definitions declare", () => {
    const { missing, visited } = stringLimits(vocabulary.graphTypes as unknown as Json);
    expect(missing).toEqual([]);
    // As many as the definitions hold, so a renamed field cannot leave nothing checked (quality review QR-001, security review SEC-001).
    expect(DECLARED.strings).toBeGreaterThan(0);
    expect(visited).toBe(DECLARED.strings);
  });

  it("reports a string property whose maxLength was removed, in a broken copy", () => {
    const copy = JSON.parse(JSON.stringify(vocabulary.graphTypes)) as Json;
    let removed = false;
    const strip = (node: Json): void => {
      if (removed || node === null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(strip);
      if (node.kind === "string" && typeof node.maxLength === "number") {
        delete node.maxLength;
        removed = true;
        return;
      }
      for (const child of Object.values(node)) strip(child);
    };
    strip(copy);
    expect(removed).toBe(true);
    expect(stringLimits(copy).missing).toHaveLength(1);
  });
});
