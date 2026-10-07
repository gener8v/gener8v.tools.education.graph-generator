import { describe, expect, it } from "vitest";
import { defaultStyle } from "../../../src/core/style";
import { DEFAULT_FONT_STACK, TEXT_WIDTH_SAFETY, textWidth, wrap } from "../../../src/layout/kit/text";
import { BENIGN_TEXT, HOSTILE_TEXT } from "../../fixtures/plain-text";

describe("textWidth (AD-010)", () => {
  it("uses the system font stack from the default style", () => {
    expect(DEFAULT_FONT_STACK).toBe(defaultStyle.fontFamily);
    expect(DEFAULT_FONT_STACK).toContain("Helvetica");
  });

  it("estimates from Helvetica/Arial widths times 1.1", () => {
    // "Hi" = H 722 + i 222 thousandths of an em
    expect(textWidth("Hi", 10)).toBeCloseTo(((722 + 222) / 1000) * 10 * 1.1, 10);
    expect(TEXT_WIDTH_SAFETY).toBe(1.1);
    expect(textWidth("", 14)).toBe(0);
  });

  it("scales with font size", () => {
    expect(textWidth("Fractions", 28)).toBeCloseTo(2 * textWidth("Fractions", 14), 10);
  });

  it("gives East Asian characters a full em and combining marks no width", () => {
    expect(textWidth("数轴", 10)).toBeCloseTo(2 * 10 * 1.1, 10);
    expect(textWidth("é", 10)).toBeCloseTo(textWidth("e", 10), 10);
    expect(textWidth(`${String.fromCodePoint(0x1f44d)}️`, 10)).toBeCloseTo(11, 10);
  });

  it("estimates every fixture string as a positive finite width", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT]) {
      const width = textWidth(text, 14);
      expect(Number.isFinite(width) && width > 0).toBe(true);
    }
  });
});

describe("wrap (prd/TC-011)", () => {
  it("keeps text that fits on one line", () => {
    expect(wrap("Fractions of a whole", 400, 14)).toEqual(["Fractions of a whole"]);
  });

  it("breaks on word boundaries and every line fits", () => {
    const text = "The number line shows every whole number from zero to twenty with labelled ticks";
    const lines = wrap(text, 120, 14);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) expect(textWidth(line, 14)).toBeLessThanOrEqual(120 + 1e-9);
  });

  it("collapses runs of whitespace and ignores leading and trailing space", () => {
    expect(wrap("  a \n\t b  ", 400, 14)).toEqual(["a b"]);
    expect(wrap("   ", 400, 14)).toEqual([]);
  });

  it("splits a word wider than the line between code points", () => {
    const word = "Supercalifragilisticexpialidocious";
    const lines = wrap(word, 60, 14);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(word);
    for (const line of lines) expect(textWidth(line, 14)).toBeLessThanOrEqual(60 + 1e-9);
  });

  it("never splits a surrogate pair", () => {
    const text = String.fromCodePoint(0x1f600).repeat(10);
    const lines = wrap(text, 20, 14);
    expect(lines.join("")).toBe(text);
    for (const line of lines) expect(line).toBe(String.fromCodePoint(0x1f600));
  });

  it("keeps one code point per line when a single character is wider than the line", () => {
    expect(wrap("WW", 1, 14)).toEqual(["W", "W"]);
  });

  it("handles very long text in linear time", () => {
    const text = "word ".repeat(100_000) + "x".repeat(200_000);
    const start = performance.now();
    const lines = wrap(text, 200, 14);
    expect(performance.now() - start).toBeLessThan(2_000);
    expect(lines.length).toBeGreaterThan(1000);
  });
});
