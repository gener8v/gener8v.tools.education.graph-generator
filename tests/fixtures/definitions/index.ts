import type { GraphType, GraphTypeDefinition } from "../../../src/core/definitions/types";
import { circle } from "./circle";
import { numberLine } from "./number-line";
import { xyGraph } from "./xy-graph";

/** Test-only definitions, standing in for the real types until the type tickets land. */
export const fixtureRegistry: Readonly<Partial<Record<GraphType, GraphTypeDefinition>>> = Object.freeze(
  Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, {
    circle: circle as GraphTypeDefinition,
    "number-line": numberLine,
    "xy-graph": xyGraph,
  }),
);

/** One valid description of each fixture type, as the benchmark and the timing test use. */
export const fixtureExamples = [
  { type: "circle", radius: 5, showCenter: true, unit: "cm", title: "A circle", lineColor: "blue" },
  {
    type: "number-line",
    axis: { min: -10, max: 10, tickSpacing: 1, showTickLabels: true },
    points: [
      { value: -3, label: "A", color: "red" },
      { value: 4.5, label: "B" },
    ],
    arrowheads: "both",
    lineLabel: "Integers",
  },
  {
    type: "xy-graph",
    xAxis: { min: -10, max: 10, tickSpacing: 2 },
    yAxis: { min: -5, max: 5 },
    showGrid: true,
    points: [{ x: 1, y: 2, label: "P" }, { x: -3, y: 4, color: "#d55e00" }, { x: 0, y: 0 }],
    segments: [{ from: { x: 0, y: 0 }, to: { x: 3, y: 4 }, label: "5 units" }],
    title: "Points and a segment",
    xAxisLabel: "x",
    yAxisLabel: "y",
  },
] as const;
