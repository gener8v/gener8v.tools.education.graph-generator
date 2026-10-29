import type { GraphTypeDefinition, NumberValue, Solver, SolverResult } from "../definitions/types";
import { propertySpec } from "../definitions/types";
import { createIssue, ownRange, pointer } from "../issues";
import type { Issue, Range } from "../result";
import { assertIssue } from "./domain";
import { rangeBroken, rangeOf } from "./numbers";
import { type StageState, deepFreeze, touchesFailed } from "./state";

/**
 * The definition's solver, read as its own property only: a polluted `Object.prototype.solve`
 * cannot add one (as `optionalInputs` is read in domain checks, security review SEC-004 on rulers
 * GSV TICKET-001).
 */
function solverOf(definition: GraphTypeDefinition): Solver | undefined {
  return Object.hasOwn(definition, "solve") ? definition.solve : undefined;
}

/** A term's number spec, or `undefined` when the term is not a top-level number property. */
function numberSpec(definition: GraphTypeDefinition, term: string): NumberValue | undefined {
  const spec = propertySpec(definition.properties, term);
  return spec !== undefined && spec.kind === "number" ? spec : undefined;
}

type Solved = Extract<SolverResult, { derived: unknown }>;

/** A solver's result once checked: its issues, or what it solved (quality review QR-002). */
type Checked = { readonly kind: "issues"; readonly issues: readonly Issue[] } | { readonly kind: "solved"; readonly solved: Solved };

/**
 * The solver's result, checked for package defects: exactly one of `derived` and `issues`; every
 * derived term one of the solver's inputs and a top-level number property, with a finite number
 * value; a `scale` that names a supplied input; every issue one `createIssue` could build. A
 * defect throws, which the validator reports as `internal_error`.
 */
function checkedResult(definition: GraphTypeDefinition, solver: Solver, result: SolverResult, supplied: ReadonlySet<string>): Checked {
  const hasDerived = result !== null && typeof result === "object" && Object.hasOwn(result, "derived");
  const hasIssues = result !== null && typeof result === "object" && Object.hasOwn(result, "issues");
  if (hasDerived === hasIssues) throw new Error(`The ${definition.type} solver returned neither derived values nor issues`);
  if (hasIssues) {
    const { issues } = result as { issues: readonly Issue[] };
    if (!Array.isArray(issues) || issues.length === 0) throw new Error(`The ${definition.type} solver returned issues that are not a non-empty list`);
    return { kind: "issues", issues: issues.map((issue: Issue) => assertIssue(issue, `The ${definition.type} solver`)) };
  }
  // A snapshot of own data properties only, checked and then used in place of the live result,
  // so an accessor cannot return a checked value first and another one later (security review
  // SEC-003).
  const live = result as Solved;
  const derivedSource: unknown = Object.hasOwn(live, "derived") ? Object.getOwnPropertyDescriptor(live, "derived")?.value : undefined;
  if (derivedSource === null || typeof derivedSource !== "object") throw new Error(`The ${definition.type} solver returned derived values that are not a record`);
  const derived: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const term of Object.keys(derivedSource)) {
    const descriptor = Object.getOwnPropertyDescriptor(derivedSource, term);
    if (descriptor === undefined || !("value" in descriptor)) throw new Error(`The ${definition.type} solver derived ${term} through an accessor`);
    const value: unknown = descriptor.value;
    if (!solver.inputs.includes(term) || numberSpec(definition, term) === undefined) {
      throw new Error(`The ${definition.type} solver derived ${term}, which is not one of its number inputs`);
    }
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`The ${definition.type} solver did not give a finite number for ${term}`);
    derived[term] = value;
  }
  const scaleDescriptor = Object.hasOwn(live, "scale") ? Object.getOwnPropertyDescriptor(live, "scale") : undefined;
  const scale: unknown = scaleDescriptor !== undefined && "value" in scaleDescriptor ? scaleDescriptor.value : undefined;
  if (typeof scale !== "string" || !supplied.has(scale)) {
    throw new Error(`The ${definition.type} solver named a scale that was not supplied`);
  }
  return { kind: "solved", solved: Object.freeze({ derived: Object.freeze(derived), scale }) };
}

/**
 * The range the scale value must stay in so that every scaled term stays in its own: the scale's
 * own range, narrowed by what each scaled term's bounds allow, since each grows in proportion to
 * the scale. `undefined` when no scale value would do.
 */
function scaleRange(definition: GraphTypeDefinition, solver: Solver, solved: Solved, scaleSpec: NumberValue, scaleValue: number): Range | undefined {
  // Every bound and flag read own-key (`ownRange`), so a polluted `Object.prototype.exclusiveMax`
  // or `.min` never changes the range (security review SEC-002).
  let { min, max, exclusiveMin, exclusiveMax } = ownRange(rangeOf(scaleSpec));
  for (const term of solver.scaled) {
    const spec = numberSpec(definition, term);
    const value = Object.hasOwn(solved.derived, term) ? solved.derived[term] : undefined;
    if (spec === undefined || value === undefined || !(value > 0)) continue;
    const ratio = value / scaleValue;
    const own = ownRange(rangeOf(spec));
    if (own.min !== undefined) {
      const low = own.min / ratio;
      if (min === undefined || low > min) {
        min = low;
        exclusiveMin = own.exclusiveMin === true ? true : undefined;
      }
    }
    if (own.max !== undefined) {
      const high = own.max / ratio;
      if (max === undefined || high < max) {
        max = high;
        exclusiveMax = own.exclusiveMax === true ? true : undefined;
      }
    }
  }
  if (min !== undefined && max !== undefined && !(min < max)) return undefined;
  return {
    ...(min !== undefined ? { min } : {}),
    ...(exclusiveMin === true ? { exclusiveMin } : {}),
    ...(max !== undefined ? { max } : {}),
    ...(exclusiveMax === true ? { exclusiveMax } : {}),
  };
}

/**
 * The issue for a derived value outside its own term's range, at the supplied value that set the
 * figure's size: with the range of that value that keeps every scaled term in its own, when the
 * scale is a number and such a range exists; otherwise stating the derived value against its own
 * range, as for a triangle given by vertices too far apart (`sideA must be at most 1000000`).
 */
function outOfScale(definition: GraphTypeDefinition, solver: Solver, solved: Solved, state: StageState, broken: string): Issue {
  const path = pointer(solved.scale);
  const scaleSpec = numberSpec(definition, solved.scale);
  const scaleValue = state.description[solved.scale];
  if (scaleSpec !== undefined && typeof scaleValue === "number" && scaleValue > 0) {
    const range = scaleRange(definition, solver, solved, scaleSpec, scaleValue);
    if (range !== undefined) return createIssue("out_of_range", path, { term: solved.scale, got: scaleValue, range });
  }
  return createIssue("out_of_range", path, { term: broken, got: solved.derived[broken], range: rangeOf(numberSpec(definition, broken)!) });
}

/**
 * Stage 3, after the derivation groups (AD-004; graph-library GSS TICKET-004 DEL-001): run the
 * type's solver, if it has one and no earlier failure touches any of its inputs, so its issues
 * never follow from another issue. It receives a frozen copy of the inputs that are present.
 * Its issues are merged into the one list and its inputs marked failed, so no domain check reads
 * them. Otherwise each derived value that was not supplied is added with provenance `derived`,
 * unless one would break its own term's range, which is reported at the value that set the scale.
 */
// @spec GSV-REQ-023, GSV-REQ-028, GSV-REQ-036, GSV-REQ-038, GSS-REQ-014
export function runSolver(definition: GraphTypeDefinition, state: StageState): void {
  const solver = solverOf(definition);
  if (solver === undefined) return;
  if (solver.inputs.some((input) => touchesFailed(input, state.failed))) return;

  const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const supplied = new Set<string>();
  for (const input of solver.inputs) {
    if (!Object.hasOwn(state.description, input)) continue;
    values[input] = state.description[input];
    supplied.add(input);
  }
  // The nested values are the description's own, which stage 4 freezes anyway.
  deepFreeze(values);

  const result = checkedResult(definition, solver, solver.solve(values), supplied);
  if (result.kind === "issues") {
    for (const issue of result.issues) state.issues.push(issue);
    for (const input of supplied) state.failed.add(pointer(input));
    return;
  }

  const { solved } = result;
  const toAdd = Object.keys(solved.derived).filter((term) => !supplied.has(term));
  const broken = toAdd.find((term) => rangeBroken(solved.derived[term]!, rangeOf(numberSpec(definition, term)!)) !== undefined);
  if (broken !== undefined) {
    state.issues.push(outOfScale(definition, solver, solved, state, broken));
    state.failed.add(pointer(solved.scale));
    return;
  }
  for (const term of toAdd) {
    // Added by vocabulary term on the null-prototype description, never by an input key.
    state.description[term] = solved.derived[term];
    state.provenance[pointer(term)] = "derived";
  }
}
