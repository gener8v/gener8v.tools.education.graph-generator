import { circle } from "../../core/definitions/circle";
import { circleLayout } from "../../layout/circle";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The circle component (CPSE-REQ-007): `<CircleGraph description={{ type: "circle", radius: 5 }} />`.
 * Draws with the circle's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004); marked pure so a bundler drops it where nothing imports it.
 */
// @spec GSS-REQ-001, CPSE-REQ-007
export const CircleGraph = /* @__PURE__ */ createGraphComponent("circle", { definition: circle, layout: circleLayout });
