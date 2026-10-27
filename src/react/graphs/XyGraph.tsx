import { xyGraph } from "../../core/definitions/xy-graph";
import { xyGraphLayout } from "../../layout/xy-graph";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The x,y coordinate graph component (CPSE-REQ-007):
 * `<XyGraph description={{ type: "xy-graph", xAxis: { min: -5, max: 5 }, yAxis: { min: -5, max: 5 }, points: [{ x: 1, y: 2, label: "A" }] }} />`.
 * Draws with the x,y graph's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004). Marked pure so a bundler drops it where nothing imports it.
 */
// @spec NLC-REQ-022, CPSE-REQ-007
export const XyGraph = /* @__PURE__ */ createGraphComponent("xy-graph", { definition: xyGraph, layout: xyGraphLayout });
