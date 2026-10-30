import fc from "fast-check";
import { cleanText, findUnsafeTextChar } from "../../src/core/format";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { validate } from "../../src/core/index";
import { getImageNames } from "../../src/images/index";
import { BENIGN_TEXT, HOSTILE_TEXT, REAL_STACKED_TEXT, oneClusterTexts, wordsOf } from "./plain-text";

// fast-check arbitraries for valid line-graph, bar-graph and pictograph descriptions (graph-library
// DGP TICKET-006), reusable by the all-types schema agreement test (DEP-005). Category names are
// plain text of at most `CALLER_TEXT_LIMIT` characters: short words, names at the limit, text that
// carries stacked marks (`REAL_STACKED_TEXT`), and ordinary text with characters that mean
// something elsewhere (`BENIGN_TEXT`). Values are on a grid of whole numbers, tenths or hundredths,
// so they are written the way a person writes them. Every sample is filtered through `validate()`,
// so a layout never sees an invalid description.

const COLORS = ["red", "blue", "green", "#123456"] as const;

/** Keeps only descriptions the validator accepts. */
const valid = <T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T> => arbitrary.filter((description) => validate(description).valid);

/** A name of plain text, not blank once cleaned. */
const wordArb = fc.string({ unit: "grapheme-ascii", minLength: 1, maxLength: 24 }).filter((text) => cleanText(text) !== "");

/** Ordinary text with a double quotation mark and its lookalikes, which a text alternative must keep from closing its own quotes. */
const QUOTE_TEXT = ["Say “hi”", "5″ long", "«quoted»"] as const;

/** Exactly `CALLER_TEXT_LIMIT` characters, started by a short tag so two such names differ. */
const atLimitArb = fc.string({ unit: fc.constantFrom(..."abcdefghij0123456789"), minLength: 1, maxLength: 4 }).map((tag) => `${tag}${wordsOf(CALLER_TEXT_LIMIT - tag.length)}`);

/** Names at the limit in code points, not UTF-16 units: one cluster of marks, astral letters, and marks first (security review SEC-002). */
const LIMIT_TEXT = [...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT)), String.fromCodePoint(0x1d4d0).repeat(CALLER_TEXT_LIMIT), `${String.fromCodePoint(0x338, 0x20dd)}Cats`] as const;

/** The hostile strings the validator accepts, each kept or dropped by itself so no sample is discarded for one. */
const ACCEPTED_HOSTILE_TEXT = HOSTILE_TEXT.filter((text) => findUnsafeTextChar(text) === -1);

/** One category name. */
export const nameArb: fc.Arbitrary<string> = fc.oneof(
  { weight: 8, arbitrary: wordArb },
  { weight: 2, arbitrary: fc.constantFrom(...REAL_STACKED_TEXT) },
  { weight: 2, arbitrary: fc.constantFrom(...BENIGN_TEXT, ...QUOTE_TEXT) },
  { weight: 1, arbitrary: atLimitArb },
  { weight: 2, arbitrary: fc.constantFrom(...LIMIT_TEXT, ...ACCEPTED_HOSTILE_TEXT) },
);

/** How a name is compared for being the same one (the validator's rule is stricter; `valid` enforces it). */
const sameName = (name: string) => cleanText(name).normalize("NFC");

/** `count` categories with different names. */
const categoriesArb = (count: number) =>
  fc.uniqueArray(nameArb, { minLength: count, maxLength: count, selector: sameName }).map((names) => names.map((name) => ({ name })));

/** How many categories: a handful most of the time, and now and then a crowded graph. */
const countArb = (most: number) =>
  fc.oneof({ weight: 6, arbitrary: fc.integer({ min: 1, max: Math.min(8, most) }) }, { weight: 3, arbitrary: fc.integer({ min: 1, max: most }) });

/** A text of plain words for a title or label, or none. */
const textArb = fc.option(wordArb, { nil: undefined });

/** How many decimal places a description's values are written with. */
const placesArb = fc.constantFrom(0, 0, 1, 2);

/** `count` values from `low` to `high` on the grid of `places` decimals (never `-0`). */
const valuesArb = (count: number, low: number, high: number, places: number) => {
  const factor = 10 ** places;
  return fc.array(fc.integer({ min: Math.round(low * factor), max: Math.round(high * factor) }).map((n) => (n === 0 ? 0 : n / factor)), { minLength: count, maxLength: count });
};

/** The top of the values' range, and how many tick intervals a given scale divides it into. */
const topArb = fc.constantFrom(5, 10, 50, 100, 1000);
const stepsArb = fc.constantFrom(4, 5, 10, 20);

/**
 * A given value scale or none: its parts independently present. The maximum is the range's top, the
 * interval divides it, and the minimum, when given, is `minimum` (below every value), so every
 * given part is whole intervals from the others.
 */
const scaleArb = (top: number, steps: number, minimum: number) =>
  fc
    .record({ given: fc.boolean(), min: fc.boolean(), max: fc.boolean(), interval: fc.boolean() })
    .map(({ given, min, max, interval }) => ({
      ...(given && min && { minimum }),
      ...(given && max && { maximum: top }),
      ...(given && interval && { tickInterval: top / steps }),
    }))
    .map((scale) => (Object.keys(scale).length > 0 ? scale : undefined));

/** The title and axis labels a data graph may have. */
const labelsArb = fc.record({ title: textArb, categoryAxisLabel: textArb, valueAxisLabel: textArb }).map((labels) =>
  Object.fromEntries(Object.entries(labels).filter(([, text]) => text !== undefined)),
);

/** A valid line-graph description: 1 to 6 series, each a value per category (negative values too), a given scale or the default. */
export const lineGraphArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({ count: countArb(30), series: fc.oneof({ weight: 3, arbitrary: fc.integer({ min: 1, max: 3 }) }, { weight: 1, arbitrary: fc.integer({ min: 4, max: 6 }) }), top: topArb, steps: stepsArb, places: placesArb })
    .chain(({ count, series, top, steps, places }) =>
      fc.record({
        categories: categoriesArb(count),
        series: fc.tuple(
          ...Array.from({ length: series }, (_, s) =>
            fc.record({
              values: valuesArb(count, -top, top, places),
              lineLabel: fc.option(wordArb.map((word) => `L${s} ${word}`), { nil: undefined }),
              lineColor: fc.option(fc.constantFrom(...COLORS), { nil: undefined }),
            }),
          ),
        ),
        valueScale: scaleArb(top, steps, -top),
        labels: labelsArb,
      }),
    )
    .map(({ categories, series, valueScale, labels }) => ({
      type: "line-graph",
      categories,
      series: series.map(({ values, lineLabel, lineColor }) => ({ values, ...(lineLabel !== undefined && { lineLabel }), ...(lineColor !== undefined && { lineColor }) })),
      ...(valueScale !== undefined && { valueScale }),
      ...labels,
    })),
);

/** A valid bar-graph description: a value from 0 per category, upright or across, with a given scale or the default. */
export const barGraphArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({ count: countArb(30), top: topArb, steps: stepsArb, places: placesArb })
    .chain(({ count, top, steps, places }) =>
      fc.record({
        categories: categoriesArb(count),
        values: valuesArb(count, 0, top, places),
        orientation: fc.constantFrom("vertical", "horizontal", undefined),
        showValues: fc.constantFrom(true, false, undefined),
        valueScale: scaleArb(top, steps, 0),
        labels: labelsArb,
      }),
    )
    .map(({ categories, values, orientation, showValues, valueScale, labels }) => ({
      type: "bar-graph",
      categories,
      values,
      ...(orientation !== undefined && { orientation }),
      ...(showValues !== undefined && { showValues }),
      ...(valueScale !== undefined && { valueScale }),
      ...labels,
    })),
);

/** A valid pictograph description: values in quarters of the unit value, so no more than a few hundred pictures. */
export const pictographArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc
    .record({ count: countArb(16), unitValue: fc.constantFrom(0.25, 0.5, 1, 2, 3, 5, 10) })
    .chain(({ count, unitValue }) =>
      fc.record({
        categories: categoriesArb(count),
        quarters: fc.array(fc.integer({ min: 0, max: 96 }), { minLength: count, maxLength: count }),
        unitValue: fc.constant(unitValue),
        unitImage: fc.constantFrom(...getImageNames()),
        orientation: fc.constantFrom("horizontal", "vertical", undefined),
        valueUnitLabel: fc.oneof(
          { weight: 2, arbitrary: fc.constant(undefined) },
          { weight: 3, arbitrary: wordArb },
          { weight: 2, arbitrary: fc.constant("students") },
          { weight: 1, arbitrary: atLimitArb },
          // Short enough to read as a unit but for a quotation mark, which makes `describe` quote it (security review SEC-001).
          { weight: 1, arbitrary: fc.constantFrom("votes, “Fish” is 40", "5″ long", "«votes»", 'say "hi"') },
        ),
        title: textArb,
      }),
    )
    .map(({ categories, quarters, unitValue, unitImage, orientation, valueUnitLabel, title }) => ({
      type: "pictograph",
      categories,
      values: quarters.map((quarter) => (unitValue * quarter) / 4),
      unitImage,
      unitValue,
      ...(orientation !== undefined && { orientation }),
      ...(valueUnitLabel !== undefined && { valueUnitLabel }),
      ...(title !== undefined && { title }),
    })),
);
