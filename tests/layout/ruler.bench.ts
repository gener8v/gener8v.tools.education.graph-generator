import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { RULER_MAX_LENGTH } from "../../src/core/ruler";
import { RulerGraph } from "../../src/react/graphs/RulerGraph";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { expectP95 } from "../helpers/bench";

// NLC-NFR-008: a ruler of the maximum length in either unit, with an object, renders in at most
// 50 ms at p95 in a server render on a CI runner. Each case is a whole server render, validation,
// layout and markup, of the largest valid ruler: 30 cm (301 marks) and 12 in at sixteenths
// (193 marks), with the title and the object's label at the caller text limit, as words and as
// one cluster (ready-tickets reconciliation, 2026-10-21). Runs through `pnpm bench`, not `pnpm test`.
const P95_LIMIT_MS = 50;

const texts = { words: wordsOf(CALLER_TEXT_LIMIT), "one cluster": oneClusterTexts(CALLER_TEXT_LIMIT).latinMarks };

const cases = (["centimeters", "inches"] as const).flatMap((unit) =>
  Object.entries(texts).map(([kind, text]) => ({
    name: `${RULER_MAX_LENGTH[unit]} ${unit}, texts as ${kind}`,
    description: {
      type: "ruler",
      rulerUnit: unit,
      length: RULER_MAX_LENGTH[unit],
      title: text,
      measuredObject: { start: 0, end: RULER_MAX_LENGTH[unit], label: text },
    },
  })),
);

describe("ruler rendering speed (NLC-NFR-008)", () => {
  for (const { name, description } of cases) {
    test(`${name}: p95 at most ${P95_LIMIT_MS} ms`, async ({ bench }) => {
      // A render that fell back to the invalid-description placeholder would time the wrong thing.
      expect(renderToStaticMarkup(createElement(RulerGraph, { description }))).toMatch(/^<svg role="img" aria-label="A ruler titled/);
      const result = await bench(name, () => {
        renderToStaticMarkup(createElement(RulerGraph, { description }));
      }).run({ time: 500, warmupTime: 100 });
      // Vitest warns that the render reads module export getters many times: the package's own
      // modules, as Vitest transforms them. The printed line says so, so the log explains itself.
      expectP95(result, {
        requirement: "NLC-NFR-008",
        name,
        limitMs: P95_LIMIT_MS,
        note: "Vitest's export-getter warning above only adds to this time",
      });
    });
  }
});
