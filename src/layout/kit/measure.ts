import { cleanText, formatMeasurement } from "../../core/format";

/**
 * The text of a measurement label (GSS-REQ-033..035): custom text when given (cleaned like any
 * caller text; `""` stays a blank label), otherwise the value followed by the unit when one is
 * supplied. A supplied value is shown as written, a derived one at the documented display
 * precision (GSS OQ-005). The precision rule itself lives in `formatDerived` (src/core/format.ts),
 * which the text alternatives use too, so a label and the text alternative state the same number;
 * a different answer to OQ-005 changes that one function (CPSE TICKET-002 code review CR-005).
 */
// @spec GSS-REQ-033, GSS-REQ-034, GSS-REQ-035
export function measurementLabel(value: number, provenance: "supplied" | "derived", unit?: string, custom?: string): string {
  return custom === undefined ? formatMeasurement(value, provenance, unit) : cleanText(custom);
}
