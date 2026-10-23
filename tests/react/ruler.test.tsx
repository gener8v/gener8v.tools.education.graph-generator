import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RULER_MAX_LENGTH, rulerScale } from "../../src/core/ruler";
import { createGraph } from "../../src/graph";
import { Graph } from "../../src/react/Graph";
import { RulerGraph } from "../../src/react/graphs/RulerGraph";
import { axeSvgImage } from "../helpers/axe";
import { EVERY_RULER } from "../fixtures/rulers";

const example: unknown = JSON.parse(readFileSync(new URL("../../examples/ruler.json", import.meta.url), "utf8"));

/** A ruler description with an object from its first mark to its last, and the title given. */
function ruler(unit: string, division: string | undefined, length: number, title?: string): object {
  const scale = rulerScale(unit, length, division)!;
  return {
    type: "ruler",
    rulerUnit: unit,
    length,
    ...(division !== undefined && { smallestDivision: division }),
    ...(title !== undefined && { title }),
    measuredObject: { start: scale.marks[0]!.value, end: scale.marks.at(-1)!.value, label: "string" },
  };
}

/** The `<svg>` of static markup, parsed outside the test's own globals. */
const svgOf = (markup: string) => new JSDOM(markup).window.document.querySelector("svg")!;

const textAlternativeOf = (description: unknown): string => {
  const result = createGraph(description);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.scene.textAlternative;
};

describe("every ruler renders on a server, with no browser globals (NLC-NFR-006, prd/TC-005)", () => {
  it("runs with no window or document defined", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders the example and all 78 rulers, each with an object, to static markup through <RulerGraph> and <Graph>", () => {
    const descriptions = [example, ...EVERY_RULER.map(([unit, division, length]) => ruler(unit, division, length))];
    expect(descriptions).toHaveLength(79);
    for (const description of descriptions) {
      const markup = renderToStaticMarkup(<RulerGraph description={description} />);
      expect(markup, JSON.stringify(description)).toMatch(/^<svg role="img" aria-label="A ruler[ ,]/);
      expect(renderToStaticMarkup(<Graph description={description} />)).toBe(markup);
    }
    expect(typeof window).toBe("undefined");
  });
});

describe("every ruler is named for assistive technology (NLC-NFR-007, prd/CC-002)", () => {
  // The example, and the densest ruler of each kind: each unit and inch division at its maximum length.
  const rulers: Array<[string, unknown]> = [
    ["the example", example],
    ...EVERY_RULER.filter(([unit, , length]) => length === RULER_MAX_LENGTH[unit]).map(
      ([unit, division, length]): [string, unknown] => [`${length} ${unit}${division === undefined ? "" : ` to ${division}s`}`, ruler(unit, division, length, "Measure it")],
    ),
  ];

  it("would report an SVG image with no name, so a pass means the rule ran", async () => {
    const { violations } = await axeSvgImage('<svg role="img" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="0" stroke="black"></line></svg>');
    expect(violations.map((violation) => violation.split(":")[0])).toEqual(["svg-img-alt"]);
  });

  it("covers the example and five maximum-length rulers", () => {
    expect(rulers).toHaveLength(6);
  });

  it.each(rulers)("%s: role img, an accessible name equal to its text alternative, and no axe violations at the default size", async (_, description) => {
    const markup = renderToStaticMarkup(<RulerGraph description={description} />);
    const svg = svgOf(markup);
    const alternative = textAlternativeOf(description);
    expect(alternative.trim()).not.toBe("");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(alternative);
    expect(svg.querySelector(":scope > title")?.textContent).toBe(alternative);
    const { violations, passes } = await axeSvgImage(markup);
    expect(violations).toEqual([]);
    expect(passes).toContain("svg-img-alt");
  });
});
