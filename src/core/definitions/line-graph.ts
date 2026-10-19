import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { type GivenValueScale, checkValueScale, tickIntervalCheck } from "../value-scale";
import { CATEGORY_LIMIT, VALUES_DESCRIPTION, VALUE_LIMIT, axisLabelSentences, categories, categoriesCheck, nameKey, seriesValuesPerCategoryCheck } from "./categories";
import { sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, defineProperties } from "./types";

/** One series of a normalized line graph: a value per category, with an optional label and color. */
export interface LineSeries {
  readonly values: readonly number[];
  readonly lineLabel?: string;
  /** A resolved `#rrggbb` color. */
  readonly lineColor?: string;
}

/** A normalized line-graph description. */
export interface LineGraph extends DescriptionBase {
  readonly type: "line-graph";
  readonly categories: ReadonlyArray<{ readonly name: string }>;
  readonly series: readonly LineSeries[];
  readonly valueScale?: GivenValueScale;
  readonly categoryAxisLabel?: string;
  readonly valueAxisLabel?: string;
  readonly title?: string;
}

/**
 * The most series a line graph may have. Provisional, pending the Product Owner: the default style
 * has six series styles, so up to six every series has its own default color, marker shape and dash
 * pattern (DGP-REQ-014, prd/CC-002; DEL-001).
 */
export const SERIES_LIMIT = 6;

/** What an unlabeled series is called, in the legend and the text alternative: "Series 2". */
export const seriesName = (index: number): string => `Series ${index + 1}`;

/** A series' label cleaned of hidden characters, or `undefined` when it has none or it is blank. */
export function seriesLabelOf(series: LineSeries): string | undefined {
  const label = series.lineLabel === undefined ? "" : cleanText(series.lineLabel);
  return label === "" ? undefined : label;
}

/**
 * The value-scale check over every series' values (DGP-REQ-007, DGP-REQ-008, DGP-REQ-015): a given
 * scale must include every value, and a scale too fine to draw is reported. Negative values are
 * allowed, so a default scale extends below zero to include them.
 */
// @spec DGP-REQ-015
const valueScaleCheck: DomainCheck<LineGraph> = {
  name: "every series value fits the value scale",
  inputs: ["valueScale/minimum", "valueScale/maximum", "valueScale/tickInterval", "series/*/values/*"],
  check: (g) => {
    const values = g.series.flatMap((series, s) =>
      series.values.map((value, i) => ({ path: pointer("series", s, "values", i), term: `series[${s}].values[${i}]`, value })),
    );
    return checkValueScale(values, g.valueScale, { allowNegative: true });
  },
};

/**
 * The check that every series is named differently in the legend and the text alternative
 * (security review SEC-003; DGP TICKET-001 DEL-003): a label that repeats an earlier series' label,
 * compared as category names are (`nameKey`), or that is an unlabeled series' default name ("Series
 * 2"), is reported as `duplicate_name` at its own `lineLabel`.
 */
// @spec DGP-REQ-011, DGP-REQ-013
const seriesLabelsCheck: DomainCheck<LineGraph> = {
  name: "every series has a different name",
  inputs: ["series/*/lineLabel"],
  check: (g) => {
    const issues: Issue[] = [];
    const firstWithName = new Map<string, number>();
    // An unlabeled series is known by its default name.
    g.series.forEach((series, s) => {
      if (seriesLabelOf(series) === undefined) firstWithName.set(nameKey(seriesName(s)), s);
    });
    g.series.forEach((series, s) => {
      const label = seriesLabelOf(series);
      if (label === undefined) return;
      const key = nameKey(label);
      const first = firstWithName.get(key);
      if (first === undefined) {
        firstWithName.set(key, s);
        return;
      }
      const other = g.series[first]!;
      const conflictTerm = seriesLabelOf(other) === undefined ? `series[${first}]` : `series[${first}].lineLabel`;
      const conflict = seriesLabelOf(other) === undefined ? pointer("series", first) : pointer("series", first, "lineLabel");
      issues.push(
        createIssue("duplicate_name", pointer("series", s, "lineLabel"), {
          term: `series[${s}].lineLabel`,
          got: series.lineLabel,
          conflicts: [conflict],
          conflictTerms: [conflictTerm],
        }),
      );
    });
    return issues;
  },
};

/**
 * The line graph (DGP-REQ-010..016): one or more series over the categories, each drawn as points
 * joined by straight segments, with a legend when there is more than one series.
 */
// @spec DGP-REQ-004, DGP-REQ-010, DGP-REQ-011, DGP-REQ-015, DGP-REQ-016
export const lineGraph: GraphTypeDefinition<LineGraph> = /* @__PURE__ */ defineLineGraph();

/**
 * Builds the line-graph definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it, as the pictograph's is dropped (DGP TICKET-005 DEL-002).
 */
/* @__NO_SIDE_EFFECTS__ */
function defineLineGraph(): GraphTypeDefinition<LineGraph> {
  return {
    type: "line-graph",
    title: "Line graph",
    description: `A line graph: one or more series of values over the categories, each value a point and each series a line joining its points, with a legend when there is more than one series. Each series has its own color, point shape and dash pattern. Values may be negative. At most ${CATEGORY_LIMIT} categories and ${SERIES_LIMIT} series.`,
    properties: defineProperties({
      categories,
      // @spec DGP-REQ-010, DGP-REQ-011, DGP-REQ-015
      series: {
        term: "series",
        kind: "array",
        required: true,
        maxItems: SERIES_LIMIT,
        description: `The series, at least 1 and at most ${SERIES_LIMIT}, each drawn as a line through one point per category. Without a lineColor, a series takes the default color for its position (the first series the first color, and so on); every series also has its own point shape and dash pattern, so series differ without color.`,
        items: {
          kind: "object",
          description: "One series: its values, and optionally its label and line color.",
          properties: {
            values: {
              term: "values",
              kind: "array",
              required: true,
              maxItems: CATEGORY_LIMIT,
              description: VALUES_DESCRIPTION,
              items: { kind: "number", min: -VALUE_LIMIT, max: VALUE_LIMIT, description: `A category's value in this series, from ${-VALUE_LIMIT} to ${VALUE_LIMIT}.` },
            },
            // The shared presentation options, nested per series (GSV-REQ-045; spec Shared Mechanics).
            lineLabel: sharedProperties.lineLabel,
            lineColor: sharedProperties.lineColor,
          },
        },
      },
    }),
    derivations: [],
    checks: [categoriesCheck, seriesValuesPerCategoryCheck(), seriesLabelsCheck, tickIntervalCheck, valueScaleCheck],
    // A top-level lineLabel or lineColor belongs on a series (DEL-002; code review CR-003).
    elementsHint: "each series",
    /**
     * "A line graph titled “Temperatures”. The category axis is labeled “Day”. The value axis is
     * labeled “°C”. It shows 2 series. “Week 1”: “Mon” is 3, “Tue” is -5 and “Wed” is 2. Series 2:
     * …" Caller text is quoted, values are stated as supplied (DGP-REQ-004).
     */
    // @spec DGP-REQ-004
    describe: (g: LineGraph, provenance: Provenance) => {
      const title = g.title === undefined ? "" : cleanText(g.title);
      const sentences = [`A line graph${title === "" ? "" : ` titled ${quoteText(title)}`}.`];
      for (const sentence of axisLabelSentences(g)) sentences.push(sentence);
      sentences.push(`It shows ${g.series.length} series.`);
      g.series.forEach((series, s) => {
        const label = seriesLabelOf(series);
        const entries = g.categories.map((category, i) => {
          const value = series.values[i];
          const stated = value === undefined ? "no value" : stateMeasurement(value, sourceOf(provenance, `series/${s}/values/${i}`));
          return `${quoteText(category.name)} is ${stated}`;
        });
        sentences.push(`${label === undefined ? seriesName(s) : quoteText(label)}: ${formatList(entries)}.`);
      });
      return sentences.join(" ");
    },
  };
}
