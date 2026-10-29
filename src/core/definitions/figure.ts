import { UNIT_TEXT_LIMIT } from "./shared";
import { defineProperties } from "./types";

/**
 * The terms the figures that state a length share (the circle, the square): a term has one
 * definition in the vocabulary (GSV-REQ-015). Built by `defineProperties`, so each spec is frozen
 * with no prototype before any definition uses it, and every figure holds the same object; a plain
 * or merely frozen literal would be copied per figure, or keep `Object.prototype` (GSS TICKET-003
 * security review SEC-001). Marked pure, so a bundle with no figure drops it; it imports no figure.
 */
// @spec GSS-REQ-033, GSV-REQ-015, GSV-REQ-053
const figureTerms = /* @__PURE__ */ defineProperties({
  unit: {
    term: "unit",
    kind: "string",
    required: false,
    maxLength: UNIT_TEXT_LIMIT,
    description: `The unit of length shown after each measurement, such as cm, at most ${UNIT_TEXT_LIMIT} characters. A unit with sentence punctuation is quoted in the text alternative.`,
  },
});

/** The one `unit` term spec (`figureTerms.unit`), shared by identity. */
export const unitProperty = figureTerms.unit;
