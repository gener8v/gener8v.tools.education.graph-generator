import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { cleanText, isUnitShaped, quoteText } from "../../src/core/format";
import { validate } from "../../src/core/index";
import { REAL_STACKED_TEXT } from "../fixtures/plain-text";
import { barGraphLayout } from "../../src/layout/bar-graph";
import { lineGraphLayout } from "../../src/layout/line-graph";
import { pictographLayout } from "../../src/layout/pictograph";
import type { Layout } from "../../src/layout/registry";
import { barGraphArb, lineGraphArb, pictographArb } from "../fixtures/data-graphs";
import { loadExample } from "../fixtures/examples";

// DGP-NFR-003: the text alternative of every rendered data graph names every category and value in
// the description. Each name is compared as `describe` states it, through `cleanText` and
// `quoteText` (not the raw string), and each value as supplied: `String(value)` of a number written
// without an exponent is the text the caller wrote, never rounded as a drawn position is. A name and
// its value are one entry, and the entries of a list (a line graph's series, or the one list of a bar
// graph or pictograph) must follow each other in order, joined as a list is (", " and, before the
// last, " and "), to the end of the sentence, so "3" is not found in "3.5" nor "Cat" in "Cats", and
// an entry another series happens to share cannot stand in for a missing one. Each line-graph series'
// sentence starts with its own label (or "Series N"), so the sentences are located by their known
// heads in order, ending where the text ends, never by searching for the entries anywhere. The
// alternative read is the Scene's, so it is what a rendered graph carries. Generated descriptions
// are filtered through `validate()`; every assertion names the description. (graph-library DGP
// TICKET-006.)
const RUNS = 500;

interface Entry {
  readonly entry: string;
  readonly what: string;
}

/** One sentence the text alternative ends with: what it starts with, and the entries of its list. */
interface Sentence {
  readonly head: string;
  readonly entries: readonly Entry[];
}

/**
 * Why the sentences do not follow each other from `at` to the end of `text`, or `undefined` when they
 * do: each sentence is its head, its entries in order, and a full stop, a space between sentences.
 */
function mismatch(text: string, sentences: readonly Sentence[], at: number): string | undefined {
  let position = at;
  for (const [k, { head, entries }] of sentences.entries()) {
    if (!text.startsWith(head, position)) return `sentence ${k} does not start with ${head || "its list"} at ${position}`;
    position += head.length;
    for (const [i, { entry, what }] of entries.entries()) {
      if (!text.startsWith(entry, position)) return `sentence ${k} lacks ${entry} for ${what} at ${position}`;
      position += entry.length;
      const separator = i < entries.length - 2 ? ", " : i === entries.length - 2 ? " and " : ".";
      if (!text.startsWith(separator, position)) return `${entry} for ${what} is not followed by ${JSON.stringify(separator)}`;
      position += separator.length;
    }
    if (k < sentences.length - 1) {
      if (text[position] !== " ") return `sentence ${k} is not followed by the next sentence`;
      position++;
    }
  }
  return position === text.length ? undefined : `the text goes on after the last entry, at ${position}`;
}

/** Why `text` does not end with the sentences, or `undefined` when it does: tried from each place the first one could start. */
function tailMismatch(text: string, sentences: readonly Sentence[]): string | undefined {
  const start = `${sentences[0]!.head}${sentences[0]!.entries[0]!.entry}`;
  let first: string | undefined;
  for (let at = text.indexOf(start); at !== -1; at = text.indexOf(start, at + 1)) {
    const reason = mismatch(text, sentences, at);
    if (reason === undefined) return undefined;
    first ??= reason;
  }
  return first ?? `no sentence starts with ${start}`;
}

/** The sentences a text alternative must end with for a description, each with its entries and what they stand for. */
function sentencesOf(description: Record<string, unknown>): Sentence[] {
  const categories = description["categories"] as Array<{ name: string }>;
  switch (description["type"]) {
    case "line-graph":
      return (description["series"] as Array<{ values: number[]; lineLabel?: string }>).map((series, s) => {
        const label = series.lineLabel === undefined || cleanText(series.lineLabel) === "" ? `Series ${s + 1}` : quoteText(series.lineLabel);
        return {
          head: `${label}: `,
          entries: categories.map((category, i) => ({
            entry: `${quoteText(category.name)} is ${String(series.values[i])}`,
            what: `series ${s} (${label}), category ${i}`,
          })),
        };
      });
    case "bar-graph":
      return [{ head: "", entries: categories.map((category, i) => ({ entry: `${quoteText(category.name)} is ${String((description["values"] as number[])[i])}`, what: `category ${i}` })) }];
    default: {
      // A unit that reads as one follows each value; a longer one is stated once, in the key.
      const label = typeof description["valueUnitLabel"] === "string" ? cleanText(description["valueUnitLabel"]) : "";
      const unit = label === "" ? "units" : label;
      const suffix = isUnitShaped(unit) ? ` ${unit}` : "";
      return [{ head: "", entries: categories.map((category, i) => ({ entry: `${quoteText(category.name)}: ${String((description["values"] as number[])[i])}${suffix}`, what: `category ${i}` })) }];
    }
  }
}

/** Fails when the text alternative of the rendered graph lacks a category or value, naming the description and the text. */
function checkTextAlternative(input: Record<string, unknown>, layout: Layout<never>): void {
  const result = validate(input);
  if (!result.valid) throw new Error(`the description is not valid: ${JSON.stringify(result.issues)}`);
  const text = (layout as unknown as Layout)(result.description as never, result.provenance).textAlternative;
  const reason = tailMismatch(text, sentencesOf(input));
  expect(reason, `${JSON.stringify(input)}: the text alternative does not name every category and value: ${text}`).toBeUndefined();
}

/** What a run of generated samples covered, so a test can show each half of its property ran. */
interface Coverage {
  runs: number;
  [feature: string]: number;
}

function check(arbitrary: fc.Arbitrary<Record<string, unknown>>, layout: Layout<never>, features: (input: Record<string, unknown>) => Record<string, boolean>): Coverage {
  const covered: Coverage = { runs: 0 };
  fc.assert(
    fc.property(arbitrary, (input) => {
      checkTextAlternative(input, layout);
      for (const [feature, applies] of Object.entries(features(input))) covered[feature] = (covered[feature] ?? 0) + (applies ? 1 : 0);
      covered.runs++;
    }),
    { numRuns: RUNS },
  );
  return covered;
}

const namesOf = (input: Record<string, unknown>) => (input["categories"] as Array<{ name: string }>).map((category) => category.name);
const valuesOf = (input: Record<string, unknown>) =>
  input["type"] === "line-graph" ? (input["series"] as Array<{ values: number[] }>).flatMap((series) => series.values) : (input["values"] as number[]);

/** Whether two series have the same value at some category, so one's entry could stand in for the other's. */
const sharesAValue = (input: Record<string, unknown>): boolean => {
  const series = input["series"] as Array<{ values: number[] }>;
  return (input["categories"] as unknown[]).some((_, i) => new Set(series.map((one) => one.values[i])).size < series.length);
};

/** What every type's samples are counted for. */
const shared = (input: Record<string, unknown>): Record<string, boolean> => ({
  "decimal values": valuesOf(input).some((value) => !Number.isInteger(value)),
  "a name at the limit": namesOf(input).some((name) => name.length === CALLER_TEXT_LIMIT),
  "a name of stacked marks": namesOf(input).some((name) => REAL_STACKED_TEXT.includes(name)),
  "a name with a quotation mark": namesOf(input).some((name) => /["“”″«»]/.test(name)),
  "a name that cleaning changes": namesOf(input).some((name) => cleanText(name) !== name),
  "a single category": namesOf(input).length === 1,
  "ten or more categories": namesOf(input).length >= 10,
  "a zero value": valuesOf(input).includes(0),
});

function expectShared(covered: Coverage): void {
  expect(covered.runs).toBe(RUNS);
  expect(covered["decimal values"]).toBeGreaterThan(RUNS / 4);
  expect(covered["a name at the limit"]).toBeGreaterThan(RUNS / 20);
  expect(covered["a name of stacked marks"]).toBeGreaterThan(RUNS / 20);
  expect(covered["a name with a quotation mark"]).toBeGreaterThan(0);
  expect(covered["a name that cleaning changes"]).toBeGreaterThan(0);
  expect(covered["a single category"]).toBeGreaterThan(0);
  expect(covered["ten or more categories"]).toBeGreaterThan(RUNS / 25);
  expect(covered["a zero value"]).toBeGreaterThan(0);
}

describe("a line graph's text alternative names every category and value (DGP-NFR-003)", () => {
  it("does so for the example", () => {
    checkTextAlternative(loadExample("line-graph") as Record<string, unknown>, lineGraphLayout as Layout<never>);
  });

  it(`does so over ${RUNS} generated descriptions`, () => {
    const covered = check(lineGraphArb, lineGraphLayout as Layout<never>, (input) => ({
      ...shared(input),
      "several series": (input["series"] as unknown[]).length >= 2,
      "negative values": valuesOf(input).some((value) => value < 0),
      "a labeled series": (input["series"] as Array<{ lineLabel?: string }>).some((series) => series.lineLabel !== undefined),
      "two series share a value at a category": sharesAValue(input),
    }));
    expectShared(covered);
    expect(covered["several series"]).toBeGreaterThan(RUNS / 4);
    expect(covered["negative values"]).toBeGreaterThan(RUNS / 4);
    expect(covered["a labeled series"]).toBeGreaterThan(RUNS / 4);
    expect(covered["two series share a value at a category"]).toBeGreaterThan(RUNS / 20);
  });
});

describe("a bar graph's text alternative names every category and value (DGP-NFR-003)", () => {
  it("does so for the example", () => {
    checkTextAlternative(loadExample("bar-graph") as Record<string, unknown>, barGraphLayout as Layout<never>);
  });

  it(`does so over ${RUNS} generated descriptions`, () => {
    const covered = check(barGraphArb, barGraphLayout as Layout<never>, (input) => ({
      ...shared(input),
      "bars across": input["orientation"] === "horizontal",
      "upright bars": input["orientation"] !== "horizontal",
    }));
    expectShared(covered);
    expect(covered["bars across"]).toBeGreaterThan(RUNS / 5);
    expect(covered["upright bars"]).toBeGreaterThan(RUNS / 4);
  });
});

describe("a pictograph's text alternative names every category and value (DGP-NFR-003)", () => {
  it("does so for the example", () => {
    checkTextAlternative(loadExample("pictograph") as Record<string, unknown>, pictographLayout as Layout<never>);
  });

  it(`does so over ${RUNS} generated descriptions`, () => {
    const covered = check(pictographArb, pictographLayout as Layout<never>, (input) => ({
      ...shared(input),
      "a unit label": typeof input["valueUnitLabel"] === "string" && cleanText(input["valueUnitLabel"]) !== "",
      "a unit label stated once": typeof input["valueUnitLabel"] === "string" && !isUnitShaped(cleanText(input["valueUnitLabel"])),
      "no unit label": input["valueUnitLabel"] === undefined,
    }));
    expectShared(covered);
    expect(covered["a unit label"]).toBeGreaterThan(RUNS / 4);
    expect(covered["a unit label stated once"]).toBeGreaterThan(0);
    expect(covered["no unit label"]).toBeGreaterThan(RUNS / 10);
  });
});
