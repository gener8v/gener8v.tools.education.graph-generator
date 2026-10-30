import fc from "fast-check";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { createGraph } from "../../src/graph";
import { Graph } from "../../src/react/Graph";
import { loadExample } from "../fixtures/examples";
import { numberLineArb, xyGraphArb, xyzGraphArb } from "../fixtures/nlc-generators";
import { SVG_IMAGE_RULES, axeSvgImage } from "../helpers/axe";

// NLC-NFR-003: every rendered number line, x,y graph and x,y,z graph has role="img" and an accessible
// name equal to its text alternative, and passes axe-core's SVG image rules (graph-library NLC
// TICKET-005). Follows ruler.test.tsx; the example plus SAMPLES generated descriptions per type.
const SAMPLES = 20;
const SEED = 20260101;

const kinds: Array<[type: string, arbitrary: fc.Arbitrary<unknown>]> = [
  ["number-line", numberLineArb],
  ["xy-graph", xyGraphArb],
  ["xyz-graph", xyzGraphArb],
];

const cases: Array<[name: string, description: unknown]> = kinds.flatMap(([type, arbitrary]) => [
  [`the ${type} example`, loadExample(type)],
  ...fc.sample(arbitrary, { numRuns: SAMPLES, seed: SEED }).map((description, i): [string, unknown] => [`${type} sample ${i + 1}`, description]),
]);

/** The `<svg>` of static markup, parsed in a window that is closed once its attributes are read. */
function svgAttributes(markup: string): { role: string | null; label: string | null } {
  const { window } = new JSDOM(markup);
  try {
    const svg = window.document.querySelector("svg")!;
    return { role: svg.getAttribute("role"), label: svg.getAttribute("aria-label") };
  } finally {
    window.close();
  }
}

describe("every axis-based graph is named for assistive technology (NLC-NFR-003, prd/CC-002)", () => {
  it("covers each type's example and its generated samples", () => {
    expect(cases).toHaveLength(kinds.length * (1 + SAMPLES));
  });

  // axe runs inside its own window: no browser global is left behind once every case has run.
  afterAll(() => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("would report an SVG image with no name, so a pass means the rule ran", async () => {
    const { violations } = await axeSvgImage('<svg role="img" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="0" stroke="black"></line></svg>');
    expect(violations.map((violation) => violation.split(":")[0])).toEqual(["svg-img-alt"]);
  });

  it.each(cases)("%s: role img, an accessible name equal to its text alternative, and no axe violations at the default size", async (_, description) => {
    const markup = renderToStaticMarkup(<Graph description={description} />);
    const svg = svgAttributes(markup);
    const result = createGraph(description);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const alternative = result.scene.textAlternative;
    expect(alternative.trim()).not.toBe("");
    expect(svg.role).toBe("img");
    expect(svg.label).toBe(alternative);
    const { violations, incomplete, passes } = await axeSvgImage(markup);
    expect(violations).toEqual([]);
    expect(incomplete).toEqual([]);
    // Every rule applied and passed: none silently became inapplicable.
    expect([...passes].sort()).toEqual([...SVG_IMAGE_RULES].sort());
  });
});
