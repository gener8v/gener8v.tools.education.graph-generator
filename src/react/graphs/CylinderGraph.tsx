import { cylinder } from "../../core/definitions/cylinder";
import { cylinderLayout } from "../../layout/cylinder";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The cylinder component (CPSE-REQ-007): `<CylinderGraph description={{ type: "cylinder", radius: 2, height: 5 }} />`.
 * Draws with the cylinder's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004); marked pure so a bundler drops it where nothing imports it.
 */
// @spec GSS-REQ-026, CPSE-REQ-007
export const CylinderGraph = /* @__PURE__ */ createGraphComponent("cylinder", { definition: cylinder, layout: cylinderLayout });
