import { describe, expect, it } from "vitest";
import { dataGraphProperties } from "../../src/core/definitions/categories";
import { definitions, propertiesOf, scopedProperty, scopedPropertyMaps } from "../../src/core/definitions/index";
import { type ScopedPropertySpec, sharedProperties } from "../../src/core/definitions/shared";
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
import { conditionalRuler } from "../fixtures/definitions/conditional-ruler";
import { fixtureRegistry as validatorFixtures } from "../fixtures/definitions/index";

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const BUILT_IN_NAMES = new Set([...Object.getOwnPropertyNames(Object.prototype), "type", "version"]);
const shared: readonly ScopedPropertySpec[] = Object.values(sharedProperties);
/** Every term defined once with where it applies: the shared options and the data-graph terms. */
const scoped: readonly ScopedPropertySpec[] = scopedPropertyMaps.flatMap((map) => Object.values(map));
const scopedTerms = new Set(scoped.map((spec) => spec.term));

/** Every vocabulary problem in a property map, nested objects and array items included. */
function vocabularyProblems(properties: PropertyMap, path = ""): string[] {
  const problems: string[] = [];
  for (const [key, spec] of Object.entries(properties)) {
    const at = `${path}/${key}`;
    if (spec.term !== key) problems.push(`${at}: key differs from its term ${JSON.stringify(spec.term)}`);
    if (!CAMEL_CASE.test(key)) problems.push(`${at}: not a camel-cased term`);
    // A built-in object name would shadow or vanish in ordinary objects (security review SEC-002 on TICKET-005).
    if (BUILT_IN_NAMES.has(key)) problems.push(`${at}: a built-in object name cannot be a term`);
    // Dropping an empty text must never satisfy a required term (quality review QR-006).
    if (spec.kind === "string" && spec.emptyIsAbsent === true && spec.required) problems.push(`${at}: emptyIsAbsent on a required term`);
    problems.push(...valueProblems(spec, at));
  }
  return problems;
}

function valueProblems(spec: ValueSpec, at: string): string[] {
  const problems: string[] = [];
  if (!(PROPERTY_KINDS as readonly string[]).includes(spec.kind)) problems.push(`${at}: unknown kind ${JSON.stringify(spec.kind)}`);
  if (typeof spec.description !== "string" || spec.description.trim() === "") problems.push(`${at}: no description`);
  if (spec.kind === "object") {
    problems.push(...vocabularyProblems(spec.properties, at));
    // A range group must declare its order, or a reversed range passes (code review CR-002).
    for (const [lower, upper] of [["min", "max"], ["minimum", "maximum"]] as const) {
      const declared = (spec.ordered ?? []).some(([a, b]) => a === lower && b === upper);
      if (propertySpec(spec.properties, lower) && propertySpec(spec.properties, upper) && !declared) {
        problems.push(`${at}: has ${lower} and ${upper} without ordered [${lower}, ${upper}]`);
      }
    }
    for (const pair of spec.ordered ?? []) {
      for (const term of pair) {
        const inner = propertySpec(spec.properties, term);
        if (inner === undefined || (inner.kind !== "number" && inner.kind !== "integer")) {
          problems.push(`${at}: ordered term ${JSON.stringify(term)} is not a number property`);
        }
      }
    }
  }
  if (spec.kind === "array") {
    if (!Number.isInteger(spec.maxItems) || spec.maxItems < 1) problems.push(`${at}: maxItems must be a positive whole number`);
    // A dropped list item would leave a hole that is not marked failed (quality review QR-006).
    if (spec.items.kind === "string" && spec.items.emptyIsAbsent === true) problems.push(`${at}/items: emptyIsAbsent on a list item`);
    problems.push(...valueProblems(spec.items, `${at}/items`));
  }
  if (spec.kind === "string" && spec.maxLength !== undefined && (!Number.isInteger(spec.maxLength) || spec.maxLength < 1)) {
    problems.push(`${at}: maxLength must be a positive whole number`);
  }
  if (spec.kind === "enum" && spec.values.length === 0) problems.push(`${at}: enum with no values`);
  if (spec.kind === "enum") {
    for (const [described, text] of Object.entries(spec.valueDescriptions ?? {})) {
      if (!(spec.values as readonly string[]).includes(described)) problems.push(`${at}: describes ${described}, which is not a value`);
      if (text.trim() === "") problems.push(`${at}: an empty value description`);
    }
  }
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
 * Where a definition uses scoped terms (shared options and data-graph terms), against their
 * `appliesTo` and `elementsOf` lists
 * (code review CR-001, CR-002; quality review QR-002).
 */
function applicabilityProblems(definition: GraphTypeDefinition): string[] {
  const problems: string[] = [];
  for (const term of Object.keys(definition.properties)) {
    if (scopedTerms.has(term)) problems.push(`${definition.type}: lists scoped term ${term}; propertiesOf adds it from appliesTo`);
  }
  const nested = nestedSpecs(definition.properties);
  for (const [key, spec] of nested) {
    const sharedSpec = scopedProperty(key);
    if (sharedSpec !== undefined && spec !== sharedSpec) problems.push(`${definition.type}: redefines scoped term ${key}`);
  }
  for (const option of scoped) {
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
  derivations: [],
  checks: [{ name: "a check written for circles", inputs: ["radius"], check: (description) => (description.radius > 1e6 ? [] : []) }],
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
      maxItems: 1000,
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

// Every definition the tests below hold to the rules: this file's fixtures, the validator's
// fixtures under tests/fixtures/definitions/, and every registered definition.
const allDefinitions = (): GraphTypeDefinition[] =>
  [...Object.values(fixtureRegistry), ...Object.values(validatorFixtures), ...Object.values(definitions)].filter(
    (definition): definition is GraphTypeDefinition => definition !== undefined,
  );

describe("graph types (GSV-REQ-003)", () => {
  it("are graph-library's eleven types and the rulers change's ruler, in kebab case", () => {
    expect([...GRAPH_TYPES]).toMatchInlineSnapshot(`
      [
        "number-line",
        "ruler",
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

describe("terms that apply only while a sibling has given values (GSV-REQ-051)", () => {
  /** Every property map in a definition, the top level and every nested object or list element. */
  const mapsOf = (properties: PropertyMap): PropertyMap[] => [
    properties,
    ...Object.values(properties).flatMap((spec) => {
      const inner = spec.kind === "array" ? spec.items : spec;
      return inner.kind === "object" ? mapsOf(inner.properties) : [];
    }),
  ];

  /** Each `appliesWhen` that does not name a sibling enum term, or names a value outside its list. */
  const conditionProblems = (definition: GraphTypeDefinition): string[] =>
    mapsOf(definition.properties).flatMap((map) =>
      Object.values(map).flatMap((spec) => {
        if (spec.appliesWhen === undefined) return [];
        const sibling = map[spec.appliesWhen.term];
        const where = `${definition.type}: ${spec.term} applies when ${spec.appliesWhen.term}`;
        if (sibling?.kind !== "enum") return [`${where}, which is not a sibling enum term`];
        return [
          ...spec.appliesWhen.values.filter((value) => !sibling.values.includes(value)).map((value) => `${where} is ${value}, not one of its values`),
          ...(spec.required ? [`${where}, but is required, so it could never be satisfied`] : []),
          ...(sibling.appliesWhen !== undefined ? [`${where}, which has a condition of its own`] : []),
        ];
      }),
    );

  it("name a sibling enum term and only values from its list", () => {
    for (const definition of [...allDefinitions(), conditionalRuler]) expect(conditionProblems(definition), definition.type).toEqual([]);
  });

  it("hold the test-only conditional ruler to the other definition rules too (quality review QR-005)", () => {
    // Outside allDefinitions(): it does not nest the shared label and color, which list ruler.
    expect(stageProblems(conditionalRuler)).toEqual([]);
    expect(vocabularyProblems(conditionalRuler.properties)).toEqual([]);
  });

  it("are caught when they name no sibling enum or a value outside its list", () => {
    const division = conditionalRuler.properties["smallestDivision"]!;
    const broken = (appliesWhen: { term: string; values: readonly [string, ...string[]] }) =>
      ({ ...conditionalRuler, properties: { ...conditionalRuler.properties, smallestDivision: { ...division, appliesWhen } } }) as GraphTypeDefinition;
    expect(conditionProblems(broken({ term: "length", values: ["inches"] }))).toEqual(["ruler: smallestDivision applies when length, which is not a sibling enum term"]);
    expect(conditionProblems(broken({ term: "unit", values: ["feet"] }))).toEqual(["ruler: smallestDivision applies when unit is feet, not one of its values"]);
  });

  it("are caught when the term is required, or its sibling has a condition of its own (code review CR-007)", () => {
    const { unit, smallestDivision } = conditionalRuler.properties as Record<string, PropertyMap[string]>;
    const required = { ...conditionalRuler, properties: { ...conditionalRuler.properties, smallestDivision: { ...smallestDivision!, required: true } } } as GraphTypeDefinition;
    expect(conditionProblems(required)).toEqual(["ruler: smallestDivision applies when unit, but is required, so it could never be satisfied"]);
    const chained = {
      ...conditionalRuler,
      properties: { ...conditionalRuler.properties, unit: { ...unit!, required: false, appliesWhen: { term: "smallestDivision", values: ["half"] } } },
    } as GraphTypeDefinition;
    expect(conditionProblems(chained)).toContain("ruler: smallestDivision applies when unit, which has a condition of its own");
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
    expect(registry.circle?.describe({ type: "circle", radius: 2 }, { "/radius": "supplied" })).toBe("A circle of radius 2.");
  });
});

describe("vocabulary terms (GSV-REQ-012, AD-005)", () => {
  it("every property name is its declared, camel-cased, documented term", () => {
    expect(vocabularyProblems(sharedProperties)).toEqual([]);
    expect(vocabularyProblems(dataGraphProperties)).toEqual([]);
    for (const definition of allDefinitions()) {
      expect(vocabularyProblems(definition.properties), definition.type).toEqual([]);
    }
  });

  it("allows emptyIsAbsent on optional terms only (quality review QR-006)", () => {
    const misuse = defineProperties({
      caption: { term: "caption", kind: "string", required: true, emptyIsAbsent: true, description: "A required caption." },
      notes: {
        term: "notes",
        kind: "array",
        required: false,
        maxItems: 5,
        description: "Notes.",
        items: { kind: "string", emptyIsAbsent: true, description: "One note." },
      },
      unit: { term: "unit", kind: "string", required: false, emptyIsAbsent: true, description: "An optional unit." },
    });
    expect(vocabularyProblems(misuse)).toEqual(["/caption: emptyIsAbsent on a required term", "/notes/items: emptyIsAbsent on a list item"]);
  });

  it("catches a name that is not its declared term, at any depth", () => {
    const bad = {
      lineColour: { term: "lineColor", kind: "color", required: false, description: "Misspelled key." },
      "line color": { term: "line color", kind: "color", required: false, description: "Spaces." },
      LineLabel: { term: "LineLabel", kind: "string", required: false, description: "Pascal case." },
      height: { term: "height", kind: "number", required: true, description: " " },
      shape: { term: "shape", kind: "enum", values: [], required: false, description: "An empty enum." },
      toString: { term: "toString", kind: "string", required: false, description: "A built-in name." },
      ends: {
        term: "ends",
        kind: "enum",
        values: ["left"],
        valueDescriptions: { right: "Not a value." },
        required: false,
        description: "An enum describing a value it lacks.",
      },
      range: {
        term: "range",
        kind: "object",
        required: false,
        description: "An ordered pair naming a missing term.",
        properties: { low: { term: "low", kind: "number", required: true, description: "The low end." } },
        ordered: [["low", "high"]],
      },
      scale: {
        term: "scale",
        kind: "object",
        required: false,
        description: "A range group with no declared order.",
        properties: {
          minimum: { term: "minimum", kind: "number", required: true, description: "The smallest value." },
          maximum: { term: "maximum", kind: "number", required: true, description: "The largest value." },
        },
      },
      steps: { term: "steps", kind: "array", maxItems: 0, required: false, description: "A list with no room.", items: { kind: "number", description: "A step." } },
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
        maxItems: 1000,
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
      "/toString: a built-in object name cannot be a term",
      "/ends: describes right, which is not a value",
      '/range: ordered term "high" is not a number property',
      "/scale: has minimum and maximum without ordered [minimum, maximum]",
      "/steps: maxItems must be a positive whole number",
      '/caption: unknown kind "html"',
      "/point/x_value: not a camel-cased term",
      '/labels/items: unknown kind "markup"',
    ]);
  });

  it("defines each term once: shared terms by the same object, other terms with one kind and description", () => {
    // Each registry is one set of graph types; a term needs one definition within its set.
    for (const registry of [fixtureRegistry, validatorFixtures, definitions]) {
      const maps = [...scopedPropertyMaps, ...Object.values(registry).map((d) => d!.properties)];
      expect(consistencyProblems(maps)).toEqual([]);
    }
    const redefined = defineProperties({
      radius: { term: "radius", kind: "number", required: true, description: "Half the width." },
    });
    expect(consistencyProblems([circleFixture.properties, redefined])).toEqual(["radius: defined twice, differently"]);
  });
});

/** Whether a check's input path names a property, `*` standing for a list position. */
function pathExists(properties: PropertyMap, path: string): boolean {
  let spec: ValueSpec | undefined;
  let map: PropertyMap | undefined = properties;
  for (const segment of path.split("/")) {
    if (segment === "*") {
      if (spec?.kind !== "array") return false;
      spec = spec.items;
    } else {
      if (map === undefined) return false;
      spec = propertySpec(map, segment);
      if (spec === undefined) return false;
    }
    map = spec.kind === "object" ? spec.properties : undefined;
  }
  return true;
}

/** Problems with a definition's derivation groups and domain checks (GSV-REQ-035; AD-004). */
function stageProblems(definition: GraphTypeDefinition): string[] {
  const problems: string[] = [];
  const properties = propertiesOf(definition.type, { [definition.type]: definition });
  const seen = new Set<string>();
  for (const group of definition.derivations) {
    if (new Set(group.members).size !== group.members.length) problems.push(`${definition.type}: a group lists a member twice`);
    if (group.members.length < 2) problems.push(`${definition.type}: a group needs at least two members`);
    if (group.description.trim() === "") problems.push(`${definition.type}: a group has no description`);
    const specs: Record<string, { min: number; max: number }> = {};
    for (const member of group.members) {
      if (seen.has(member)) problems.push(`${definition.type}: member ${member} is in two groups`);
      seen.add(member);
      const spec = propertySpec(definition.properties, member);
      if (spec === undefined || spec.kind !== "number") {
        problems.push(`${definition.type}: group member ${member} is not a top-level number property`);
      } else if (spec.min === undefined || !(spec.min > 0) || spec.max === undefined || !Number.isFinite(spec.max)) {
        problems.push(`${definition.type}: group member ${member} needs a positive min and a finite max`);
      } else {
        specs[member] = { min: spec.min, max: spec.max };
      }
    }
    // derive returns every member, finite and positive, and round-trips (quality review QR-004).
    for (const [member, { min, max }] of Object.entries(specs)) {
      for (const sample of [min, Math.sqrt(min * max), max]) {
        const derived = group.derive(member, sample);
        for (const other of group.members) {
          const value = derived[other];
          if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
            problems.push(`${definition.type}: derive(${member}, ${sample}) gives no finite positive ${other}`);
            continue;
          }
          const back = group.derive(other, value)[member];
          if (back === undefined || Math.abs(back - sample) > 1e-9 * sample) {
            problems.push(`${definition.type}: deriving ${member} back from ${other} does not round-trip`);
          }
        }
      }
    }
  }
  for (const check of definition.checks) {
    for (const input of [...check.inputs, ...(check.optionalInputs ?? [])]) {
      if (!pathExists(properties, input)) problems.push(`${definition.type}: check "${check.name}" reads ${input}, which is not a property path`);
    }
    for (const input of check.optionalInputs ?? []) {
      if (check.inputs.includes(input)) problems.push(`${definition.type}: check "${check.name}" lists ${input} as both required and optional`);
    }
  }
  return problems;
}

describe("derivation groups and domain checks are well formed (GSV-REQ-035)", () => {
  it("holds for every definition", () => {
    for (const definition of allDefinitions()) expect(stageProblems(definition), definition.type).toEqual([]);
  });

  it("catches bad members, unbounded members, a broken derive and bad input paths", () => {
    const circle = validatorFixtures.circle!;
    const bad = {
      ...circle,
      derivations: [
        { members: ["radius", "radius", "unit"], description: " ", required: true, derive: () => ({}) },
        {
          members: ["diameter", "circumference"],
          description: "A broken formula.",
          required: false,
          derive: (term: string, value: number) => (term === "diameter" ? { diameter: value } : { diameter: value, circumference: value }),
        },
      ],
      checks: [{ name: "reads nothing real", inputs: ["sparkle", "radius/*", "radius"], optionalInputs: ["glitter", "radius"], check: () => [] }],
    } as unknown as GraphTypeDefinition;
    const problems = stageProblems(bad);
    expect(problems).toContain("circle: a group lists a member twice");
    expect(problems).toContain("circle: a group has no description");
    expect(problems).toContain("circle: group member unit is not a top-level number property");
    expect(problems).toContain("circle: derive(diameter, 0.000002) gives no finite positive circumference");
    expect(problems).toContain("circle: deriving circumference back from diameter does not round-trip");
    expect(problems).toContain('circle: check "reads nothing real" reads sparkle, which is not a property path');
    expect(problems).toContain('circle: check "reads nothing real" reads radius/*, which is not a property path');
    expect(problems).toContain('circle: check "reads nothing real" reads glitter, which is not a property path');
    expect(problems).toContain('circle: check "reads nothing real" lists radius as both required and optional');
    expect(problems).not.toContain('circle: check "reads nothing real" reads radius, which is not a property path');

    const unbounded = {
      ...circle,
      properties: defineProperties({
        radius: { term: "radius", kind: "number", required: false, min: 0, exclusiveMin: true, description: "Unbounded." },
        diameter: { term: "diameter", kind: "number", required: false, min: 0.1, max: 10, description: "Bounded." },
      }),
      derivations: [{ ...circle.derivations[0]!, members: ["radius", "diameter"] }],
      checks: [],
    } as unknown as GraphTypeDefinition;
    expect(stageProblems(unbounded)).toEqual(["circle: group member radius needs a positive min and a finite max"]);

    const twice = { ...circle, derivations: [circle.derivations[0]!, circle.derivations[0]!], checks: [] } as GraphTypeDefinition;
    expect(stageProblems(twice)).toContain("circle: member radius is in two groups");
  });
});

describe("where shared presentation options apply (GSV-REQ-040, GSV-REQ-041, GSV-REQ-045)", () => {
  it("each lists real graph types, at the top level or on elements, each type once", () => {
    for (const spec of scoped) {
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
    expect([...sharedProperties.label.elementsOf]).toEqual(["number-line", "ruler", "xy-graph", "xyz-graph"]);
    // A ruler's measured object carries the element label and color (GSV-REQ-040, rulers).
    expect([...sharedProperties.color.elementsOf]).toContain("ruler");
    expect(sharedProperties.label.description).toContain("measured object");
    expect(sharedProperties.color.description).toContain("measured object");
  });

  it("are given to a type by propertiesOf, merged with the type's own terms", () => {
    const circle = propertiesOf("circle", fixtureRegistry);
    expect(Object.keys(circle).sort()).toEqual(["lineColor", "radius", "title"]);
    expect(circle.title).toBe(sharedProperties.title);
    expect(Object.keys(propertiesOf("xy-graph", fixtureRegistry)).sort()).toEqual(["title", "xAxisLabel", "yAxisLabel"]);
    // The data-graph terms are scoped the same way (DGP TICKET-001).
    expect(Object.keys(propertiesOf("bar-graph", fixtureRegistry)).sort()).toEqual([
      "categoryAxisLabel",
      "title",
      "valueAxisLabel",
      "valueScale",
    ]);
    expect(Object.keys(propertiesOf("pictograph", fixtureRegistry)).sort()).toEqual(["title", "valueUnitLabel"]);
    expect(lockedDown(circle)).toEqual([]);
  });

  it("are each defined in one scoped map only", () => {
    expect(scoped.length).toBe(scopedTerms.size);
    expect(scopedProperty("valueScale")).toBe(dataGraphProperties.valueScale);
    expect(scopedProperty("title")).toBe(sharedProperties.title);
    expect(scopedProperty("radius")).toBeUndefined();
  });

  it("agree with every definition that uses them", () => {
    for (const definition of allDefinitions()) {
      expect(applicabilityProblems(definition), definition.type).toEqual([]);
    }
  });

  it("catch a definition that lists, redefines or misplaces a scoped term", () => {
    const lists: GraphTypeDefinition = { ...circleFixture, properties: defineProperties({ title: sharedProperties.title }) } as GraphTypeDefinition;
    expect(applicabilityProblems(lists)).toEqual(["circle: lists scoped term title; propertiesOf adds it from appliesTo"]);

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
          maxItems: 1000,
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
      "number-line: redefines scoped term label",
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
    expect(lockedDown(dataGraphProperties, "dataGraphProperties")).toEqual([]);
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
      expect(scopedProperty(key), key).toBeUndefined();
      expect(propertySpec(propertiesOf("circle", fixtureRegistry), key), key).toBeUndefined();
    }
    expect(propertySpec(sharedProperties, "title")).toBe(sharedProperties.title);
  });
});

describe("the x,y graph, registered (graph-library NLC TICKET-003)", () => {
  const definition = definitions["xy-graph"]!;

  it("follows the vocabulary, stage and applicability rules, its checks reading real paths", () => {
    expect(vocabularyProblems(definition.properties)).toEqual([]);
    expect(stageProblems(definition)).toEqual([]);
    expect(applicabilityProblems(definition)).toEqual([]);
    expect(definition.checks.flatMap((check) => check.inputs)).toContain("segments/*/to/y");
  });

  it("takes its own terms and the shared title and axis labels, with the shared label and color on each point and segment", () => {
    expect(Object.keys(propertiesOf("xy-graph", definitions)).sort()).toEqual(["points", "segments", "showGrid", "title", "xAxis", "xAxisLabel", "yAxis", "yAxisLabel"]);
    for (const list of ["points", "segments"]) {
      const spec = definition.properties[list]!;
      if (spec.kind !== "array" || spec.items.kind !== "object") throw new Error(`${list} is not a list of objects`);
      expect(spec.items.properties["label"], list).toBe(sharedProperties.label);
      expect(spec.items.properties["color"], list).toBe(sharedProperties.color);
    }
  });

  it("defines points once with the number line, and every term once among the registered types (GSV-REQ-015)", () => {
    expect(definition.properties["points"]!.description).toBe(definitions["number-line"]!.properties["points"]!.description);
    expect(consistencyProblems([...scopedPropertyMaps, ...Object.values(definitions).map((d) => d!.properties)])).toEqual([]);
  });

  it("is frozen all the way down, with no prototypes", () => {
    expect(lockedDown(definition.properties, "xy-graph")).toEqual([]);
  });
});
