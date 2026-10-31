import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { Graph } from "../../src/index";
import type { HydrationResult } from "./page-api";
import { loadExamples, preparePage } from "./bundle";

// CPSE-NFR-005: every shipped example, server-rendered through <Graph> in Node, hydrates in
// Chromium and WebKit with no hydration warning, console error or warning, page error or React
// recoverable error, and hydration leaves the server's markup exactly as it was (graph-library
// CPSE TICKET-004). The examples are globbed, so a new graph type is covered by adding its example.

const examples = loadExamples();

test("has an example of every graph type", () => {
  const types = new Set(examples.map(({ description }) => (description as { type?: unknown }).type));
  expect(GRAPH_TYPES.filter((type) => !types.has(type)), "graph types with no example").toEqual([]);
});

// @spec CPSE-NFR-005
for (const { file, description } of examples) {
  test(`hydrates ${file} with no warning and no change to the server markup`, async ({ page }) => {
    const serverMarkup = renderToString(createElement(Graph, { description }));
    // A drawing, not the placeholder an invalid description gets.
    expect(serverMarkup).toMatch(/^<svg /);

    const problems = await preparePage(page, `<div id="root">${serverMarkup}</div>`);
    // The server markup as this engine parsed it, before React touches it.
    const parsed = await page.evaluate(() => document.getElementById("root")!.innerHTML);
    const result = JSON.parse(await page.evaluate(([json, id]) => window.graphE2E.hydrate(json, id), [JSON.stringify(description), "root"] as const)) as HydrationResult;

    expect(result.errors, "React hydration errors").toEqual([]);
    expect(problems, "console errors, warnings and page errors").toEqual([]);
    expect(result.html, "hydration changed the parsed server markup").toBe(parsed);
    expect(result.html, "hydrated markup differs from the server markup").toBe(serverMarkup);
  });
}
