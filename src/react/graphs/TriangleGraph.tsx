import { triangle } from "../../core/definitions/triangle";
import { triangleLayout } from "../../layout/triangle";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The triangle component (CPSE-REQ-007): `<TriangleGraph description={{ type: "triangle", sideA: 3, sideB: 4, sideC: 5 }} />`.
 * Draws with the triangle's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004); marked pure so a bundler drops it where nothing imports it.
 */
// @spec GSS-REQ-010, CPSE-REQ-007
export const TriangleGraph = /* @__PURE__ */ createGraphComponent("triangle", { definition: triangle, layout: triangleLayout });
