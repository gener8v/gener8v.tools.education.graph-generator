import { readFileSync } from "node:fs";
import fc from "fast-check";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { createGraph } from "../../src/graph";
import { Graph } from "../../src/react/Graph";
import { numberLineArb, xyGraphArb, xyzGraphArb } from "../fixtures/nlc-generators";
import { SVG_IMAGE_RULES, axeSvgImage } from "../helpers/axe";

// NLC-NFR-003: every rendered number line, x,y graph and x,y,z graph has role="img" and an accessible
// name equal to its text alternative, and passes axe-core's SVG image rules (graph-library NLC
// TICKET-005). Follows ruler.test.tsx; the examples plus a few generated descriptions per type.
const example = (type: string): unknown => JSON.parse(readFileSync(new URL(`../../examples/${type}.json`, import.meta.url), "utf8"));
const SAMPLES = 3;
const samples = (arbitrary: fc.Arbitrary<unknown>): unknown[] => fc.sample(arbitrary, { numRuns: SAMPLES, seed: 20260101 });

const cases: Array<[string, unknown]> = [
  ["number-line", numberLineArb],
  ["xy-graph", xyGraphArb],
  ["xyz-graph", xyzGraphArb],
].flatMap(([type, arbitrary]) => [
  [`the ${type as string} example`, example(type as string)] as [string, unknown],
  ...samples(arbitrary as fc.Arbitrary<unknown>).map((description, i): [string, unknown] => [`${type as string} sample ${i + 1}`, description]),
]);

/** The `<svg>` of static markup, parsed outside the test's own globals. */
const svgOf = (markup: string) => new JSDOM(markup).window.document.querySelector("svg")!;

describe("every axis-based graph is named for assistive technology (NLC-NFR-003, prd/CC-002)", () => {
  expect(cases).toHaveLength(3 * (1 + SAMPLES));

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
    const svg = svgOf(markup);
    const result = createGraph(description);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const alternative = result.scene.textAlternative;
    expect(alternative.trim()).not.toBe("");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(alternative);
    const { violations, incomplete, passes } = await axeSvgImage(markup);
    expect(violations).toEqual([]);
    expect(incomplete).toEqual([]);
    // Every rule applied and passed: none silently became inapplicable.
    expect([...passes].sort()).toEqual([...SVG_IMAGE_RULES].sort());
  });
});
