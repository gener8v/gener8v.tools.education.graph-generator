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

type Ranges = ReadonlyArray<readonly [number, number]>;

// The plain-text character policy, by Product Owner decision (2026-10-06, GSV TICKET-001
// security review SEC-002; extended the same day by GSV TICKET-003 security review SEC-002).
// Validation rejects every code point in these ranges, and `cleanText` neutralises the same set,
// so the two can never drift (quality review QR-007).

/** Control characters and line and paragraph separators: replaced with a space by `cleanText`. */
const LINE_BREAKING: Ranges = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x2028, 0x2029],
];
/** Direction overrides and isolates, which reorder text. */
const DIRECTION_CONTROLS: Ranges = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];
/**
 * Invisible format characters that hide text or carry hidden text: soft hyphen, Arabic letter
 * mark, Mongolian vowel separator, zero-width space, direction marks, word joiners and invisible
 * operators, deprecated format characters, byte-order mark, interlinear annotation marks, tag
 * characters (U+E0000–U+E007F, read by language models as ASCII) and supplementary variation
 * selectors. Zero-width joiner and non-joiner (U+200C, U+200D) and the emoji variation selectors
 * (U+FE00–U+FE0F) stay allowed.
 */
const INVISIBLE_FORMAT: Ranges = [
  [0xad, 0xad],
  [0x61c, 0x61c],
  [0x180e, 0x180e],
  [0x200b, 0x200b],
  [0x200e, 0x200f],
  [0x2060, 0x2065],
  [0x206a, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0xe0000, 0xe007f],
  [0xe0100, 0xe01ef],
];
/** Half of a surrogate pair standing alone: it does not survive UTF-8 encoding. */
const LONE_SURROGATE: Ranges = [[0xd800, 0xdfff]];

const within = (ranges: Ranges, code: number) => ranges.some(([low, high]) => code >= low && code <= high);

const isLineBreaking = (code: number) => within(LINE_BREAKING, code);
const isHidden = (code: number) =>
  within(DIRECTION_CONTROLS, code) || within(INVISIBLE_FORMAT, code) || within(LONE_SURROGATE, code);

/** Whether plain text may not hold this code point. */
export function isUnsafeCodePoint(code: number): boolean {
  return isLineBreaking(code) || isHidden(code);
}

/**
 * Visit each code point of a string with its text. A surrogate pair is one code point; a
 * surrogate standing alone is its own code point (in U+D800–U+DFFF).
 */
export function forEachCodePoint(text: string, visit: (code: number, char: string) => void): void {
  for (let i = 0; i < text.length; ) {
    const code = text.codePointAt(i)!;
    const size = code > 0xffff ? 2 : 1;
    visit(code, text.slice(i, i + size));
    i += size;
  }
}

/**
 * Caller text made safe to read aloud or hand to a model: control characters and line breaks
 * become spaces, hidden characters (direction controls, invisible format characters, tag
 * characters, lone surrogates) are dropped, and spaces are collapsed.
 */
export function cleanText(text: string): string {
  let result = "";
  forEachCodePoint(text, (code, char) => {
    if (isLineBreaking(code)) result += " ";
    else if (!isHidden(code)) result += char;
  });
  return result.replace(/ {2,}/g, " ").trim();
}

const hex4 = (code: number) => code.toString(16).toUpperCase().padStart(4, "0");
const escapeFor = (code: number) => `\\u${hex4(code)}`;

/**
 * A JSON Schema `pattern` for the part of the plain-text policy up to U+FFFF, built from the same
 * ranges as `isUnsafeCodePoint`, written only with `\uXXXX` escapes so it behaves the same with
 * and without a regular expression's Unicode flag. Tag characters, supplementary variation
 * selectors and lone surrogates stay validator-only (security review SEC-001 on TICKET-005).
 */
// @spec GSV-REQ-043
export const PLAIN_TEXT_PATTERN = `^[^${[...LINE_BREAKING, ...DIRECTION_CONTROLS, ...INVISIBLE_FORMAT]
  .filter(([low]) => low <= 0xffff)
  .map(([low, high]) => (low === high ? escapeFor(low) : `${escapeFor(low)}-${escapeFor(high)}`))
  .join("")}]*$`;

/** The index (in UTF-16 units) of the first code point plain text may not hold, or -1. */
// @spec GSV-REQ-043
export function findUnsafeTextChar(text: string): number {
  for (let i = 0; i < text.length; ) {
    const code = text.codePointAt(i)!;
    if (isUnsafeCodePoint(code)) return i;
    i += code > 0xffff ? 2 : 1;
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
