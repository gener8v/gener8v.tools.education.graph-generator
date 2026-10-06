import { describe, expect, it } from "vitest";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { fixtureRegistry } from "../fixtures/definitions/index";

const check = (input: unknown) => validateWith(input, fixtureRegistry);

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

describe("envelope: the description is a JSON object (GSV-REQ-001, GSV-REQ-005)", () => {
  class Shape {
    type = "circle";
    radius = 2;
  }

  it.each([
    ["an array", [{ type: "circle" }], "a list"],
    ["a string", "circle", '"circle"'],
    ["JSON text, which is never parsed", '{"type":"circle","radius":2}', '"{\\"type\\":\\"circle\\",\\"radius\\":2}"'],
    ["a number", 5, "5"],
    ["null", null, "null"],
    ["undefined", undefined, "nothing"],
    ["a boolean", true, "true"],
    ["a Date", new Date(0), "an object"],
    ["a class instance", new Shape(), "an object"],
    ["a function", () => ({ type: "circle" }), "a function"],
  ])("rejects %s with exactly one not_an_object issue", (_name, input, shown) => {
    const issues = issuesOf(check(input));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "not_an_object", path: "" });
    expect(issues[0]!.message).toContain(`got ${shown}`);
  });

  it("accepts an object with no prototype", () => {
    const description = Object.assign(Object.create(null) as object, { type: "circle", radius: 2 });
    expect(check(description).valid).toBe(true);
  });
});

describe("envelope: the graph type (GSV-REQ-002, GSV-REQ-024)", () => {
  it("reports a missing type, lists the supported types, and checks nothing else", () => {
    const issues = issuesOf(check({ radius: -1, colour: "red" }));
    expect(issues).toEqual([
      {
        code: "unknown_graph_type",
        path: "/type",
        message: "type is required; use one of: number-line, xy-graph, circle.",
        allowed: ["number-line", "xy-graph", "circle"],
      },
    ]);
  });

  it.each([["pie"], ["Circle"], [""], [7], [null], [["circle"]], ["toString"], ["__proto__"]])(
    "reports the unknown type %j and checks nothing else",
    (type) => {
      const issues = issuesOf(check({ type, radius: "big" }));
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ code: "unknown_graph_type", path: "/type", allowed: ["number-line", "xy-graph", "circle"] });
    },
  );

  it("treats a declared type with no registered definition as unknown", () => {
    expect(issuesOf(check({ type: "cube", edgeLength: 2 }))[0]).toMatchObject({ code: "unknown_graph_type" });
  });

  it("lists every declared type while no definition is registered yet", () => {
    // The real registry is empty until the type tickets land (DEL-001).
    expect(issuesOf(validate({ type: "pie" }))[0]!.allowed).toEqual([...GRAPH_TYPES]);
  });
});

describe("envelope: the schema version (GSV-REQ-006, GSV-REQ-025)", () => {
  it("validates a description without a version against the current one", () => {
    expect(check({ type: "circle", radius: 2 }).valid).toBe(true);
    expect(check({ type: "circle", radius: 2, version: undefined }).valid).toBe(true);
  });

  it("accepts the current version and keeps it", () => {
    const result = check({ type: "circle", radius: 2, version: 1 });
    expect(result).toMatchObject({ valid: true, description: { type: "circle", version: 1, radius: 2 } });
  });

  it.each([[2], [0], [1.5], ["1"], [null], [true], [{}]])("reports the unsupported version %j and checks nothing else", (version) => {
    const issues = issuesOf(check({ type: "circle", radius: "big", version }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "unsupported_version", path: "/version", allowed: ["1"] });
  });

  it("reports an unknown type and an unsupported version together, and nothing else", () => {
    expect(issuesOf(check({ type: "pie", version: 3, radius: -1 })).map((issue) => issue.code)).toEqual([
      "unknown_graph_type",
      "unsupported_version",
    ]);
  });
});
