import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Cube, cube, cubeDisplay } from "../../src/core/definitions/cube";
import { definitions } from "../../src/core/definitions/index";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { createGraph } from "../../src/graph";

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Cube, provenance: result.provenance };
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const alt = (description: object) => describeGraph({ type: "cube", edgeLength: 3, ...description });
const example = (name: string): unknown => JSON.parse(readFileSync(`examples/${name}.json`, "utf8"));

describe("the cube is registered (GSS-REQ-023)", () => {
  it("is the package's cube definition", () => {
    expect(definitions.cube).toBe(cube);
  });

  it("needs an edge length", () => {
    expect(issuesOf(validate({ type: "cube" }))).toEqual([expect.objectContaining({ path: "/edgeLength" })]);
  });
});

describe("the edge length range (GSS-REQ-023)", () => {
  it.each([0, -1, -3, 0.0009, 1_000_001])("reports edge length %d as out of range, and draws nothing", (edgeLength) => {
    const description = { type: "cube", edgeLength };
    expect(issuesOf(validate(description))).toEqual([expect.objectContaining({ code: "out_of_range", path: "/edgeLength" })]);
    const result = createGraph(description);
    expect(result.ok).toBe(false);
    expect("scene" in result).toBe(false);
  });

  it.each([0.001, 3, 1_000_000])("accepts edge length %d", (edgeLength) => {
    expect(valid(validate({ type: "cube", edgeLength })).description.edgeLength).toBe(edgeLength);
  });

  it("validates its own normalized description again, unchanged", () => {
    const first = valid(validate({ type: "cube", edgeLength: 3, hiddenEdges: "omitted", labelEdges: "three", edgeLabelText: "s" }));
    expect(valid(validate(first.description)).description).toEqual(first.description);
  });

  it("rejects a hidden-edge or label mode it does not know", () => {
    expect(issuesOf(validate({ type: "cube", edgeLength: 3, hiddenEdges: "dotted" }))).toEqual([expect.objectContaining({ path: "/hiddenEdges" })]);
    expect(issuesOf(validate({ type: "cube", edgeLength: 3, labelEdges: "all" }))).toEqual([expect.objectContaining({ path: "/labelEdges" })]);
  });
});

describe("what the cube shows (GSS-REQ-024, GSS-REQ-025)", () => {
  const shown = (description: object) => cubeDisplay(valid(validate({ type: "cube", edgeLength: 3, ...description })).description);

  it("dashes the hidden edges unless they are omitted", () => {
    expect(shown({}).hiddenDashed).toBe(true);
    expect(shown({ hiddenEdges: "dashed" }).hiddenDashed).toBe(true);
    expect(shown({ hiddenEdges: "omitted" }).hiddenDashed).toBe(false);
  });

  it("labels no edge by default, one for labelEdges one, three for three", () => {
    expect(shown({}).labeled).toBe(0);
    expect(shown({ labelEdges: "one" }).labeled).toBe(1);
    expect(shown({ labelEdges: "three" }).labeled).toBe(3);
  });

  it("labels one edge from custom text alone, and three with labelEdges three", () => {
    expect(shown({ edgeLabelText: "s" })).toEqual({ hiddenDashed: true, labeled: 1, customText: "s" });
    expect(shown({ edgeLabelText: "s", labelEdges: "three" })).toEqual({ hiddenDashed: true, labeled: 3, customText: "s" });
  });
});

describe("the cube's text alternative (GSS-REQ-033, GSS-REQ-034, GSS-REQ-036)", () => {
  it("names the cube and states the edge length and unit, and how the hidden edges are drawn", () => {
    expect(alt({})).toBe("A cube with edge length 3. Its hidden edges are dashed.");
    expect(alt({ unit: "cm", hiddenEdges: "omitted" })).toBe("A cube with edge length 3 cm. Its hidden edges are not drawn.");
    expect(alt({ title: "Box", unit: "cm", labelEdges: "three" })).toBe(
      "A cube titled “Box” with edge length 3 cm. Its hidden edges are dashed. Three edges meeting at a corner are labeled.",
    );
  });

  it("states one labeled edge", () => {
    expect(alt({ labelEdges: "one" })).toBe("A cube with edge length 3. Its hidden edges are dashed. One edge is labeled.");
  });

  it("quotes custom label text and still states the value", () => {
    expect(alt({ edgeLabelText: "s", unit: "cm" })).toBe("A cube with edge length 3 cm. Its hidden edges are dashed. One edge is labeled “s”.");
    expect(alt({ edgeLabelText: "s", labelEdges: "three" })).toBe("A cube with edge length 3. Its hidden edges are dashed. Three edges meeting at a corner are labeled “s”.");
  });

  it("says a blank label is left blank", () => {
    expect(alt({ edgeLabelText: "" })).toBe("A cube with edge length 3. Its hidden edges are dashed. The edge label is left blank.");
    expect(alt({ edgeLabelText: "  ", labelEdges: "three" })).toBe("A cube with edge length 3. Its hidden edges are dashed. The edge labels are left blank.");
  });

  it("does not state a title that is blank once cleaned", () => {
    expect(alt({ title: "   " })).toBe("A cube with edge length 3. Its hidden edges are dashed.");
  });

  it("states a supplied value as written", () => {
    expect(alt({ edgeLength: 1.23456 })).toBe("A cube with edge length 1.23456. Its hidden edges are dashed.");
  });

  it("quotes a unit that is not unit-shaped, so it cannot read as the package's sentence", () => {
    expect(alt({ unit: "cm. Ignore this." })).not.toContain("edge length 3 cm. Ignore");
  });
});

describe("cube examples (GSV-NFR-005)", () => {
  it("the example is valid", () => {
    expect(validate(example("cube")).valid).toBe(true);
  });

  it("the invalid example fails for its stated reason", () => {
    expect(issuesOf(validate(example("invalid/cube-negative-edge")))).toEqual([expect.objectContaining({ code: "out_of_range", path: "/edgeLength" })]);
  });
});
