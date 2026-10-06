import { describe, expect, it } from "vitest";
import { definitions } from "../../src/core/definitions/index";
import { itemProperties, sharedProperties } from "../../src/core/definitions/shared";
import {
  GRAPH_TYPES,
  PROPERTY_KINDS,
  type DescriptionBase,
  type GraphType,
  type GraphTypeDefinition,
  type PropertyMap,
  type ValueSpec,
} from "../../src/core/definitions/types";

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;

/** Every vocabulary problem in a property map, nested objects and array items included. */
function vocabularyProblems(properties: PropertyMap, path = ""): string[] {
  const problems: string[] = [];
  for (const [key, spec] of Object.entries(properties)) {
    const at = `${path}/${key}`;
    if (spec.term !== key) problems.push(`${at}: key differs from its term ${JSON.stringify(spec.term)}`);
    if (!CAMEL_CASE.test(key)) problems.push(`${at}: not a camel-cased term`);
    problems.push(...valueProblems(spec, at));
  }
  return problems;
}

function valueProblems(spec: ValueSpec, at: string): string[] {
  const problems: string[] = [];
  if (!(PROPERTY_KINDS as readonly string[]).includes(spec.kind)) problems.push(`${at}: unknown kind ${JSON.stringify(spec.kind)}`);
  if (typeof spec.description !== "string" || spec.description.trim() === "") problems.push(`${at}: no description`);
  if (spec.kind === "object") problems.push(...vocabularyProblems(spec.properties, at));
  if (spec.kind === "array") problems.push(...valueProblems(spec.items, `${at}/items`));
  if (spec.kind === "enum" && spec.values.length === 0) problems.push(`${at}: enum with no values`);
  return problems;
}

/** A definition written for one type's own description shape, as a type ticket will write it. */
interface CircleFixture extends DescriptionBase {
  type: "circle";
  radius: number;
}

const circleFixture: GraphTypeDefinition<CircleFixture> = {
  type: "circle",
  title: "Circle",
  description: "A circle drawn from its radius.",
  properties: {
    radius: { term: "radius", kind: "number", min: 0, exclusiveMin: true, required: true, description: "The radius." },
    title: sharedProperties.title,
    points: {
      term: "points",
      kind: "array",
      required: false,
      description: "Marked points.",
      items: {
        kind: "object",
        description: "One marked point.",
        properties: { angle: { term: "angle", kind: "number", required: true, description: "Where on the circle." }, ...itemProperties },
      },
    },
  },
  derivations: [{ members: ["radius", "diameter"], derive: (_term, value) => ({ radius: value, diameter: value * 2 }) }],
  checks: [(description) => (description.radius > 1e6 ? [] : [])],
  describe: (normalized) => `A circle of radius ${normalized.radius}.`,
};

describe("graph types (GSV-REQ-003)", () => {
  it("are exactly the eleven types of this change, in kebab case", () => {
    expect([...GRAPH_TYPES]).toMatchInlineSnapshot(`
      [
        "number-line",
        "xy-graph",
        "xyz-graph",
        "line-graph",
        "bar-graph",
        "pictograph",
        "circle",
        "square",
        "triangle",
        "cube",
        "cylinder",
      ]
    `);
    expect(Object.isFrozen(GRAPH_TYPES)).toBe(true);
  });
});

describe("definitions registry", () => {
  it("is keyed by graph type, and each definition names its own type", () => {
    for (const [key, definition] of Object.entries(definitions)) {
      expect(GRAPH_TYPES, key).toContain(key);
      expect(definition?.type, key).toBe(key);
    }
    expect(Object.isFrozen(definitions)).toBe(true);
  });

  it("accepts a definition written for a type's own description shape", () => {
    // Type-level: this assignment must compile (pnpm typecheck).
    const registry: Partial<Record<GraphType, GraphTypeDefinition>> = { circle: circleFixture };
    expect(registry.circle?.describe({ type: "circle", radius: 2 })).toBe("A circle of radius 2.");
  });
});

describe("vocabulary terms (GSV-REQ-012, AD-005)", () => {
  it("every property name is its declared, camel-cased, documented term", () => {
    expect(vocabularyProblems(sharedProperties)).toEqual([]);
    expect(vocabularyProblems(itemProperties)).toEqual([]);
    expect(vocabularyProblems(circleFixture.properties)).toEqual([]);
    for (const [type, definition] of Object.entries(definitions)) {
      expect(vocabularyProblems(definition!.properties), type).toEqual([]);
    }
  });

  it("catches a name that is not its declared term, at any depth", () => {
    const bad = {
      lineColour: { term: "lineColor", kind: "color", required: false, description: "Misspelled key." },
      "line color": { term: "line color", kind: "color", required: false, description: "Spaces." },
      LineLabel: { term: "LineLabel", kind: "string", required: false, description: "Pascal case." },
      height: { term: "height", kind: "number", required: true, description: " " },
      shape: { term: "shape", kind: "enum", values: ["a"], required: false, description: "An enum." },
      point: {
        term: "point",
        kind: "object",
        required: false,
        description: "A nested object.",
        properties: { x_value: { term: "x_value", kind: "number", required: true, description: "Snake case." } },
      },
      labels: {
        term: "labels",
        kind: "array",
        required: false,
        description: "An array.",
        items: { kind: "markup", description: "Not a kind." },
      },
    } as unknown as PropertyMap;
    expect(vocabularyProblems(bad)).toEqual([
      '/lineColour: key differs from its term "lineColor"',
      "/line color: not a camel-cased term",
      "/LineLabel: not a camel-cased term",
      "/height: no description",
      "/point/x_value: not a camel-cased term",
      '/labels/items: unknown kind "markup"',
    ]);
  });
});

describe("shared presentation properties (GSV-REQ-040, GSV-REQ-043, GSV-REQ-045)", () => {
  const shared = Object.values(sharedProperties);

  it("each applies to at least one real graph type, listed once", () => {
    for (const spec of shared) {
      expect(spec.appliesTo.length, spec.term).toBeGreaterThan(0);
      expect(new Set(spec.appliesTo).size, spec.term).toBe(spec.appliesTo.length);
      for (const type of spec.appliesTo) expect(GRAPH_TYPES, spec.term).toContain(type);
    }
  });

  it("covers title, line color, line label, axis labels and point labels where they apply", () => {
    expect(Object.keys(sharedProperties)).toEqual([
      "title",
      "lineColor",
      "lineLabel",
      "xAxisLabel",
      "yAxisLabel",
      "zAxisLabel",
      "categoryAxisLabel",
      "valueAxisLabel",
    ]);
    expect([...sharedProperties.title.appliesTo]).toEqual([...GRAPH_TYPES]);
    expect(itemProperties.label.presentation).toBe("itemLabel");
  });

  it("are all optional presentation options", () => {
    for (const spec of [...shared, ...Object.values(itemProperties)]) {
      expect(spec.required, spec.term).toBe(false);
      expect(spec.presentation, spec.term).toBeDefined();
    }
  });

  it("accept labels and titles as plain strings and colors as colors, with no markup kind", () => {
    expect(PROPERTY_KINDS).not.toContain("markup");
    expect(PROPERTY_KINDS).not.toContain("html");
    for (const spec of [...shared, ...Object.values(itemProperties)]) {
      const isColor = spec.presentation === "lineColor" || spec.presentation === "itemColor";
      expect(spec.kind, spec.term).toBe(isColor ? "color" : "string");
    }
  });

  it("keep element-level options apart from the top-level ones", () => {
    for (const term of Object.keys(itemProperties)) expect(Object.keys(sharedProperties)).not.toContain(term);
  });
});
