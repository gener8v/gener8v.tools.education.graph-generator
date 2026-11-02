import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { createGraph } from "../../src/graph";
import { Graph } from "../../src/react/Graph";
import { circles, isTick, lines, num } from "../fixtures/scene-readers";
import { expectP95, fixedRuns } from "../helpers/bench";

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
    // The workload NLC-NFR-004 names, not a lighter one: exactly 100 tick marks on each axis (told
    // apart from the grid lines, which are a different width and color) and 50 point markers, all of
    // them in the markup that is timed.
    const graph = createGraph(description);
    if (!graph.ok) throw new Error(JSON.stringify(graph.issues));
    const ticks = lines(graph.scene).filter(isTick);
    expect(ticks.filter((tick) => num(tick, "x1") === num(tick, "x2")), "ticks across the x-axis").toHaveLength(TICKS);
    expect(ticks.filter((tick) => num(tick, "y1") === num(tick, "y2")), "ticks across the y-axis").toHaveLength(TICKS);
    expect(circles(graph.scene), "point markers").toHaveLength(POINTS);
    const markup = render();
    expect(markup.match(/<circle /g)).toHaveLength(POINTS);
    expect(markup.match(/<line /g)).toHaveLength(lines(graph.scene).length);
    const name = `xy-graph ${TICKS} ticks, ${POINTS} points`;
    // Exactly 200 timed runs, whatever the runner (`fixedRuns`).
    const result = await bench(name, () => {
      render();
    }).run({ ...fixedRuns(200), warmupTime: 500, warmupIterations: 20 });
    expectP95(result, { requirement: "NLC-NFR-004", name, limitMs: P95_LIMIT_MS, minSamples: 100 });
  });
});
