import { barGraph } from "../../core/definitions/bar-graph";
import { barGraphLayout } from "../../layout/bar-graph";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The bar-graph component (CPSE-REQ-007):
 * `<BarGraph description={{ type: "bar-graph", categories: [{ name: "Cats" }, { name: "Dogs" }], values: [7, 4] }} />`.
 * Draws with the bar graph's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004). Exported as `BarGraph`. Marked pure so a bundler drops it
 * where nothing imports it.
 */
// @spec DGP-REQ-017, CPSE-REQ-007
export const BarGraph = /* @__PURE__ */ createGraphComponent("bar-graph", { definition: barGraph, layout: barGraphLayout });
