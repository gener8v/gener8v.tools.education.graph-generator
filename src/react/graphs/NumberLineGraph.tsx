import { numberLine } from "../../core/definitions/number-line";
import { numberLineLayout } from "../../layout/number-line";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The number-line component (CPSE-REQ-007):
 * `<NumberLineGraph description={{ type: "number-line", axis: { min: -10, max: 10 }, points: [{ value: -3, label: "A" }] }} />`.
 * Draws with the number line's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004). Marked pure so a bundler drops it where nothing imports it.
 */
// @spec NLC-REQ-014, CPSE-REQ-007
export const NumberLineGraph = /* @__PURE__ */ createGraphComponent("number-line", { definition: numberLine, layout: numberLineLayout });
