import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Graph } from "../../src/react/Graph";
import { NumberLineGraph } from "../../src/react/graphs/NumberLineGraph";
import { XyGraph } from "../../src/react/graphs/XyGraph";
import { XyzGraph } from "../../src/react/graphs/XyzGraph";

// NLC-NFR-002 in the default `node` environment, in a file that imports no jsdom and no axe helper,
// so nothing a browser library sets at import can reach these renders (the shape of
// ruler-server-render.test.tsx; graph-library NLC TICKET-005). Hydration and cross-engine equality
// are CPSE TICKET-004's, not repeated here.
const read = (type: string): unknown => JSON.parse(readFileSync(new URL(`../../examples/${type}.json`, import.meta.url), "utf8"));

const components = [
  ["number-line", NumberLineGraph],
  ["xy-graph", XyGraph],
  ["xyz-graph", XyzGraph],
] as const;

describe("every axis-based graph renders on a server, with no browser globals (NLC-NFR-002, prd/TC-005)", () => {
  it("runs with no window or document defined", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it.each(components)("renders the %s example to static markup through <Graph> and its own component", (type, Component) => {
    const description = read(type);
    const viaGraph = renderToStaticMarkup(createElement(Graph, { description }));
    const viaComponent = renderToStaticMarkup(createElement(Component, { description }));
    expect(viaGraph).toContain("<svg");
    expect(viaComponent).toContain("<svg");
    expect(viaGraph).toBe(viaComponent);
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });
});
