import { cube } from "../../core/definitions/cube";
import { cubeLayout } from "../../layout/cube";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The cube component (CPSE-REQ-007): `<CubeGraph description={{ type: "cube", edgeLength: 3 }} />`.
 * Draws with the cube's own definition and layout only, so importing it brings in no other graph
 * type (AD-001, CPSE-REQ-004); marked pure so a bundler drops it where nothing imports it.
 */
// @spec GSS-REQ-023, CPSE-REQ-007
export const CubeGraph = /* @__PURE__ */ createGraphComponent("cube", { definition: cube, layout: cubeLayout });
