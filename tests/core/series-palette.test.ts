import { describe, expect, it } from "vitest";
import { SERIES_LIMIT, type LineGraph } from "../../src/core/definitions/line-graph";
import { validate } from "../../src/core/index";
import { seriesStyles } from "../../src/core/style";
import { lineGraphLayout } from "../../src/layout/line-graph";
import { luminance, relativeLuminanceDifference as relativeDifference } from "../fixtures/luminance";

// DGP-NFR-004: the default colors of the first six line-graph series differ pairwise by at least
// 15% relative luminance (`relativeLuminanceDifference`, tests/fixtures/luminance.ts), so they stay
// apart in greyscale. `tests/core/style.test.ts` checks the palette itself; this checks what a line
// graph draws.

describe("DGP-NFR-004: default series colors stay apart in greyscale", () => {
  it("checks the luminance formula against known values", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1, 10);
    expect(relativeDifference("#ffffff", "#000000")).toBe(1);
  });

  it(`gives the first ${SERIES_LIMIT} series of a line graph colors that differ pairwise by at least 15% relative luminance`, () => {
    const result = validate({
      type: "line-graph",
      categories: [{ name: "A" }, { name: "B" }],
      series: Array.from({ length: SERIES_LIMIT }, () => ({ values: [1, 2] })),
    });
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    const scene = lineGraphLayout(result.description as LineGraph, result.provenance);
    // Each series' line, in order, before the legend's samples.
    const strokes = scene.nodes
      .filter((node) => node.kind === "polyline")
      .slice(0, SERIES_LIMIT)
      .map((node) => node.attrs.find(([key]) => key === "stroke")![1] as string);
    expect(strokes).toEqual(seriesStyles.slice(0, SERIES_LIMIT).map((style) => style.color));
    for (let i = 0; i < strokes.length; i++) {
      for (let j = i + 1; j < strokes.length; j++) {
        expect(relativeDifference(strokes[i]!, strokes[j]!), `series ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });
});
