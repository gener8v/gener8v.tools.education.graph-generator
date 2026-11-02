import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { Graph } from "../../src/react/Graph";
import { APPROXIMATED_MATH, mathOff } from "../fixtures/engine-math";
import { sampleDescriptions } from "../fixtures/descriptions";

// CPSE-NFR-005, TR-002: server and browser markup match only if no layout lets the last bit of an
// engine's `Math` decide its output (graph-library CPSE TICKET-004 code review CR-002). Renders
// generated descriptions of every graph type through <Graph> as Node computes them, then again with
// every approximated `Math` function a unit in the last place off, each way in turn, and expects
// the same markup. The Playwright comparison (tests/e2e/cross-engine.spec.ts) checks real engines on
// fewer descriptions; this checks the hazard itself on many. The seeds' samples reach every fix
// it guards: a ruler's mark width and an axis's tick ends on rounding boundaries, labels beside a
// cube's vertical edge, triangle labels that meet the drawing's bottom exactly, and triangle angles
// of whole multiples of 15°. Moving every function at once is one other engine; a description
// whose markup changes is printed whole, so it can be replayed.
// @spec CPSE-NFR-005

const SEEDS = [8, 22, 33] as const;
const COUNT = 1500;

const markupOf = (description: unknown) => renderToStaticMarkup(createElement(Graph, { description }));

/** Where two markup strings first differ, with some context, for the failure message. */
function firstDifference(expected: string, got: string): string {
  let at = 0;
  while (at < expected.length && expected[at] === got[at]) at++;
  const around = (text: string) => text.slice(Math.max(0, at - 60), at + 60);
  return `Node: …${around(expected)}…\n   off: …${around(got)}…`;
}

describe("the same markup whatever the last bit of Math (CPSE-NFR-005, TR-002)", () => {
  afterEach(() => vi.restoreAllMocks());

  // Each sample throws unless it reaches every graph type (`sampleDescriptions`).
  const samples = SEEDS.map((seed) => ({ seed, sample: sampleDescriptions(COUNT, seed) }));
  const exact = samples.map(({ sample }) => sample.map(markupOf));

  it("samples every graph type", () => {
    for (const { sample } of samples) expect(new Set(sample.map((description) => description.type))).toEqual(new Set(GRAPH_TYPES));
  });

  for (const steps of [-1, 1]) {
    it(`renders ${COUNT} descriptions from each of seeds ${SEEDS.join(" and ")} the same with all ${APPROXIMATED_MATH.length} approximated Math functions ${steps} in the last place`, () => {
      mathOff(steps);
      const changed: string[] = [];
      samples.forEach(({ seed, sample }, s) => {
        sample.forEach((description, i) => {
          const markup = markupOf(description);
          if (markup !== exact[s]![i]) changed.push(`seed ${seed} #${i} ${JSON.stringify(description)}\n   ${firstDifference(exact[s]![i]!, markup)}`);
        });
      });
      vi.restoreAllMocks();
      expect(changed, `${changed.length} description(s) drawn differently:\n${changed.join("\n")}`).toEqual([]);
    });
  }
});

// What was once the one residual AD-007 accepted: a triangle given by three sides whose third
// vertex lands exactly on a rounding boundary. With sides 18, 19.98 and 14.13 its x is
// 124.4565 ÷ 36 = 3.457125 model units, drawn at 126.095, and it used to be computed as
// reach × cos(atan2(…)), so the last bit decided 126.09 or 126.1. The vertex is now built from the
// sides with arithmetic and `sqrt` alone, so it stays the same (graph-library GSS TICKET-009).
describe("a triangle whose vertex is on a rounding boundary (AD-007, TR-002)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("draws the sides 18, 19.98, 14.13 triangle the same when Math is 1 or 3 units in the last place off", () => {
    const description = { type: "triangle", sideA: 18, sideB: 19.98, sideC: 14.13 };
    const exact = markupOf(description);
    for (const steps of [-3, -1, 1, 3]) {
      mathOff(steps);
      const markup = markupOf(description);
      vi.restoreAllMocks();
      expect(markup, `${steps} in the last place`).toBe(exact);
    }
  });
});
