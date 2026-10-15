import { lineGraph } from "../../core/definitions/line-graph";
import { lineGraphLayout } from "../../layout/line-graph";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The line-graph component (CPSE-REQ-007):
 * `<LineGraph description={{ type: "line-graph", categories: [{ name: "Mon" }, { name: "Tue" }], series: [{ values: [3, 5] }] }} />`.
 * Draws with the line graph's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004). Exported as `LineGraph`, not `LineGraphGraph` (DGP TICKET-002
 * Notes). Marked pure so a bundler drops it where nothing imports it.
 */
// @spec DGP-REQ-010, CPSE-REQ-007
export const LineGraph = /* @__PURE__ */ createGraphComponent("line-graph", { definition: lineGraph, layout: lineGraphLayout });
