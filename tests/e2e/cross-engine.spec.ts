import { type Page, expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { Graph } from "../../src/index";
import { CROSS_ENGINE_SAMPLE, ONE_CLUSTER_TEXTS_AT_LIMIT, sampleDescriptions, textsOf } from "../fixtures/descriptions";
import type { RenderAllResult } from "./page-api";
import { firstDifference, loadExamples, preparePage } from "./bundle";

// TR-002 (prd/TC-002, prd/RF-003): the markup Node.js renders equals, byte for byte, the markup
// rendered in Chromium and in WebKit, for every shipped example and for generated valid
// descriptions of every graph type (graph-library CPSE TICKET-004). The descriptions are generated
// once, in Node, from a fixed seed, and passed to each engine as JSON, so every engine renders the
// same ones. Two comparisons per description: the engine's `renderToStaticMarkup` against Node's
// (the layout's arithmetic in that engine's JavaScript), and the engine's client render against
// Node's markup as that engine parses it (the DOM a browser builds). A difference is never
// tolerated: fix the number formatting in src/layout/kit/format.ts or snap the offending value
// (TR-002 mitigation); never loosen this comparison.

/** How many generated descriptions each engine renders, from `SEED`. */
const { count: GENERATED, seed: SEED } = CROSS_ENGINE_SAMPLE;

interface Case {
  name: string;
  description: unknown;
}

/** Each description's mismatches between Node's markup and an engine's, as readable lines. */
async function mismatches(page: Page, cases: readonly Case[]): Promise<string[]> {
  const nodeMarkup = cases.map(({ description }) => renderToStaticMarkup(createElement(Graph, { description })));
  // Every case is drawn: a valid description gives an <svg>, not the placeholder.
  for (const [i, markup] of nodeMarkup.entries()) expect(markup, cases[i]!.name).toMatch(/^<svg /);

  const problems = await preparePage(page, "");
  const result = JSON.parse(
    await page.evaluate(([descriptions, markup]) => window.graphE2E.renderAll(descriptions, markup), [JSON.stringify(cases.map(({ description }) => description)), JSON.stringify(nodeMarkup)] as const),
  ) as RenderAllResult;
  expect(problems, "console errors, warnings and page errors").toEqual([]);
  expect(result.staticMarkup).toHaveLength(cases.length);

  const found: string[] = [];
  cases.forEach(({ name, description }, i) => {
    const node = nodeMarkup[i]!;
    const where = `${name}: ${JSON.stringify(description)}`;
    if (result.staticMarkup[i] !== node) found.push(`${where}\n  renderToStaticMarkup ${firstDifference(node, result.staticMarkup[i]!)}`);
    if (result.clientMarkup[i] !== result.parsedNodeMarkup[i]) found.push(`${where}\n  client render ${firstDifference(result.parsedNodeMarkup[i]!, result.clientMarkup[i]!)}`);
  });
  return found;
}

// @spec CPSE-NFR-005
test("renders every example to the same markup as Node.js", async ({ page }) => {
  const cases = loadExamples().map(({ file, description }) => ({ name: file, description }));
  expect(cases.length).toBeGreaterThanOrEqual(GRAPH_TYPES.length);
  expect(await mismatches(page, cases)).toEqual([]);
});

// @spec CPSE-NFR-005
test(`renders ${GENERATED} generated descriptions of every graph type to the same markup as Node.js`, async ({ page }) => {
  const descriptions = sampleDescriptions(GENERATED, SEED);
  // Every graph type is reached (sampleDescriptions throws otherwise), and caller text at the limit,
  // one cluster of marks at the limit included, where engines most likely differ (TICKET-004 hazard).
  expect(new Set(descriptions.map(({ type }) => type)).size).toBe(GRAPH_TYPES.length);
  const texts = descriptions.flatMap(textsOf);
  expect(texts.some((text) => [...text].length === CALLER_TEXT_LIMIT)).toBe(true);
  expect(texts.some((text) => ONE_CLUSTER_TEXTS_AT_LIMIT.includes(text))).toBe(true);

  const cases = descriptions.map((description, i) => ({ name: `#${i} ${String(description.type)}`, description }));
  expect(await mismatches(page, cases)).toEqual([]);
});
