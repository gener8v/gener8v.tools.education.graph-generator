import { cleanText, formatSupplied, quoteText } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { DEFAULT_INCH_DIVISION, INCH_DIVISIONS, type InchDivision, RULER_MAX_LENGTH, RULER_UNITS, type RulerUnit, isRulerLength, rulerScale } from "../ruler";
import { sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, defineProperties } from "./types";

/** The object lying along a ruler, from its start mark to its end mark (NLC-REQ-049). */
export interface MeasuredObject {
  readonly start: number;
  readonly end: number;
  readonly label?: string;
  readonly color?: string;
}

/** A normalized ruler description (NLC-REQ-040). */
export interface Ruler extends DescriptionBase {
  readonly type: "ruler";
  readonly rulerUnit: RulerUnit;
  readonly length: number;
  /** An inch ruler's smallest division; absent means a sixteenth (`rulerScale` applies the default). */
  readonly smallestDivision?: InchDivision;
  readonly measuredObject?: MeasuredObject;
  readonly title?: string;
}

/** The longest ruler of any unit, the structural bound on `length`. */
const LONGEST = Math.max(...Object.values(RULER_MAX_LENGTH));

/** How each unit is named in the text alternative and its abbreviation for a mark. */
const UNIT_WORDS: Readonly<Record<RulerUnit, { plural: string; singular: string; short: string; smallest: string }>> = Object.freeze({
  centimeters: { plural: "centimeters", singular: "centimeter", short: "cm", smallest: "millimeters" },
  inches: { plural: "inches", singular: "inch", short: "in", smallest: "" },
});

const DIVISION_WORDS: Readonly<Record<InchDivision, string>> = Object.freeze({
  half: "halves",
  quarter: "quarters",
  eighth: "eighths",
  sixteenth: "sixteenths",
});

/** A mark's value as written: 3.4, 2.0625, never exponent form. */
const markValue = (value: number) => formatSupplied(value);

/**
 * The ruler's terms (NLC-REQ-001, NLC-REQ-041, NLC-REQ-046, NLC-REQ-049, NLC-REQ-054; GSV-REQ-040,
 * GSV-REQ-049..051). The unit and division lists come from the mark rule (`src/core/ruler.ts`), so
 * they cannot drift from what is drawn. The term is `rulerUnit`, since `unit` is the circle's free
 * text (DEL-001). The division's condition is published from `appliesWhen`, never written here.
 */
// @spec NLC-REQ-001, NLC-REQ-041, NLC-REQ-042, NLC-REQ-046, NLC-REQ-049, NLC-REQ-054, GSV-REQ-040, GSV-REQ-049, GSV-REQ-050, GSV-REQ-051
const rulerProperties = defineProperties({
  rulerUnit: {
    term: "rulerUnit",
    kind: "enum",
    required: true,
    values: RULER_UNITS,
    valueDescriptions: {
      centimeters: "Numbered every centimeter, with a mark at every millimeter and longer marks at each half centimeter.",
      inches: "Numbered every inch, with a mark at every multiple of the smallest division, graded by fraction.",
    },
    description: "The unit a ruler is marked in: centimeters or inches.",
  },
  length: {
    term: "length",
    kind: "integer",
    required: true,
    min: 1,
    max: LONGEST,
    description: `How many whole units a ruler is long: 1 to ${RULER_MAX_LENGTH.centimeters} for centimeters, 1 to ${RULER_MAX_LENGTH.inches} for inches.`,
  },
  smallestDivision: {
    term: "smallestDivision",
    kind: "enum",
    required: false,
    values: Object.keys(INCH_DIVISIONS) as [InchDivision, ...InchDivision[]],
    valueDescriptions: {
      half: "Marks at every half inch.",
      quarter: "Marks at every quarter inch.",
      eighth: "Marks at every eighth of an inch.",
      sixteenth: "Marks at every sixteenth of an inch.",
    },
    description: `The smallest division an inch ruler is marked to; ${DEFAULT_INCH_DIVISION} when left out.`,
    appliesWhen: { term: "rulerUnit", values: ["inches"] },
  },
  measuredObject: {
    term: "measuredObject",
    kind: "object",
    required: false,
    description:
      "An object lying along the ruler, to be measured, drawn as a bar from its start mark to its end mark; its length is never written on the figure.",
    properties: defineProperties({
      // No structural bounds on the ends: whether an end is on the ruler is decided with the mark
      // rule's noise allowance (`locate`), so a computed 30.000000000000004 is the 30 cm end. A
      // bound here would refuse it first (DEL-004).
      start: {
        term: "start",
        kind: "number",
        required: true,
        description:
          "The ruler mark the object starts at, in the ruler's unit, as a decimal: a whole millimeter on a centimeter ruler (3.4), a multiple of the smallest division on an inch ruler (2.0625 for 2 1/16). Any mark from 0 to the ruler's length.",
      },
      end: {
        term: "end",
        kind: "number",
        required: true,
        description: "The ruler mark the object ends at, after its start, given as the start is.",
      },
      label: sharedProperties.label,
      color: sharedProperties.color,
    }),
    ordered: [["start", "end"]],
  },
});

/** An inch ruler longer than 12, which the structural bound of 30 lets through (NLC-REQ-042). */
// @spec NLC-REQ-042
const lengthFitsUnit: DomainCheck<Ruler> = {
  name: "the length fits the ruler's unit",
  inputs: ["rulerUnit", "length"],
  check: (ruler) =>
    isRulerLength(ruler.rulerUnit, ruler.length)
      ? []
      : [createIssue("out_of_range", pointer("length"), { term: "length", got: ruler.length, range: { min: 1, max: RULER_MAX_LENGTH[ruler.rulerUnit] } })],
};

/**
 * The measured object's ends, located with the mark rule's one allowance (`rulerScale(…).locate`,
 * NLC TICKET-001): each end off the ruler is `out_of_range`, each end between marks `not_on_mark`
 * naming its neighbours, and an object whose ends are marks in the wrong order (0.3 and 0.1 + 0.2,
 * which `ordered` lets through) is `out_of_range` at its end, once. Off the ruler wins over between
 * marks, and order is checked only when both ends are marks, so one fault gives one issue (AD-004).
 * The division is an optional input: absent means the default sixteenth, so the check still runs,
 * and a refused or inapplicable one skips it (NLC TICKET-001 code review CR-001).
 */
// @spec NLC-REQ-051, NLC-REQ-052, NLC-REQ-053
const objectOnMarks: DomainCheck<Ruler> = {
  name: "the measured object lies on the ruler, from mark to mark, start before end",
  inputs: ["rulerUnit", "length", "measuredObject/start", "measuredObject/end"],
  optionalInputs: ["smallestDivision"],
  check: (ruler) => {
    const object = ruler.measuredObject;
    const scale = rulerScale(ruler.rulerUnit, ruler.length, ruler.smallestDivision);
    // A length too long for its unit is the length check's to report.
    if (object === undefined || scale === undefined) return [];
    const issues: Issue[] = [];
    const ends = (["start", "end"] as const).map((term) => {
      const location = scale.locate(object[term]);
      const path = pointer("measuredObject", term);
      const termName = `measuredObject.${term}`;
      if (location.kind === "off") {
        issues.push(createIssue("out_of_range", path, { term: termName, got: object[term], range: { min: 0, max: ruler.length } }));
      } else if (location.kind === "between") {
        issues.push(createIssue("not_on_mark", path, { term: termName, got: object[term], below: location.below, above: location.above }));
      }
      return location;
    });
    const [start, end] = ends;
    if (start?.kind === "mark" && end?.kind === "mark" && !(start.index < end.index)) {
      issues.push(
        createIssue("out_of_range", pointer("measuredObject", "end"), {
          term: "measuredObject.end",
          got: object.end,
          range: { min: start.value, exclusiveMin: true },
        }),
      );
    }
    return issues;
  },
};

/**
 * The ruler (NLC-REQ-040..056): a unit and a whole length, an inch ruler's optional smallest
 * division, and an optional measured object from any mark to any later mark, with the shared label
 * and color. Defined here and registered with its layout (rulers NLC TICKET-003; DEL-002).
 */
// @spec NLC-REQ-001, NLC-REQ-041, NLC-REQ-046, NLC-REQ-049, NLC-REQ-054
export const ruler: GraphTypeDefinition<Ruler> = {
  type: "ruler",
  title: "Ruler",
  description: `A ruler in centimeters or inches, drawn to scale with itself (not at true physical size), with whole units numbered from 0, and optionally an object lying along it from one mark to another, for "how long is it?" questions. A centimeter ruler is up to ${RULER_MAX_LENGTH.centimeters} cm long and an inch ruler up to ${RULER_MAX_LENGTH.inches} in.`,
  properties: rulerProperties,
  derivations: [],
  checks: [lengthFitsUnit, objectOnMarks],
  elementsHint: "the measuredObject",
  /**
   * "A ruler titled “Pencils”, 6 inches long, numbered every inch and marked to eighths of an
   * inch. An object labeled “pencil” lies along it from the 1.5 in mark to the 4.25 in mark." The
   * smallest division is the one drawn (the default when none is given); the object's length is
   * never stated, so it is read from the ruler (NLC-REQ-055).
   */
  // @spec NLC-REQ-056
  describe: (ruler: Ruler) => {
    const words = UNIT_WORDS[ruler.rulerUnit];
    const title = ruler.title === undefined ? "" : cleanText(ruler.title);
    const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
    const long = `${ruler.length} ${ruler.length === 1 ? words.singular : words.plural} long`;
    const marked =
      ruler.rulerUnit === "centimeters"
        ? `numbered every centimeter and marked to ${words.smallest}`
        : `numbered every inch and marked to ${DIVISION_WORDS[ruler.smallestDivision ?? DEFAULT_INCH_DIVISION]} of an inch`;
    const sentences = [`A ruler${titled}, ${long}, ${marked}.`];
    const object = ruler.measuredObject;
    if (object !== undefined) {
      const label = object.label === undefined ? "" : cleanText(object.label);
      const named = label === "" ? "An object" : `An object labeled ${quoteText(label)}`;
      sentences.push(`${named} lies along it from the ${markValue(object.start)} ${words.short} mark to the ${markValue(object.end)} ${words.short} mark.`);
    }
    return sentences.join(" ");
  },
};
