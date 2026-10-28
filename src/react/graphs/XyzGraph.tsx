import { xyzGraph } from "../../core/definitions/xyz-graph";
import { xyzGraphLayout } from "../../layout/xyz-graph";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The x,y,z coordinate graph component (CPSE-REQ-007):
 * `<XyzGraph description={{ type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, points: [{ x: 1, y: 2, z: 3, label: "A" }] }} />`.
 * Draws with the x,y,z graph's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004). Marked pure so a bundler drops it where nothing imports it.
 */
// @spec NLC-REQ-034, CPSE-REQ-007
export const XyzGraph = /* @__PURE__ */ createGraphComponent("xyz-graph", { definition: xyzGraph, layout: xyzGraphLayout });
