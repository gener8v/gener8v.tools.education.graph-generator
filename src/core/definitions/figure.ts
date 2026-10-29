import { UNIT_TEXT_LIMIT } from "./shared";

/**
 * The one definition of the `unit` term for the figures that state a length (the circle, the
 * square): a term has one definition in the vocabulary (GSV-REQ-015). A plain object, so a type
 * that uses it pulls in no other figure's definition.
 */
// @spec GSS-REQ-033, GSV-REQ-015, GSV-REQ-053
export const unitProperty = {
  term: "unit",
  kind: "string",
  required: false,
  maxLength: UNIT_TEXT_LIMIT,
  description: `The unit of length shown after each measurement, such as cm, at most ${UNIT_TEXT_LIMIT} characters. A unit with sentence punctuation is quoted in the text alternative.`,
} as const;
