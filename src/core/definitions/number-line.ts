import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { MAX_VALUE_TICKS, axisSpacing, axisTickLabel, drawableTicks, isTickValue } from "../value-scale";
import { type Axis, axisDomainChecks, axisProperty } from "./axis";
import { CALLER_TEXT_LIMIT, POINTS_DESCRIPTION, sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, type PropertySpec, defineProperties } from "./types";

/** One marked point of a number line (NLC-REQ-011, NLC-REQ-018). */
export interface NumberLinePoint {
  readonly value: number;
  readonly label?: string;
  /** A resolved `#rrggbb` color. */
  readonly color?: string;
}

/** Text written at a tick in place of its value (NLC-REQ-019); `""` leaves the tick unlabeled. */
export interface NumberLineTickLabel {
  readonly value: number;
  readonly text: string;
}

/** A normalized number-line description (NLC-REQ-014). */
export interface NumberLine extends DescriptionBase {
  readonly type: "number-line";
  readonly axis: Axis;
  /** Whether the left end has an arrowhead; absent means it does (NLC-REQ-017). */
  readonly leftArrow?: boolean;
  /** Whether the right end has an arrowhead; absent means it does (NLC-REQ-017). */
  readonly rightArrow?: boolean;
  readonly points?: readonly NumberLinePoint[];
  readonly tickLabels?: readonly NumberLineTickLabel[];
  readonly title?: string;
  /** A resolved `#rrggbb` color. */
  readonly lineColor?: string;
  readonly lineLabel?: string;
}

/**
 * The most points a number line may mark: twice the 50 the rendering benchmark draws (NLC-NFR-004),
 * and a bound on label placement and on the text alternative (DEL-005).
 */
export const NUMBER_LINE_POINT_LIMIT = 100;

/** Whether an end has an arrowhead: on unless the description sets it `false` (NLC-REQ-017). */
// @spec NLC-REQ-017
export const hasArrow = (setting: boolean | undefined): boolean => setting !== false;

/**
 * The ticks a number line draws, as the layout draws them; undefined when its axis cannot be
 * drawn, which the axis checks report. The tick spacing is read own-key (NLC TICKET-001 security
 * review SEC-002).
 */
export function numberLineTicks(axis: Axis): { spacing: number; ticks: number[] } | undefined {
  return drawableTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined);
}

/**
 * The custom label drawn at each tick: the first label whose value is that tick (`isTickValue`),
 * so two labels on one tick show the first (DEL-008). The one rule the drawing and the text
 * alternative share.
 */
export function customLabelsByTick(ticks: readonly number[], spacing: number, labels: readonly NumberLineTickLabel[]): Map<number, string> {
  const byTick = new Map<number, string>();
  for (const tick of ticks) {
    for (const label of labels) {
      if (isTickValue(label.value, tick, spacing)) {
        byTick.set(tick, label.text);
        break;
      }
    }
  }
  return byTick;
}

/**
 * The one `value` term, a position on the number line in its own numbers, for both a marked point
 * and a custom tick label, so the term has one definition (GSV-REQ-015). No structural bounds: a
 * value off the axis is reported with the axis's range by the domain checks (DEL-009).
 */
const positionValue = {
  term: "value",
  kind: "number",
  required: true,
  description:
    "A position on the number line, in the line's own numbers: where a point is marked, or the tick a custom label is written at. It must lie on the line's range, ends included; a custom label's value must be a tick.",
} as const satisfies PropertySpec;

/**
 * The number line's own terms (NLC-REQ-001, NLC-REQ-011, NLC-REQ-015, NLC-REQ-017, NLC-REQ-019,
 * NLC-REQ-021): its axis, an arrowhead setting per end, the marked points with the shared label and
 * color nested, and custom tick labels. The title, line color and line label are shared options
 * that `propertiesOf` adds, never listed here. Built by a function free of side effects, so a
 * bundle that never reads the number line drops it (rulers NLC TICKET-002 quality review QR-002).
 */
// @spec NLC-REQ-001, NLC-REQ-011, NLC-REQ-015, NLC-REQ-017, NLC-REQ-019, NLC-REQ-021
/* @__NO_SIDE_EFFECTS__ */
function defineNumberLineProperties() {
  return defineProperties({
    axis: axisProperty("axis", "number line's"),
    leftArrow: {
      term: "leftArrow",
      kind: "boolean",
      required: false,
      description: "Whether the number line's left end has an arrowhead, showing the line goes on; shown unless false. Without one, the line stops at its min.",
    },
    rightArrow: {
      term: "rightArrow",
      kind: "boolean",
      required: false,
      description: "Whether the number line's right end has an arrowhead, showing the line goes on; shown unless false. Without one, the line stops at its max.",
    },
    points: {
      term: "points",
      kind: "array",
      required: false,
      maxItems: NUMBER_LINE_POINT_LIMIT,
      // One definition with the x,y graph's points; the limit is in `maxItems` and the type's description.
      description: POINTS_DESCRIPTION,
      items: {
        kind: "object",
        description: "One marked point: its value, and optionally its label and color.",
        properties: {
          value: positionValue,
          // The shared element options, nested per point (GSV-REQ-045).
          label: sharedProperties.label,
          color: sharedProperties.color,
        },
      },
    },
    tickLabels: {
      term: "tickLabels",
      kind: "array",
      required: false,
      maxItems: MAX_VALUE_TICKS,
      description: `Custom labels written at ticks in place of their values, at most ${MAX_VALUE_TICKS}: for example "start" at 0, or a blank at a tick to fill in. When two labels share a tick, the first is written. Hidden with the other tick labels when the axis's showTickLabels is false.`,
      items: {
        kind: "object",
        description: "One custom tick label: the tick's value and the text written there.",
        properties: {
          value: positionValue,
          text: {
            term: "text",
            kind: "string",
            required: true,
            maxLength: CALLER_TEXT_LIMIT,
            description: `The text written at a tick in place of its value, as plain text, at most ${CALLER_TEXT_LIMIT} characters. An empty text leaves the tick unlabeled. In the drawing, a text wider than its tick's room is cut short with “…”, though never to fewer than a few letters, so on a densely ticked line neighbouring labels may touch; the text alternative states it whole.`,
          },
        },
      },
    },
  });
}

/**
 * Every point whose value lies outside the axis range, each reported once as `outside_axis_range`
 * at its own value, naming the range; an endpoint as written is inside (NLC-REQ-010; DEL-009).
 * O(points).
 */
// @spec NLC-REQ-010
const pointsInRange: DomainCheck<NumberLine> = {
  name: "every point lies on the number line's range",
  inputs: ["axis/min", "axis/max", "points/*/value"],
  check: (line) => {
    const issues: Issue[] = [];
    const { min, max } = line.axis;
    (line.points ?? []).forEach((point, i) => {
      if (point.value < min || point.value > max) {
        issues.push(createIssue("outside_axis_range", pointer("points", i, "value"), { term: `points[${i}].value`, got: point.value, range: { min, max } }));
      }
    });
    return issues;
  },
};

/**
 * Every custom label whose value is not a tick the line draws (`isTickValue`, the rule the drawing
 * matches by), each reported once as `tick_label_not_on_tick` (NLC-REQ-020). Skipped when the axis
 * cannot be drawn, which the axis checks report, so it never fails on an axis they refuse (NLC
 * TICKET-001 code review CR-006, CR-007). At most 100 labels × 100 ticks.
 */
// @spec NLC-REQ-020
const tickLabelsOnTicks: DomainCheck<NumberLine> = {
  name: "every custom tick label is at a tick",
  inputs: ["axis/min", "axis/max", "axis/tickSpacing", "tickLabels/*/value"],
  check: (line) => {
    const drawn = numberLineTicks(line.axis);
    if (drawn === undefined) return [];
    const issues: Issue[] = [];
    (line.tickLabels ?? []).forEach((label, i) => {
      if (!drawn.ticks.some((tick) => isTickValue(label.value, tick, drawn.spacing))) {
        issues.push(createIssue("tick_label_not_on_tick", pointer("tickLabels", i, "value"), {
          term: `tickLabels[${i}].value`,
          got: label.value,
          spacing: drawn.spacing,
          range: { min: line.axis.min, max: line.axis.max },
        }));
      }
    });
    return issues;
  },
};

/** Caller text cleaned of hidden characters, or `""` when absent. */
const cleaned = (text: string | undefined): string => (text === undefined ? "" : cleanText(text));

/** Which ends have arrowheads, as the text alternative says it. */
function arrowheadPhrase(line: NumberLine): string {
  const [left, right] = [hasArrow(line.leftArrow), hasArrow(line.rightArrow)];
  if (left && right) return "with arrowheads at both ends";
  if (left) return "with an arrowhead at the left end only";
  if (right) return "with an arrowhead at the right end only";
  return "with no arrowheads";
}

/**
 * The number line (NLC-REQ-001, NLC-REQ-014..021): an axis from min to max with ticks, an
 * arrowhead at each end unless turned off, marked points, custom tick labels and a line label.
 */
// @spec NLC-REQ-001, NLC-REQ-014
export const numberLine: GraphTypeDefinition<NumberLine> = /* @__PURE__ */ defineNumberLine();

/**
 * Builds the number-line definition. A function marked free of side effects, so a bundle that
 * never reads the definition drops it, as the other types' are dropped.
 */
/* @__NO_SIDE_EFFECTS__ */
function defineNumberLine(): GraphTypeDefinition<NumberLine> {
  return {
    type: "number-line",
    title: "Number line",
    description: `A number line: one axis from its min to its max, negative, positive or across zero, with ticks, an arrowhead at each end unless turned off, and optionally marked points (at most ${NUMBER_LINE_POINT_LIMIT}), custom tick labels and a label for the line.`,
    properties: defineNumberLineProperties(),
    derivations: [],
    checks: [...axisDomainChecks("axis"), pointsInRange, tickLabelsOnTicks],
    // A top-level label or color belongs on a point (GSV-REQ-045).
    elementsHint: "each point",
    /**
     * "A number line titled “Temperatures”, labeled “Integers”, from -10 to 10, ticked every 1,
     * with arrowheads at both ends. Ticks labeled: 0 as “start”. 2 points are marked: -3 labeled
     * “A” and 4." (DEL-006). Supplied values are stated as written, and so is a default spacing,
     * which is 1, 2 or 5 × 10ⁿ and short written out: rounded, 0.005 would read 0.01 (NLC TICKET-009
     * security review SEC-001). A custom label is stated only when it is drawn, as the first at its tick, so the text
     * alternative says what the figure shows (prd/CC-002).
     */
    // @spec NLC-REQ-012, NLC-REQ-016, NLC-REQ-019, NLC-REQ-021
    describe: (line: NumberLine, provenance: Provenance) => {
      const title = cleaned(line.title);
      const lineLabel = cleaned(line.lineLabel);
      const { min, max } = line.axis;
      const given = Object.hasOwn(line.axis, "tickSpacing") ? line.axis.tickSpacing : undefined;
      const spacing = stateMeasurement(axisSpacing(min, max, given), "supplied");
      const range = `from ${stateMeasurement(min, sourceOf(provenance, "axis/min"))} to ${stateMeasurement(max, sourceOf(provenance, "axis/max"))}`;
      const named = `${title === "" ? "" : ` titled ${quoteText(title)}`}${lineLabel === "" ? "" : `, labeled ${quoteText(lineLabel)},`}`;
      const sentences = [`A number line${named} ${range}, ticked every ${spacing}, ${arrowheadPhrase(line)}.`];
      if (line.axis.showTickLabels === false) {
        sentences.push("Its ticks are not labeled.");
      } else {
        const drawn = numberLineTicks(line.axis);
        if (drawn !== undefined) {
          // Each tick named by the numeric label the custom one replaces.
          const entries = [...customLabelsByTick(drawn.ticks, drawn.spacing, line.tickLabels ?? [])].map(([tick, text]) => {
            const shown = cleanText(text);
            return `${axisTickLabel(tick, drawn.spacing)} ${shown === "" ? "left blank" : `as ${quoteText(shown)}`}`;
          });
          if (entries.length > 0) sentences.push(`Ticks labeled: ${formatList(entries)}.`);
        }
      }
      const points = line.points ?? [];
      if (points.length === 0) {
        sentences.push("No points are marked.");
      } else {
        const entries = points.map((point, i) => {
          const label = cleaned(point.label);
          const at = stateMeasurement(point.value, sourceOf(provenance, `points/${i}/value`));
          return label === "" ? at : `${at} labeled ${quoteText(label)}`;
        });
        sentences.push(`${points.length} ${points.length === 1 ? "point is" : "points are"} marked: ${formatList(entries)}.`);
      }
      return sentences.join(" ");
    },
  };
}
