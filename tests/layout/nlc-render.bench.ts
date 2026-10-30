import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Graph } from "../../src/react/Graph";
import { expectP95 } from "../helpers/bench";

// NLC-NFR-004: rendering an x,y graph with 100 ticks per axis and 50 points to static markup in a
// Node.js server render takes at most 50 ms at p95, over at least 100 timed runs (graph-library NLC
// TICKET-005). Vitest runs benchmarks in their own project, through `pnpm bench` (a CI step).
const P95_LIMIT_MS = 50;
const TICKS = 100;
const POINTS = 50;

// An axis from 0 to 99 at spacing 1 has exactly 100 ticks.
const description = {
  type: "xy-graph",
  title: "A hundred ticks on each axis",
  xAxis: { min: 0, max: TICKS - 1, tickSpacing: 1 },
  yAxis: { min: 0, max: TICKS - 1, tickSpacing: 1 },
  showGrid: true,
  points: Array.from({ length: POINTS }, (_, i) => ({ x: (i * 37) % TICKS, y: (i * 53) % TICKS, label: `P${i + 1}` })),
};

// Bound once, so the timed loop reads local names, not module export getters.
const render = () => renderToStaticMarkup(createElement(Graph, { description }));

describe("graph rendering speed (NLC-NFR-004)", () => {
  test(`x,y graph, ${TICKS} ticks per axis and ${POINTS} points: p95 at most ${P95_LIMIT_MS} ms`, async ({ bench }) => {
    expect(typeof window).toBe("undefined");
    // A real graph, not the placeholder for an invalid description: 50 markers and 200 ticks and axes.
    const markup = render();
    expect(markup.match(/<circle /g)).toHaveLength(POINTS);
    expect(markup.match(/<line /g)!.length).toBeGreaterThanOrEqual(2 * TICKS + 2);
    const name = `xy-graph ${TICKS} ticks, ${POINTS} points`;
    const result = await bench(name, () => {
      render();
    }).run({ time: 2000, warmupTime: 500, iterations: 200, warmupIterations: 20 });
    expectP95(result, { requirement: "NLC-NFR-004", name, limitMs: P95_LIMIT_MS, minSamples: 100 });
  });
});
