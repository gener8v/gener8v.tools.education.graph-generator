import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { RULER_MAX_LENGTH } from "../../src/core/ruler";
import { createGraph } from "../../src/graph";
import { RulerGraph } from "../../src/react/graphs/RulerGraph";
import { SVG_IMAGE_RULES, axeSvgImage } from "../helpers/axe";
import { loadExample } from "../fixtures/examples";
import { EVERY_RULER, rulerSpanned } from "../fixtures/rulers";

const example = loadExample("ruler");

/** The `<svg>` of static markup, parsed outside the test's own globals. */
const svgOf = (markup: string) => new JSDOM(markup).window.document.querySelector("svg")!;

const textAlternativeOf = (description: unknown): string => {
  const result = createGraph(description);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.scene.textAlternative;
};

describe("every ruler is named for assistive technology (NLC-NFR-007, prd/CC-002)", () => {
  // The example, and the densest ruler of each kind: each unit and inch division at its maximum length.
  const divisions: Record<string, string> = { half: "halves", quarter: "quarters", eighth: "eighths" };
  const rulers: Array<[string, unknown]> = [
    ["the example", example],
    ...EVERY_RULER.filter(([unit, , length]) => length === RULER_MAX_LENGTH[unit]).map(([unit, division, length]): [string, unknown] => [
      unit === "centimeters" ? `${length} centimeters` : `${length} inches to ${divisions[division ?? ""] ?? "sixteenths"}`,
      rulerSpanned(unit, division, length, "Measure it"),
    ]),
  ];
  expect(rulers).toHaveLength(6);

  // axe runs inside its own window: no browser global is left behind once every case has run.
  afterAll(() => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("would report an SVG image with no name, so a pass means the rule ran", async () => {
    const { violations } = await axeSvgImage('<svg role="img" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="0" stroke="black"></line></svg>');
    expect(violations.map((violation) => violation.split(":")[0])).toEqual(["svg-img-alt"]);
  });

  it.each(rulers)("%s: role img, an accessible name equal to its text alternative, and no axe violations at the default size", async (_, description) => {
    const markup = renderToStaticMarkup(<RulerGraph description={description} />);
    const svg = svgOf(markup);
    const alternative = textAlternativeOf(description);
    expect(alternative.trim()).not.toBe("");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(alternative);
    // The <title> first, as AD-008 places it.
    expect(svg.firstElementChild?.tagName).toBe("title");
    expect(svg.firstElementChild?.textContent).toBe(alternative);
    const { violations, incomplete, passes } = await axeSvgImage(markup);
    expect(violations).toEqual([]);
    expect(incomplete).toEqual([]);
    // Every rule applied and passed: none silently became inapplicable.
    expect([...passes].sort()).toEqual([...SVG_IMAGE_RULES].sort());
  });
});
