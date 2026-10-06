import { describe, expect, it } from "vitest";
import { defaultStyle, namedColors, resolveColor, seriesStyles } from "../../src/core/style";

/** WCAG 2.1 relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colors. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const HEX6 = /^#[0-9a-f]{6}$/;

const styleColors: Array<[string, string]> = [
  ...Object.entries(defaultStyle.colors).map(([name, color]): [string, string] => [`defaultStyle.colors.${name}`, color]),
  ...Object.entries(namedColors).map(([name, color]): [string, string] => [`namedColors.${name}`, color]),
  ...seriesStyles.map((style, i): [string, string] => [`seriesStyles[${i}]`, style.color]),
];

describe("default style contrast (GSV-NFR-004, prd/CC-002)", () => {
  it("checks the WCAG formula against known values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it.each(styleColors)("%s (%s) has at least 3:1 contrast against the background", (_name, color) => {
    expect(contrast(color, defaultStyle.background)).toBeGreaterThanOrEqual(3);
  });
});

describe("default style values (GSV-REQ-044, AD-010, AD-011)", () => {
  it("writes every color as lowercase #rrggbb", () => {
    expect(defaultStyle.background).toMatch(HEX6);
    for (const [name, color] of styleColors) expect(color, name).toMatch(HEX6);
  });

  it("holds only values for SVG presentation attributes: no CSS, class names or stylesheets", () => {
    const keys: string[] = [];
    const visit = (value: unknown, path: string) => {
      if (value !== null && typeof value === "object") {
        for (const [key, inner] of Object.entries(value)) {
          keys.push(key);
          visit(inner, `${path}.${key}`);
        }
      } else {
        expect(["string", "number"], path).toContain(typeof value);
      }
    };
    visit(defaultStyle, "defaultStyle");
    visit(seriesStyles, "seriesStyles");
    for (const key of keys) expect(key).not.toMatch(/^(class|className|style|css|stylesheet)$/i);
  });

  it("uses positive line widths and text sizes", () => {
    for (const value of [...Object.values(defaultStyle.lineWidths), ...Object.values(defaultStyle.fontSizes)]) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it("uses the system font stack, with no bundled font (prd/CC-001)", () => {
    expect(defaultStyle.fontFamily).toMatch(/^system-ui,.*sans-serif$/);
    expect(defaultStyle.fontFamily).not.toMatch(/url\(|@font-face/);
  });

  it("cannot be changed at runtime", () => {
    expect(Object.isFrozen(defaultStyle)).toBe(true);
    expect(Object.isFrozen(defaultStyle.colors)).toBe(true);
    expect(Object.isFrozen(namedColors)).toBe(true);
    expect(Object.isFrozen(seriesStyles)).toBe(true);
    expect(Object.isFrozen(seriesStyles[0])).toBe(true);
  });
});

describe("series styles (AD-011, prd/CC-002)", () => {
  it("give every default series its own color, marker shape and dash pattern", () => {
    expect(seriesStyles).toHaveLength(6);
    for (const field of ["color", "marker", "dash"] as const) {
      expect(new Set(seriesStyles.map((style) => style[field])).size, field).toBe(seriesStyles.length);
    }
  });

  it("write dash patterns as stroke-dasharray values", () => {
    for (const { dash } of seriesStyles) expect(dash).toMatch(/^(none|\d+( \d+)*)$/);
  });
});

describe("colors in descriptions (GSV-REQ-042)", () => {
  it("publishes the plain-English color names", () => {
    expect(Object.keys(namedColors)).toEqual(["black", "gray", "red", "orange", "green", "blue", "purple", "brown"]);
  });

  it.each([
    ["blue", "#0072b2"],
    ["Blue", "#0072b2"],
    ["GRAY", "#595959"],
    ["#abc", "#aabbcc"],
    ["#AABBCC", "#aabbcc"],
    ["#0072b2", "#0072b2"],
  ])("accepts %j as %s", (value, hex) => {
    expect(resolveColor(value)).toBe(hex);
  });

  it.each(["blurple", "grey ", " blue", "#abcd", "#aabbccdd", "#ggg", "aabbcc", "rgb(0, 0, 0)", "", "toString", "constructor"])(
    "rejects %j",
    (value) => {
      expect(resolveColor(value)).toBeUndefined();
    },
  );

  it.each([null, undefined, 0x0072b2, true, {}, ["blue"]])("rejects the non-string %j", (value) => {
    expect(resolveColor(value)).toBeUndefined();
  });
});
