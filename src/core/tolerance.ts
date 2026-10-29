/**
 * The GSV agreement rule, for the validator and the geometry solvers alike (GSS TICKET-004
 * quality review QR-004): a pure module with no imports, so a solver need not reach into the
 * validator for it.
 */

/** A supplied dependent value agrees within 1% (relative) of the derived value (GSV Behaviors & Rules). */
export const TOLERANCE = 0.01;

/**
 * Slack for binary rounding at the boundary: 7.07 against 7 is exactly 1% in decimal, but not in
 * binary floating point. One part in a billion keeps "exactly 1% is accepted" true for every
 * value and still rejects 1.01% (code review CR-002 on TICKET-004).
 */
const BOUNDARY_SLACK = 1e-9;

/**
 * Whether a supplied value agrees with the derived one: within 1% of it, exactly 1% included,
 * so values computed with π ≈ 3.14 or 22/7 are accepted.
 */
// @spec GSV-REQ-038
export function withinTolerance(supplied: number, derived: number): boolean {
  return Math.abs(supplied - derived) <= TOLERANCE * Math.abs(derived) * (1 + BOUNDARY_SLACK);
}
