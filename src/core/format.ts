// Text and number helpers for text alternatives. This module imports nothing: graph-type
// definitions import it, and the definitions registry imports the definitions, so anything
// imported here could close an import cycle (quality review QR-001).

/** Decimal digits of a non-negative finite number, never in exponent form. */
function plainDigits(magnitude: number): string {
  const text = String(magnitude);
  const match = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (match === null) return text;
  const [, whole = "", fraction = "", exponent = "0"] = match;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + "0".repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Add one to a string of decimal digits. */
function increment(digits: string): string {
  const chars = [...digits];
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== "9") {
      chars[i] = String(Number(chars[i]) + 1);
      return chars.join("");
    }
    chars[i] = "0";
  }
  return `1${chars.join("")}`;
}

/** Round plain decimal digits to `places`, half away from zero, dropping trailing zeros. */
function roundDigits(text: string, places: number): string {
  const [whole = "0", fraction = ""] = text.split(".");
  if (fraction.length <= places) return text;
  let digits = whole + fraction.slice(0, places);
  if (Number(fraction[places]) >= 5) digits = increment(digits);
  const point = digits.length - places;
  const rounded = places > 0 ? `${digits.slice(0, point)}.${digits.slice(point)}` : digits;
  return rounded.includes(".") ? rounded.replace(/0+$/, "").replace(/\.$/, "") : rounded;
}

const signed = (value: number, magnitude: string) => (magnitude === "0" || value >= 0 ? magnitude : `-${magnitude}`);

/** A value the caller supplied, exactly as written: no rounding, no exponent form, never "-0". */
export function formatSupplied(value: number): string {
  return signed(value, plainDigits(Math.abs(value)));
}

/**
 * A value the package derived, rounded to two decimals, half away from zero (`1.005` → "1.01").
 * A non-zero value that would round to 0 keeps two significant figures instead (`0.0012`).
 */
export function formatDerived(value: number): string {
  const magnitude = Math.abs(value);
  let text = roundDigits(plainDigits(magnitude), 2);
  if (text === "0" && magnitude !== 0) {
    text = roundDigits(plainDigits(magnitude), 1 - Math.floor(Math.log10(magnitude)));
  }
  return signed(value, text);
}

/** "a", "a and b", "a, b and c". Caller text in the list should go through `quoteText` first. */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Code points that break lines or are control characters: replaced with a space.
const BREAKING: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x2028, 0x2029],
];
// Invisible formatting that can reorder or hide text: dropped. Zero-width joiner and non-joiner
// (U+200C, U+200D) stay, because some writing systems need them.
const INVISIBLE: ReadonlyArray<readonly [number, number]> = [
  [0x61c, 0x61c],
  [0x200b, 0x200b],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];
const within = (ranges: ReadonlyArray<readonly [number, number]>, code: number) =>
  ranges.some(([low, high]) => code >= low && code <= high);

/**
 * Caller text made safe to read aloud or hand to a model: control characters and line breaks
 * become spaces, invisible direction and zero-width marks are dropped, and spaces are collapsed
 * (security review SEC-002).
 */
export function cleanText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (within(BREAKING, code)) result += " ";
    else if (!within(INVISIBLE, code)) result += text[i];
  }
  return result.replace(/ {2,}/g, " ").trim();
}

// Characters plain text may not hold (Product Owner decision 2026-10-06, GSV TICKET-001 security
// review SEC-002): control characters, line and paragraph separators, and direction overrides
// and isolates. Zero-width joiner and non-joiner are allowed.
const UNSAFE_TEXT: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x2028, 0x2029],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

/** The index of the first character plain text may not hold, or -1 when there is none. */
// @spec GSV-REQ-043
export function findUnsafeTextChar(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (within(UNSAFE_TEXT, text.charCodeAt(i))) return i;
  }
  return -1;
}

/** Caller text as a quotation in a text alternative: cleaned and in quotation marks. */
export function quoteText(text: string): string {
  return `“${cleanText(text).replace(/[“”]/g, '"')}”`;
}

/** A measurement as the reader should see it, with its unit when one is given: "5 cm". */
export function formatMeasurement(value: number, provenance: "supplied" | "derived", unit?: string): string {
  const number = provenance === "supplied" ? formatSupplied(value) : formatDerived(value);
  const cleanUnit = unit === undefined ? "" : cleanText(unit);
  return cleanUnit === "" ? number : `${number} ${cleanUnit}`;
}
