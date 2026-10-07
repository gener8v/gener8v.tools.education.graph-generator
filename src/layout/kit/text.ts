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

const ZERO_WIDTH: ReadonlyArray<readonly [number, number]> = [
  [0x0300, 0x036f], // combining diacritical marks
  [0x0483, 0x0489],
  [0x0591, 0x05bd],
  [0x064b, 0x065f], // Arabic harakat
  [0x0900, 0x0903], // Devanagari signs
  [0x093a, 0x094f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x200b, 0x200f], // zero-width space, joiners, direction marks
  [0x20d0, 0x20ff], // combining marks for symbols
  [0xfe00, 0xfe0f], // variation selectors
  [0xfe20, 0xfe2f],
  [0x1f3fb, 0x1f3ff], // emoji skin-tone modifiers
  [0xe0000, 0xe01ef], // tags and supplementary variation selectors
];

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

/**
 * Break `text` into lines no wider than `maxWidth` at `fontSize`, on word boundaries (SVG text does
 * not wrap; prd/TC-011). A single word wider than `maxWidth` is split between code points so every
 * line fits. Runs in time linear in the length of the text, however long it is.
 */
// @spec CPSE-REQ-011
export function wrap(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const scale = (fontSize * TEXT_WIDTH_SAFETY) / 1000;
  const spaceWidth = advance(0x20) * scale;
  const lines: string[] = [];
  let line = "";
  let lineWidth = 0;

  const push = (word: string, width: number) => {
    if (line !== "" && lineWidth + spaceWidth + width <= maxWidth) {
      line += ` ${word}`;
      lineWidth += spaceWidth + width;
      return;
    }
    if (line !== "") lines.push(line);
    line = word;
    lineWidth = width;
  };

  for (const word of words) {
    const width = rawWidth(word) * scale;
    if (width <= maxWidth) {
      push(word, width);
      continue;
    }
    // Too wide for any line: split into pieces that each fit, keeping at least one code point.
    let piece = "";
    let pieceWidth = 0;
    forEachCodePoint(word, (code, char) => {
      const w = advance(code) * scale;
      if (piece !== "" && pieceWidth + w > maxWidth) {
        push(piece, pieceWidth);
        piece = "";
        pieceWidth = 0;
      }
      piece += char;
      pieceWidth += w;
    });
    if (piece !== "") push(piece, pieceWidth);
  }
  if (line !== "") lines.push(line);
  return lines;
}
