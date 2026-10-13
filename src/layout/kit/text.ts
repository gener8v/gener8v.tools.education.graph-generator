import { defaultStyle } from "../../core/style";
import { forEachCodePoint } from "../../core/format";

/** The system sans-serif stack every label uses by default; no bundled font (AD-010, prd/CC-001). */
export const DEFAULT_FONT_STACK = defaultStyle.fontFamily;

/** Text width estimates are multiplied by this margin, so wider fallback fonts still fit (AD-010). */
export const TEXT_WIDTH_SAFETY = 1.1;

// Helvetica/Arial advance widths for printable ASCII (U+0020–U+007E), in thousandths of an em,
// from the standard Helvetica AFM metrics (Arial shares them).
// prettier-ignore
const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, //  !"#$%&'()*+,-./
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 0-9 :;<=>?
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // @A-O
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // P-Z [\]^_
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // `a-o
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, // p-z {|}~
];

/** Other letters, digits and symbols: a wide Latin advance, so estimates err on the large side. */
const FALLBACK_WIDTH = 667;
/** East Asian wide characters and emoji take a full em. */
const WIDE_WIDTH = 1000;

/** Marks and joiners drawn on or between their neighbours: no advance of their own. */
const ZERO_WIDTH: ReadonlyArray<readonly [number, number]> = [
  [0x0300, 0x036f], // combining diacritical marks
  [0x0483, 0x0489],
  [0x0591, 0x05bd],
  [0x064b, 0x065f], // Arabic harakat
  [0x0900, 0x0902], // Devanagari nonspacing signs
  [0x093a, 0x093a],
  [0x093c, 0x093c], // nukta
  [0x0941, 0x0948], // nonspacing vowel signs
  [0x094d, 0x094d], // virama
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x200b, 0x200f], // zero-width space, joiners, direction marks
  [0x20d0, 0x20ff], // combining marks for symbols
  [0xfe00, 0xfe0f], // variation selectors
  [0xfe20, 0xfe2f],
  [0x1f3fb, 0x1f3ff], // emoji skin-tone modifiers
  [0xe0000, 0xe01ef], // tags and supplementary variation selectors
];

/** Devanagari spacing vowel signs and visarga: they advance, but belong to the letter before them. */
const SPACING_MARKS: ReadonlyArray<readonly [number, number]> = [
  [0x0903, 0x0903],
  [0x093b, 0x093b],
  [0x093e, 0x0940],
  [0x0949, 0x094c],
  [0x094e, 0x094f],
];
const SPACING_MARK_WIDTH = 333;

/** No-break spaces: never a line break, and as wide as the space (figure space as a digit). */
const NO_BREAK_SPACE_WIDTHS: ReadonlyMap<number, number> = new Map([
  [0x00a0, 278],
  [0x202f, 278],
  [0x2007, 556],
]);

const WIDE: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f], // Hangul Jamo
  [0x2e80, 0x303e], // CJK radicals, punctuation
  [0x3041, 0x33ff], // kana, CJK symbols
  [0x3400, 0x4dbf], // CJK extension A
  [0x4e00, 0x9fff], // CJK unified ideographs
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60], // full-width forms
  [0xffe0, 0xffe6],
  [0x1f300, 0x1faff], // emoji and pictographs
  [0x20000, 0x3fffd], // CJK extensions B and later
];

const within = (ranges: ReadonlyArray<readonly [number, number]>, code: number) =>
  ranges.some(([low, high]) => code >= low && code <= high);

/** The estimated advance of one code point, in thousandths of an em. */
function advance(code: number): number {
  if (code >= 0x20 && code <= 0x7e) return ASCII_WIDTHS[code - 0x20]!;
  if (within(ZERO_WIDTH, code)) return 0;
  if (within(SPACING_MARKS, code)) return SPACING_MARK_WIDTH;
  const noBreak = NO_BREAK_SPACE_WIDTHS.get(code);
  if (noBreak !== undefined) return noBreak;
  if (within(WIDE, code)) return WIDE_WIDTH;
  return FALLBACK_WIDTH;
}

function rawWidth(text: string): number {
  let total = 0;
  forEachCodePoint(text, (code) => {
    total += advance(code);
  });
  return total;
}

/**
 * The estimated rendered width of `text` at `fontSize`, in drawing units: the Helvetica/Arial
 * width table, times the safety margin. Nothing is measured (prd/TC-001).
 */
// @spec CPSE-REQ-011
export function textWidth(text: string, fontSize: number): number {
  return (rawWidth(text) / 1000) * fontSize * TEXT_WIDTH_SAFETY;
}

/** Break opportunities: whitespace other than the no-break spaces (U+00A0, U+2007, U+202F). */
const BREAKING_SPACE = /[\t\n\v\f\r \u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+/;

const ZWJ = 0x200d;
const isRegionalIndicator = (code: number) => code >= 0x1f1e6 && code <= 0x1f1ff;

/**
 * A word as clusters that must stay on one line: a base character with the marks, joiners,
 * variation selectors and modifiers attached to it, a joiner sequence (woman + ZWJ + school), or a flag pair.
 */
function clusters(word: string): string[] {
  const result: string[] = [];
  let previous = -1;
  let flagHalves = 0;
  forEachCodePoint(word, (code, char) => {
    const attaches =
      result.length > 0 &&
      (within(ZERO_WIDTH, code) ||
        within(SPACING_MARKS, code) ||
        previous === ZWJ ||
        (isRegionalIndicator(code) && isRegionalIndicator(previous) && flagHalves % 2 === 1));
    if (attaches) result[result.length - 1] += char;
    else result.push(char);
    flagHalves = isRegionalIndicator(code) ? flagHalves + 1 : 0;
    previous = code;
  });
  return result;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`wrap(): ${name} must be a positive number, got ${value}`);
}

/**
 * Break `text` into lines no wider than `maxWidth` at `fontSize`, on word boundaries (SVG text does
 * not wrap; prd/TC-011). No-break spaces keep their words together and are kept as written. A
 * single word wider than `maxWidth` is split between clusters (never inside a character with its
 * marks, a joiner sequence or a flag), so every line fits unless one cluster alone is wider. Runs
 * in time linear in the length of the text, however long it is.
 *
 * With `maxLines`, at most that many lines are returned: when the text needs more, the rest is cut
 * and the last line ends in "…", shortened to fit. Wrapping stops once the lines are full, so a
 * caller-sized text yields a bounded number of lines (GSS TICKET-002 security review SEC-001).
 */
// @spec CPSE-REQ-011
export function wrap(text: string, maxWidth: number, fontSize: number, maxLines = Infinity): string[] {
  requirePositive("maxWidth", maxWidth);
  requirePositive("fontSize", fontSize);
  if (maxLines !== Infinity && (!Number.isInteger(maxLines) || maxLines < 1)) {
    throw new RangeError(`wrap(): maxLines must be a positive integer, got ${maxLines}`);
  }
  const words = text.split(BREAKING_SPACE).filter((word) => word !== "");
  const scale = (fontSize * TEXT_WIDTH_SAFETY) / 1000;
  const spaceWidth = advance(0x20) * scale;
  const lines: string[] = [];
  let line = "";
  let lineWidth = 0;
  /** Set once a line beyond `maxLines` has started: the text is cut there. */
  let cut = false;

  const push = (word: string, width: number) => {
    if (line !== "" && lineWidth + spaceWidth + width <= maxWidth) {
      line += ` ${word}`;
      lineWidth += spaceWidth + width;
      return;
    }
    if (line !== "") lines.push(line);
    if (lines.length === maxLines) {
      cut = true;
      return;
    }
    line = word;
    lineWidth = width;
  };

  for (const word of words) {
    if (cut) break;
    const width = rawWidth(word) * scale;
    if (width <= maxWidth) {
      push(word, width);
      continue;
    }
    // Too wide for any line: split into pieces that each fit, keeping at least one cluster.
    let piece = "";
    let pieceWidth = 0;
    for (const cluster of clusters(word)) {
      const w = rawWidth(cluster) * scale;
      if (piece !== "" && pieceWidth + w > maxWidth) {
        push(piece, pieceWidth);
        if (cut) break;
        piece = "";
        pieceWidth = 0;
      }
      piece += cluster;
      pieceWidth += w;
    }
    if (!cut && piece !== "") push(piece, pieceWidth);
  }
  if (!cut) {
    if (line !== "") lines.push(line);
    return lines;
  }
  lines[lines.length - 1] = withEllipsis(lines[lines.length - 1]!, maxWidth, scale);
  return lines;
}

const ELLIPSIS = "\u2026";

/** `line` shortened by whole clusters until it and a trailing "…" fit `maxWidth`. */
function withEllipsis(line: string, maxWidth: number, scale: number): string {
  const kept = clusters(line);
  const ellipsisWidth = rawWidth(ELLIPSIS) * scale;
  let width = rawWidth(line) * scale;
  while (kept.length > 0 && width + ellipsisWidth > maxWidth) width -= rawWidth(kept.pop()!) * scale;
  return `${kept.join("").trimEnd()}${ELLIPSIS}`;
}
