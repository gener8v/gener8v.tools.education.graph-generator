import fc from "fast-check";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { GRAPH_TYPES, type GraphType } from "../../src/core/definitions/types";
import { validate } from "../../src/core/index";
import { RULER_MAX_LENGTH, rulerScale } from "../../src/core/ruler";
import { barGraphArb, lineGraphArb, nameArb, pictographArb } from "./data-graphs";
import { numberLineArb, xyGraphArb, xyzGraphArb } from "./nlc-generators";
import { oneClusterTexts, wordsOf } from "./plain-text";

// fast-check arbitraries for valid descriptions of every graph type in GRAPH_TYPES, for the
// cross-engine markup comparison (graph-library CPSE TICKET-004, TR-002). The six axis and data
// graphs reuse their own generators (nlc-generators.ts, data-graphs.ts); the figures and the ruler
// are written here from their definitions, each given one defining measurement so the derived
// ones agree. Caller text runs up to `CALLER_TEXT_LIMIT` (`nameArb`: text at the limit, one
// cluster of marks with `oneClusterTexts(CALLER_TEXT_LIMIT)`, stacked marks and hostile text) and
// units up to `UNIT_TEXT_LIMIT`, where engines most likely differ. Every sample is filtered
// through `validate()`, so a layout never sees an invalid description.

const COLORS = ["red", "blue", "green", "orange", "#123456"] as const;

/** Keeps only descriptions the validator accepts. */
const valid = <T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T> => arbitrary.filter((description) => validate(description).valid);

/** Drops the keys whose value is undefined, so a description holds only the terms it gives. */
const given = (terms: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(terms).filter(([, value]) => value !== undefined));

const maybe = <T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> => fc.option(arbitrary, { nil: undefined });
const switchArb = fc.constantFrom(true, false, undefined);
const textArb = maybe(nameArb);
const colorArb = maybe(fc.constantFrom(...COLORS));

/** A unit, up to `UNIT_TEXT_LIMIT` characters: short ones, words at the limit, and one cluster of marks at the limit. */
const unitArb = maybe(
  fc.oneof(
    { weight: 4, arbitrary: fc.constantFrom("cm", "m", "in", "ft", "mm", "km", "square centimetres") },
    { weight: 1, arbitrary: fc.constant(wordsOf(UNIT_TEXT_LIMIT)) },
    { weight: 1, arbitrary: fc.constantFrom(...Object.values(oneClusterTexts(UNIT_TEXT_LIMIT))) },
  ),
);

/**
 * A length as a person writes it: whole numbers, tenths or hundredths in curriculum sizes, and now
 * and then the very smallest or largest length a figure accepts, which stresses the number formatting.
 */
const lengthArb = fc.oneof(
  { weight: 8, arbitrary: fc.tuple(fc.integer({ min: 1, max: 2000 }), fc.constantFrom(1, 10, 100)).map(([n, factor]) => n / factor) },
  { weight: 1, arbitrary: fc.constantFrom(0.001, 0.0123, 999_999, 1_000_000) },
);

/**
 * A measurement that can be drawn and labeled, with custom text: its switches never disagree (a
 * label or custom text with its drawing switch `false` is a contradiction), so few samples are dropped.
 */
const shownMeasurementArb = (drawn: string, labeled: string, text: string) =>
  fc
    .record({ label: switchArb, show: switchArb, custom: textArb })
    .map(({ label, show, custom }) =>
      given({
        [labeled]: label,
        [drawn]: label === true && show === false ? true : show,
        [text]: label === true ? custom : undefined,
      }),
    );

/** A measurement that can only be labeled: its switch, and custom text when labeled. */
const labeledMeasurementArb = (labeled: string, text: string) =>
  fc.record({ label: switchArb, custom: textArb }).map(({ label, custom }) => given({ [labeled]: label, [text]: label === true ? custom : undefined }));

/** The title, unit and line color every figure may have. */
const figureCommonArb = fc.record({ title: textArb, unit: unitArb, lineColor: colorArb }).map(given);

/** A valid circle: one of radius, diameter or circumference, the others derived. */
export const circleArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({
      defining: fc.constantFrom("radius", "diameter", "circumference"),
      value: lengthArb,
      radius: shownMeasurementArb("showRadius", "labelRadius", "radiusLabelText"),
      diameter: shownMeasurementArb("showDiameter", "labelDiameter", "diameterLabelText"),
      circumference: labeledMeasurementArb("labelCircumference", "circumferenceLabelText"),
      showCenter: switchArb,
      common: figureCommonArb,
    })
    .map(({ defining, value, radius, diameter, circumference, showCenter, common }) => ({
      type: "circle",
      [defining]: value,
      ...radius,
      ...diameter,
      ...circumference,
      ...given({ showCenter }),
      ...common,
    })),
);

/** A valid square: its side length, one side or all labeled, right angles marked or not. */
export const squareArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({ sideLength: lengthArb, labelSides: fc.constantFrom("one", "all", undefined), sideLabelText: textArb, showRightAngles: switchArb, common: figureCommonArb })
    .map(({ sideLength, labelSides, sideLabelText, showRightAngles, common }) => ({
      type: "square",
      sideLength,
      ...given({ labelSides, sideLabelText: labelSides === undefined ? undefined : sideLabelText, showRightAngles }),
      ...common,
    })),
);

/** A valid cube: its edge length, hidden edges dashed or left out, one edge or three labeled. */
export const cubeArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({ edgeLength: lengthArb, hiddenEdges: fc.constantFrom("dashed", "omitted", undefined), labelEdges: fc.constantFrom("one", "three", undefined), edgeLabelText: textArb, common: figureCommonArb })
    .map(({ edgeLength, hiddenEdges, labelEdges, edgeLabelText, common }) => ({
      type: "cube",
      edgeLength,
      ...given({ hiddenEdges, labelEdges, edgeLabelText: labelEdges === undefined ? undefined : edgeLabelText }),
      ...common,
    })),
);

/** A valid cylinder: one of radius or diameter, and its height. */
export const cylinderArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({
      defining: fc.constantFrom("radius", "diameter"),
      value: lengthArb,
      height: lengthArb,
      hiddenBase: fc.constantFrom("dashed", "omitted", undefined),
      radius: shownMeasurementArb("showRadius", "labelRadius", "radiusLabelText"),
      diameter: shownMeasurementArb("showDiameter", "labelDiameter", "diameterLabelText"),
      heightLabel: labeledMeasurementArb("labelHeight", "heightLabelText"),
      common: figureCommonArb,
    })
    .map(({ defining, value, height, hiddenBase, radius, diameter, heightLabel, common }) => ({
      type: "cylinder",
      [defining]: value,
      height,
      ...given({ hiddenBase }),
      ...radius,
      ...diameter,
      ...heightLabel,
      ...common,
    })),
);

/** An angle in degrees, whole or to a tenth. */
const angleArb = (min: number, max: number) => fc.integer({ min: min * 10, max: max * 10 }).map((tenths) => tenths / 10);

/**
 * One determining set of a triangle (its vertices, three sides, two sides and the angle between
 * them, or two angles and the side between them), so the other sides and angles are derived.
 */
const triangleSetArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
  fc
    .array(fc.record({ x: fc.integer({ min: -20, max: 20 }), y: fc.integer({ min: -20, max: 20 }) }), { minLength: 3, maxLength: 3 })
    .map((vertices) => ({ vertices })),
  fc.tuple(lengthArb, lengthArb, lengthArb).map(([sideA, sideB, sideC]) => ({ sideA, sideB, sideC })),
  fc.tuple(lengthArb, lengthArb, angleArb(1, 179)).map(([sideB, sideC, angleA]) => ({ sideB, sideC, angleA })),
  fc.tuple(angleArb(1, 120), angleArb(1, 58), lengthArb).map(([angleA, angleB, sideC]) => ({ angleA, angleB, sideC })),
);

const sideTextArb = fc.record({ sideALabelText: textArb, sideBLabelText: textArb, sideCLabelText: textArb });
const angleTextArb = fc.record({ angleALabelText: textArb, angleBLabelText: textArb, angleCLabelText: textArb });

/** A valid triangle: one determining set, sides and angles labeled or not, and vertex names. */
export const triangleArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({
      set: triangleSetArb,
      labelSides: fc.constantFrom("one", "all", undefined),
      sideTexts: sideTextArb,
      labelAngles: switchArb,
      angleTexts: angleTextArb,
      vertexNames: maybe(fc.tuple(nameArb, nameArb, nameArb)),
      common: figureCommonArb,
    })
    .map(({ set, labelSides, sideTexts, labelAngles, angleTexts, vertexNames, common }) => ({
      type: "triangle",
      ...set,
      ...given({ labelSides, labelAngles, vertexNames }),
      ...(labelSides === "all" && given(sideTexts)),
      ...(labelAngles === true && given(angleTexts)),
      ...common,
    })),
);

/** A valid ruler: a unit, a whole length, an inch ruler's division, and an object from one mark to a later one. */
export const rulerArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .oneof(
      fc.record({ rulerUnit: fc.constant("centimeters" as const), length: fc.integer({ min: 1, max: RULER_MAX_LENGTH.centimeters }), smallestDivision: fc.constant(undefined) }),
      fc.record({
        rulerUnit: fc.constant("inches" as const),
        length: fc.integer({ min: 1, max: RULER_MAX_LENGTH.inches }),
        smallestDivision: fc.constantFrom("half", "quarter", "eighth", "sixteenth", undefined),
      }),
    )
    .chain(({ rulerUnit, length, smallestDivision }) => {
      const marks = rulerScale(rulerUnit, length, smallestDivision)!.marks;
      const objectArb = fc
        .uniqueArray(fc.integer({ min: 0, max: marks.length - 1 }), { minLength: 2, maxLength: 2 })
        .chain(([a, b]) =>
          fc.record({ label: textArb, color: colorArb }).map(({ label, color }) => ({
            start: marks[Math.min(a!, b!)]!.value,
            end: marks[Math.max(a!, b!)]!.value,
            ...given({ label, color }),
          })),
        );
      return fc.record({ measuredObject: maybe(objectArb), title: textArb }).map(({ measuredObject, title }) => ({
        type: "ruler",
        rulerUnit,
        length,
        ...given({ smallestDivision, measuredObject, title }),
      }));
    }),
);

/** A valid description generator for every graph type. */
export const DESCRIPTION_ARBS: Readonly<Record<GraphType, fc.Arbitrary<Record<string, unknown>>>> = {
  "number-line": numberLineArb,
  ruler: rulerArb,
  "xy-graph": xyGraphArb,
  "xyz-graph": xyzGraphArb,
  "line-graph": lineGraphArb,
  "bar-graph": barGraphArb,
  pictograph: pictographArb,
  circle: circleArb,
  square: squareArb,
  triangle: triangleArb,
  cube: cubeArb,
  cylinder: cylinderArb,
};

/** A valid description of any graph type, each type equally likely. */
export const descriptionArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(...GRAPH_TYPES.map((type) => DESCRIPTION_ARBS[type]));

/**
 * `count` valid descriptions from a fixed seed, the same on every run. Throws when a graph type in
 * `GRAPH_TYPES` is not reached, so a check that runs over the sample covers every type.
 */
export function sampleDescriptions(count: number, seed: number): Record<string, unknown>[] {
  const sample = fc.sample(descriptionArb, { numRuns: count, seed });
  const reached = new Set(sample.map((description) => description.type));
  const missed = GRAPH_TYPES.filter((type) => !reached.has(type));
  if (missed.length > 0) throw new Error(`sampleDescriptions: no ${missed.join(", ")} description in ${count} samples from seed ${seed}`);
  return sample;
}

/** Every string in a description, at any depth: the caller text a check can look for. */
export function textsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(textsOf);
  return [];
}

/** The caller text at `CALLER_TEXT_LIMIT` a sample should reach: one cluster of marks per kind (hazard on CPSE TICKET-004). */
export const ONE_CLUSTER_TEXTS_AT_LIMIT: readonly string[] = Object.values(oneClusterTexts(CALLER_TEXT_LIMIT));
