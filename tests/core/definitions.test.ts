import { describe, expect, it } from "vitest";
import { definitions, propertiesOf } from "../../src/core/definitions/index";
import { type SharedPropertySpec, sharedProperties } from "../../src/core/definitions/shared";
import {
  GRAPH_TYPES,
  PROPERTY_KINDS,
  defineProperties,
  propertySpec,
  type DescriptionBase,
  type GraphType,
  type GraphTypeDefinition,
  type PropertyMap,
  type ValueSpec,
} from "../../src/core/definitions/types";

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const shared: readonly SharedPropertySpec[] = Object.values(sharedProperties);
const sharedTerms = new Set(shared.map((spec) => spec.term));

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

/** Every property spec below the top level of a map: inside objects and array items. */
function nestedSpecs(properties: PropertyMap): Array<[string, PropertyMap[string]]> {
  const found: Array<[string, PropertyMap[string]]> = [];
  const visitValue = (spec: ValueSpec) => {
    if (spec.kind === "object") {
      for (const [key, inner] of Object.entries(spec.properties)) {
        found.push([key, inner]);
        visitValue(inner);
      }
    }
    if (spec.kind === "array") visitValue(spec.items);
  };
  for (const spec of Object.values(properties)) visitValue(spec);
  return found;
}

/**
 * Where a definition uses shared options, against their `appliesTo` and `elementsOf` lists
 * (code review CR-001, CR-002; quality review QR-002).
 */
function applicabilityProblems(definition: GraphTypeDefinition): string[] {
  const problems: string[] = [];
  for (const term of Object.keys(definition.properties)) {
    if (sharedTerms.has(term)) problems.push(`${definition.type}: lists shared option ${term}; propertiesOf adds it from appliesTo`);
  }
  const nested = nestedSpecs(definition.properties);
  for (const [key, spec] of nested) {
    const sharedSpec = propertySpec(sharedProperties, key);
    if (sharedSpec !== undefined && spec !== sharedSpec) problems.push(`${definition.type}: redefines shared option ${key}`);
  }
  for (const option of shared) {
    const nests = nested.some(([, spec]) => spec === option);
    const listed = option.elementsOf.includes(definition.type);
    if (nests && !listed) problems.push(`${definition.type}: nests ${option.term}, but its elementsOf does not list the type`);
    if (listed && !nests) problems.push(`${definition.type}: elementsOf lists the type, but no element carries ${option.term}`);
  }
  return problems;
}

/** Terms used with different kinds or descriptions across the given maps (DEL-001; code review CR-004). */
function consistencyProblems(maps: readonly PropertyMap[]): string[] {
  const seen = new Map<string, { kind: string; description: string }>();
  const problems: string[] = [];
  const visit = (key: string, spec: PropertyMap[string]) => {
    const first = seen.get(key);
    if (first === undefined) seen.set(key, { kind: spec.kind, description: spec.description });
    else if (first.kind !== spec.kind || first.description !== spec.description) problems.push(`${key}: defined twice, differently`);
  };
  for (const map of maps) {
    for (const [key, spec] of Object.entries(map)) visit(key, spec);
    for (const [key, spec] of nestedSpecs(map)) visit(key, spec);
  }
  return problems;
}

/** Whether every object below `value` is frozen and, unless it is an array, has no prototype. */
function lockedDown(value: unknown, path = "", problems: string[] = []): string[] {
  if (value !== null && typeof value === "object") {
    if (!Object.isFrozen(value)) problems.push(`${path}: not frozen`);
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== null) problems.push(`${path}: has a prototype`);
    for (const [key, inner] of Object.entries(value)) lockedDown(inner, `${path}/${key}`, problems);
  }
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
  properties: defineProperties({
    radius: { term: "radius", kind: "number", min: 0, exclusiveMin: true, required: true, description: "The radius." },
  }),
  derivations: [{ members: ["radius", "diameter"], derive: (_term, value) => ({ radius: value, diameter: value * 2 }) }],
  checks: [(description) => (description.radius > 1e6 ? [] : [])],
  describe: (normalized) => `A circle of radius ${normalized.radius}.`,
};

const numberLineFixture: GraphTypeDefinition = {
  type: "number-line",
  title: "Number line",
  description: "A number line with marked points.",
  properties: defineProperties({
    points: {
      term: "points",
      kind: "array",
      required: false,
      description: "Marked points.",
      items: {
        kind: "object",
        description: "One marked point.",
        properties: {
          value: { term: "value", kind: "number", required: true, description: "Where the point is." },
          label: sharedProperties.label,
          color: sharedProperties.color,
        },
      },
    },
  }),
  derivations: [],
  checks: [],
  describe: () => "A number line.",
};

const fixtureRegistry: Partial<Record<GraphType, GraphTypeDefinition>> = { circle: circleFixture, "number-line": numberLineFixture };

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
  });

  it("is frozen, with no prototype", () => {
    expect(Object.isFrozen(definitions)).toBe(true);
    expect(Object.getPrototypeOf(definitions)).toBeNull();
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
    for (const definition of [...Object.values(fixtureRegistry), ...Object.values(definitions)]) {
      expect(vocabularyProblems(definition!.properties), definition!.type).toEqual([]);
    }
  });

  it("catches a name that is not its declared term, at any depth", () => {
    const bad = {
      lineColour: { term: "lineColor", kind: "color", required: false, description: "Misspelled key." },
      "line color": { term: "line color", kind: "color", required: false, description: "Spaces." },
      LineLabel: { term: "LineLabel", kind: "string", required: false, description: "Pascal case." },
      height: { term: "height", kind: "number", required: true, description: " " },
      shape: { term: "shape", kind: "enum", values: [], required: false, description: "An empty enum." },
      caption: { term: "caption", kind: "html", required: false, description: "Not a kind." },
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
      "/shape: enum with no values",
      '/caption: unknown kind "html"',
      "/point/x_value: not a camel-cased term",
      '/labels/items: unknown kind "markup"',
    ]);
  });

  it("defines each term once: shared terms by the same object, other terms with one kind and description", () => {
    const maps = [sharedProperties, ...[...Object.values(fixtureRegistry), ...Object.values(definitions)].map((d) => d!.properties)];
    expect(consistencyProblems(maps)).toEqual([]);
    const redefined = defineProperties({
      radius: { term: "radius", kind: "number", required: true, description: "Half the width." },
    });
    expect(consistencyProblems([circleFixture.properties, redefined])).toEqual(["radius: defined twice, differently"]);
  });
});

describe("where shared presentation options apply (GSV-REQ-040, GSV-REQ-041, GSV-REQ-045)", () => {
  it("each lists real graph types, at the top level or on elements, each type once", () => {
    for (const spec of shared) {
      expect(spec.appliesTo.length + spec.elementsOf.length, spec.term).toBeGreaterThan(0);
      for (const list of [spec.appliesTo, spec.elementsOf]) {
        expect(new Set(list).size, spec.term).toBe(list.length);
        for (const type of list) expect(GRAPH_TYPES, spec.term).toContain(type);
      }
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
      "label",
      "color",
    ]);
    expect([...sharedProperties.title.appliesTo]).toEqual([...GRAPH_TYPES]);
    expect([...sharedProperties.lineColor.appliesTo]).toContain("number-line");
    expect([...sharedProperties.label.elementsOf]).toEqual(["number-line", "xy-graph", "xyz-graph"]);
  });

  it("are given to a type by propertiesOf, merged with the type's own terms", () => {
    const circle = propertiesOf("circle", fixtureRegistry);
    expect(Object.keys(circle).sort()).toEqual(["lineColor", "radius", "title"]);
    expect(circle.title).toBe(sharedProperties.title);
    expect(Object.keys(propertiesOf("xy-graph", fixtureRegistry)).sort()).toEqual(["title", "xAxisLabel", "yAxisLabel"]);
    expect(Object.keys(propertiesOf("bar-graph")).sort()).toEqual(["categoryAxisLabel", "title", "valueAxisLabel"]);
    expect(lockedDown(circle)).toEqual([]);
  });

  it("agree with every definition that uses them", () => {
    for (const definition of [...Object.values(fixtureRegistry), ...Object.values(definitions)]) {
      expect(applicabilityProblems(definition!), definition!.type).toEqual([]);
    }
  });

  it("catch a definition that lists, redefines or misplaces a shared option", () => {
    const lists: GraphTypeDefinition = { ...circleFixture, properties: defineProperties({ title: sharedProperties.title }) } as GraphTypeDefinition;
    expect(applicabilityProblems(lists)).toEqual(["circle: lists shared option title; propertiesOf adds it from appliesTo"]);

    const misplaced = { ...numberLineFixture, type: "circle" } as GraphTypeDefinition;
    expect(applicabilityProblems(misplaced)).toEqual([
      "circle: nests label, but its elementsOf does not list the type",
      "circle: nests color, but its elementsOf does not list the type",
    ]);

    const redefined = {
      ...numberLineFixture,
      properties: defineProperties({
        points: {
          term: "points",
          kind: "array",
          required: false,
          description: "Marked points.",
          items: {
            kind: "object",
            description: "One marked point.",
            properties: {
              label: { term: "label", kind: "string", required: false, description: "My own label." },
              color: sharedProperties.color,
            },
          },
        },
      }),
    } as GraphTypeDefinition;
    expect(applicabilityProblems(redefined)).toEqual([
      "number-line: redefines shared option label",
      "number-line: elementsOf lists the type, but no element carries label",
    ]);
  });

  it("are all optional presentation options", () => {
    for (const spec of shared) {
      expect(spec.required, spec.term).toBe(false);
      expect(spec.presentation, spec.term).toBeDefined();
    }
  });

  it("accept labels and titles as plain strings and colors as colors, with no markup kind (GSV-REQ-043)", () => {
    expect(PROPERTY_KINDS).not.toContain("markup");
    expect(PROPERTY_KINDS).not.toContain("html");
    for (const spec of shared) {
      const isColor = spec.presentation === "lineColor" || spec.presentation === "elementColor";
      expect(spec.kind, spec.term).toBe(isColor ? "color" : "string");
    }
  });
});

describe("definitions cannot be changed or reached through inherited keys (security review SEC-003, quality review QR-004)", () => {
  it("freezes every map, spec and list, with no prototypes", () => {
    expect(lockedDown(sharedProperties, "sharedProperties")).toEqual([]);
    expect(lockedDown(circleFixture.properties, "circle")).toEqual([]);
    expect(lockedDown(numberLineFixture.properties, "number-line")).toEqual([]);
  });

  it("rejects changes at runtime", () => {
    expect(() => {
      (sharedProperties.lineColor.appliesTo as unknown as GraphType[]).push("pictograph");
    }).toThrow(TypeError);
    expect(() => {
      (sharedProperties.title as { kind: string }).kind = "markup";
    }).toThrow(TypeError);
  });

  it("finds nothing for inherited keys, including a parsed __proto__ key", () => {
    const description = JSON.parse('{"type":"circle","__proto__":{"lineColor":"x"},"constructor":1,"toString":1}') as object;
    for (const key of [...Object.keys(description), "hasOwnProperty", "valueOf"]) {
      if (key === "type") continue;
      expect(propertySpec(sharedProperties, key), key).toBeUndefined();
      expect(propertySpec(propertiesOf("circle", fixtureRegistry), key), key).toBeUndefined();
    }
    expect(propertySpec(sharedProperties, "title")).toBe(sharedProperties.title);
  });
});
