import { afterEach, describe, expect, it } from "vitest";
import {
  type DescriptionBase,
  type GraphType,
  type GraphTypeDefinition,
  type Solver,
  type SolverResult,
  defineProperties,
} from "../../src/core/definitions/types";
import { createIssue, pointer } from "../../src/core/issues";
import type { Issue, ValidationResult } from "../../src/core/result";
import { withinTolerance } from "../../src/core/validate/derive";
import { validateWith } from "../../src/core/validate/index";

/** A test-only rectangle: its width and height determine its diagonal. */
interface Rectangle extends DescriptionBase {
  type: "square";
  width?: number;
  height?: number;
  diagonal?: number;
  shaded?: boolean;
}

const length = (term: string, max: number) =>
  ({ term, kind: "number", required: false, min: 1, max, description: `The ${term}, from 1 to ${max}.` }) as const;

/** Width and height define the rectangle; a supplied diagonal is a statement to check. */
const rectangleSolver: Solver<Rectangle> = {
  inputs: ["width", "height", "diagonal"],
  scaled: ["width", "height", "diagonal"],
  solve: (values) => {
    if (values.width === undefined || values.height === undefined) {
      return { issues: [createIssue("insufficient", pointer(), { term: "square", detail: "width and height are needed" })] };
    }
    const diagonal = Math.hypot(values.width, values.height);
    if (values.diagonal !== undefined && !withinTolerance(values.diagonal, diagonal)) {
      return {
        issues: [
          createIssue("contradiction", pointer("diagonal"), {
            term: "diagonal",
            got: values.diagonal,
            conflicts: [pointer("width"), pointer("height")],
            conflictTerms: ["width", "height"],
            agreeingValue: diagonal,
          }),
        ],
      };
    }
    return { derived: { width: values.width, height: values.height, diagonal }, scale: "width" };
  },
};

const rectangle = (solve: Solver<Rectangle> | null = rectangleSolver, extra: Partial<GraphTypeDefinition<Rectangle>> = {}): GraphTypeDefinition<Rectangle> => ({
  type: "square",
  title: "Rectangle",
  description: "A test-only rectangle.",
  properties: defineProperties({
    width: length("width", 100),
    height: length("height", 100),
    diagonal: length("diagonal", 120),
    shaded: { term: "shaded", kind: "boolean", required: false, description: "Whether it is shaded." },
  }),
  derivations: [],
  checks: [],
  ...(solve === null ? {} : { solve }),
  ...extra,
  describe: () => "A rectangle.",
});

const registryOf = (definition: GraphTypeDefinition<Rectangle>) =>
  ({ square: definition as unknown as GraphTypeDefinition }) as Partial<Record<GraphType, GraphTypeDefinition>>;

const check = (input: object, definition = rectangle()) => validateWith({ type: "square", ...input }, registryOf(definition));

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return result;
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (result: ValidationResult<unknown>) => issuesOf(result).map((issue) => `${issue.code} ${issue.path}`);

/** A solver that records what it was handed and returns a fixed result. */
function returning(result: SolverResult, seen: unknown[] = []): Solver<Rectangle> {
  return { ...rectangleSolver, solve: (values) => (seen.push(values), result) };
}

describe("the stage-3 solver (graph-library GSS TICKET-004 DEL-001; AD-004)", () => {
  it("adds the values it derives that were not supplied, with provenance derived (GSV-REQ-028)", () => {
    const result = valid(check({ width: 3, height: 4 }));
    expect(result.description).toEqual({ type: "square", width: 3, height: 4, diagonal: 5 });
    expect(result.provenance).toEqual({ "/width": "supplied", "/height": "supplied", "/diagonal": "derived" });
  });

  it("never changes a supplied value, even when the solver derives it slightly differently (GSV-REQ-038)", () => {
    const result = valid(check({ width: 3, height: 4, diagonal: 5.04 }));
    expect(result.description).toEqual({ type: "square", width: 3, height: 4, diagonal: 5.04 });
    expect(result.provenance["/diagonal"]).toBe("supplied");

    const other = valid(check({ width: 3, height: 4 }, rectangle(returning({ derived: { width: 99, height: 4, diagonal: 5 }, scale: "width" }))));
    expect(other.description).toMatchObject({ width: 3, diagonal: 5 });
  });

  it("merges its issues into the one list with stage 2's (GSV-REQ-017)", () => {
    expect(codesAndPaths(check({ width: 3, height: 4, diagonal: 9, shaded: "yes" }))).toEqual(["wrong_kind /shaded", "contradiction /diagonal"]);
    expect(codesAndPaths(check({ width: 3, sparkle: 1 }))).toEqual(["unknown_property /sparkle", "insufficient "]);
  });

  it("is skipped when an earlier failure touches any of its inputs, so no issue follows from another", () => {
    const seen: unknown[] = [];
    const definition = rectangle(returning({ derived: { diagonal: 5 }, scale: "width" }, seen));
    expect(codesAndPaths(check({ width: "wide", height: 4 }, definition))).toEqual(["wrong_kind /width"]);
    expect(codesAndPaths(check({ width: 3, height: 0 }, definition))).toEqual(["out_of_range /height"]);
    expect(seen).toEqual([]);
    // Without the solver skip, the missing width would also be reported as insufficient.
    expect(codesAndPaths(check({ width: "wide", height: 4 }))).toEqual(["wrong_kind /width"]);
  });

  it("still runs when a failure is somewhere it does not read", () => {
    expect(codesAndPaths(check({ width: 3, shaded: 1 }))).toEqual(["wrong_kind /shaded", "insufficient "]);
  });

  it("runs before the domain checks, which read its derived values, and after the derivation groups", () => {
    const seen: unknown[] = [];
    const definition = rectangle(rectangleSolver, {
      checks: [{ name: "reads the diagonal", inputs: ["diagonal"], check: (description) => (seen.push(description.diagonal), []) }],
    });
    valid(check({ width: 3, height: 4 }, definition));
    expect(seen).toEqual([5]);
  });

  it("marks its inputs failed when it reports an issue, so no domain check reads them", () => {
    const seen: unknown[] = [];
    const definition = rectangle(rectangleSolver, {
      checks: [{ name: "reads the width", inputs: ["width"], check: (description) => (seen.push(description.width), []) }],
    });
    expect(codesAndPaths(check({ width: 3 }, definition))).toEqual(["insufficient "]);
    expect(seen).toEqual([]);
  });

  it("hands the solver a frozen copy of only the inputs that are present", () => {
    const seen: Array<Record<string, unknown>> = [];
    const definition = rectangle({ ...rectangleSolver, solve: (values) => (seen.push(values as Record<string, unknown>), rectangleSolver.solve(values)) });
    valid(check({ width: 3, height: 4, shaded: true }, definition));
    expect(Object.keys(seen[0]!).sort()).toEqual(["height", "width"]);
    expect(Object.isFrozen(seen[0])).toBe(true);
    expect(Object.getPrototypeOf(seen[0])).toBeNull();

    const changing = rectangle({
      ...rectangleSolver,
      solve: (values) => {
        (values as Record<string, unknown>)["width"] = 50;
        return rectangleSolver.solve(values);
      },
    });
    expect(issuesOf(check({ width: 3, height: 4 }, changing)).map((issue) => issue.code)).toEqual(["internal_error"]);
  });

  it("reports a derived value outside its own range at the value that set the scale, with the range that keeps every scaled term in its own", () => {
    const [issue, ...rest] = issuesOf(check({ width: 100, height: 100 }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/width", range: { min: 1 } });
    expect(issue!.range!.max).toBeCloseTo(120 / Math.SQRT2, 9);
    expect(issue!.message).toMatch(/^width must be a number between 1 and 84\.85\d*; got 100\.$/);
  });

  it("states the derived value against its own range when no scale value would do", () => {
    // A scale that is not a number: the derived value is stated with its own range, at the scale.
    const definition = rectangle(returning({ derived: { diagonal: 500 }, scale: "height" }), {
      properties: defineProperties({
        width: length("width", 100),
        height: { term: "height", kind: "boolean", required: false, description: "Not a number." },
        diagonal: length("diagonal", 120),
      }),
    });
    expect(issuesOf(check({ width: 3, height: true }, definition))).toEqual([
      expect.objectContaining({ code: "out_of_range", path: "/height", range: { min: 1, max: 120 }, message: "diagonal must be a number between 1 and 120; got 500." }),
    ]);
  });

  it.each<[string, SolverResult]>([
    ["a derived term that is not one of its inputs", { derived: { shaded: 1 }, scale: "width" }],
    ["a derived term that is not a property", { derived: { sparkle: 1 }, scale: "width" }],
    ["a value that is not a number", { derived: { diagonal: "5" as unknown as number }, scale: "width" }],
    ["a value that is not finite", { derived: { diagonal: Number.POSITIVE_INFINITY }, scale: "width" }],
    ["a value that is NaN", { derived: { diagonal: Number.NaN }, scale: "width" }],
    ["a scale that was not supplied", { derived: { diagonal: 5 }, scale: "diagonal" }],
    ["no scale", { derived: { diagonal: 5 } } as unknown as SolverResult],
    ["both derived values and issues", { derived: { diagonal: 5 }, scale: "width", issues: [] } as unknown as SolverResult],
    ["neither", {} as unknown as SolverResult],
    ["no result", undefined as unknown as SolverResult],
    ["an empty list of issues", { issues: [] }],
    ["a hand-built issue", { issues: [{ code: "not_a_code", path: "", message: "Bad." } as unknown as Issue] }],
    ["an issue with an overlong message", { issues: [{ code: "insufficient", path: "", message: "x".repeat(5_000) }] }],
  ])("treats %s as a package defect, reported as internal_error", (_name, result) => {
    expect(issuesOf(check({ width: 3, height: 4 }, rectangle(returning(result))))).toEqual([expect.objectContaining({ code: "internal_error", path: "" })]);
  });

  it("reports a solver that throws as internal_error", () => {
    const throwing = rectangle({
      ...rectangleSolver,
      solve: () => {
        throw new Error("boom");
      },
    });
    expect(issuesOf(check({ width: 3, height: 4 }, throwing)).map((issue) => issue.code)).toEqual(["internal_error"]);
  });

  describe("read as the definition's own property only", () => {
    afterEach(() => {
      delete (Object.prototype as Record<string, unknown>)["solve"];
    });

    it("ignores a solver added to Object.prototype", () => {
      const seen: unknown[] = [];
      (Object.prototype as Record<string, unknown>)["solve"] = returning({ issues: [createIssue("insufficient", "", { term: "square", detail: "polluted" })] }, seen);
      const result = valid(check({ width: 3, height: 4 }, rectangle(null)));
      expect(result.description).toEqual({ type: "square", width: 3, height: 4 });
      expect(seen).toEqual([]);
    });
  });
});
