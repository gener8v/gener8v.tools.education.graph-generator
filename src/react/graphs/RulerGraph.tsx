import { ruler } from "../../core/definitions/ruler";
import { rulerLayout } from "../../layout/ruler";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The ruler component (CPSE-REQ-007):
 * `<RulerGraph description={{ type: "ruler", rulerUnit: "centimeters", length: 15 }} />`.
 * Draws with the ruler's own definition and layout only, so importing it brings in no other graph
 * type (AD-001, CPSE-REQ-004). Marked pure so a bundler drops it where nothing imports it.
 *
 * Show a ruler at least 330 px wide. Its marks are drawn as thin as half the space between them,
 * and narrower than that a 30 cm ruler's millimetre marks render lighter than 3:1 contrast
 * (WCAG 1.4.11; DEL-002). A 12 in ruler marked to sixteenths keeps 3:1 down to about 210 px.
 */
// @spec NLC-REQ-040, CPSE-REQ-007
export const RulerGraph = /* @__PURE__ */ createGraphComponent("ruler", { definition: ruler, layout: rulerLayout });
