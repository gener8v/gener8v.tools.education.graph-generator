import { RULER_MAX_LENGTH, type RulerUnit } from "../../src/core/ruler";

/**
 * Every ruler a description can give: each unit and smallest division (undefined for a centimetre
 * ruler and for an inch ruler's default sixteenth), at every whole length up to the unit's maximum.
 * 78 in all, few enough to test every one rather than sample them (quality review QR-003).
 */
export const EVERY_RULER: readonly (readonly [RulerUnit, string | undefined, number])[] = (
  [
    ["centimeters", undefined],
    ["inches", "half"],
    ["inches", "quarter"],
    ["inches", "eighth"],
    ["inches", undefined],
  ] as const
).flatMap(([unit, division]) => Array.from({ length: RULER_MAX_LENGTH[unit] }, (_, i) => [unit, division, i + 1] as const));
