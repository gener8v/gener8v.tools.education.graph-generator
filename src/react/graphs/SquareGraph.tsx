import { square } from "../../core/definitions/square";
import { squareLayout } from "../../layout/square";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The square component (CPSE-REQ-007): `<SquareGraph description={{ type: "square", sideLength: 4 }} />`.
 * Draws with the square's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004); marked pure so a bundler drops it where nothing imports it.
 */
// @spec GSS-REQ-007, CPSE-REQ-007
export const SquareGraph = /* @__PURE__ */ createGraphComponent("square", { definition: square, layout: squareLayout });
