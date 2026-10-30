import fc from "fast-check";
import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Graph } from "../../src/react/Graph";
import { NumberLineGraph } from "../../src/react/graphs/NumberLineGraph";
import { XyGraph } from "../../src/react/graphs/XyGraph";
import { XyzGraph } from "../../src/react/graphs/XyzGraph";
import { loadExample } from "../fixtures/examples";
import { numberLineArb, xyGraphArb, xyzGraphArb } from "../fixtures/nlc-generators";
import { expectNoBrowserGlobalsTouched } from "../helpers/browser-globals";

// NLC-NFR-002 in the default `node` environment, in a file that imports no jsdom and no axe helper,
// so nothing a browser library sets at import can reach these renders (the shape of
// ruler-server-render.test.tsx, which shares the global-object check; graph-library NLC TICKET-005).
// Each type renders its example and a few generated descriptions. Hydration and cross-engine
// equality are CPSE TICKET-004's, not repeated here.
const SAMPLES = 5;
const sample = (arbitrary: fc.Arbitrary<unknown>): unknown[] => fc.sample(arbitrary, { numRuns: SAMPLES, seed: 20260102 });

const kinds: Array<{ type: string; Component: ComponentType<{ description: unknown }>; arbitrary: fc.Arbitrary<unknown> }> = [
  { type: "number-line", Component: NumberLineGraph, arbitrary: numberLineArb },
  { type: "xy-graph", Component: XyGraph, arbitrary: xyGraphArb },
  { type: "xyz-graph", Component: XyzGraph, arbitrary: xyzGraphArb },
];

describe("every axis-based graph renders on a server, with no browser globals (NLC-NFR-002, prd/TC-005)", () => {
  it("runs with no window or document defined", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it.each(kinds)("renders the $type example and $type descriptions generated from a fixed seed, through <Graph> and its own component", ({ type, Component, arbitrary }) => {
    const descriptions = [loadExample(type), ...sample(arbitrary)];
    expect(descriptions).toHaveLength(1 + SAMPLES);
    // The renders add, remove or replace no global, and leave window and document undefined.
    expectNoBrowserGlobalsTouched(() => {
      for (const description of descriptions) {
        const viaGraph = renderToStaticMarkup(createElement(Graph, { description }));
        const viaComponent = renderToStaticMarkup(createElement(Component, { description }));
        // An <svg>, not the placeholder an invalid description gets.
        expect(viaGraph, JSON.stringify(description)).toMatch(/^<svg /);
        expect(viaComponent, JSON.stringify(description)).toMatch(/^<svg /);
        expect(viaGraph).toBe(viaComponent);
      }
    });
  });
});
