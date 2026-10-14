import { pictograph } from "../../core/definitions/pictograph";
import { pictographLayout } from "../../layout/pictograph";
import { createGraphComponent } from "../createGraphComponent";

/**
 * The pictograph component (CPSE-REQ-007):
 * `<Pictograph description={{ type: "pictograph", categories: [{ name: "Cats" }], values: [6], unitImage: "apple", unitValue: 2 }} />`.
 * Draws with the pictograph's own definition and layout only, so importing it brings in no other
 * graph type (AD-001, CPSE-REQ-004); it carries every published image, because the image is named
 * at runtime (AD-012). Marked pure so a bundler drops it where nothing imports it.
 */
// @spec DGP-REQ-023, CPSE-REQ-007
export const Pictograph = /* @__PURE__ */ createGraphComponent("pictograph", { definition: pictograph, layout: pictographLayout });
