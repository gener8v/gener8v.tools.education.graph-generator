import { ruler } from "../../core/definitions/ruler";
import { rulerLayout } from "../../layout/ruler";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The ruler component (CPSE-REQ-007):
 * `<RulerGraph description={{ type: "ruler", rulerUnit: "centimeters", length: 15 }} />`.
 * Draws with the ruler's own definition and layout only, so importing it brings in no other graph
 * type (AD-001, CPSE-REQ-004). Marked pure so a bundler drops it where nothing imports it.
 *
 * Show a ruler at least about 330 px wide for 30 cm (164 px for 15 cm). Its marks are drawn as
 * thin as half the space between them, and narrower than that a 30 cm ruler's millimetre marks
 * render lighter than 3:1 contrast (WCAG 1.4.11; DEL-002). A 12 in ruler marked to sixteenths keeps
 * 3:1 down to about 210 px, and any ruler needs at least about 130 px, however short (NLC TICKET-008
 * security review SEC-001). See the README's Styling section.
 */
// @spec NLC-REQ-040, CPSE-REQ-007
export const RulerGraph = /* @__PURE__ */ createGraphComponent("ruler", { definition: ruler, layout: rulerLayout });
