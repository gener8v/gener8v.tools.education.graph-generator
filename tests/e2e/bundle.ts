import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { build } from "esbuild";

// Shared by the Playwright specs (graph-library CPSE TICKET-004): the page bundle, the examples,
// and a page that records every console error or warning and page error.

const root = fileURLToPath(new URL("../..", import.meta.url));

let bundled: Promise<string> | undefined;

/**
 * ./page-entry.ts with the package's React entry and React, bundled once per worker for the browser
 * as one script. React's development build, so a hydration mismatch is reported on the console.
 */
export function browserBundle(): Promise<string> {
  bundled ??= build({
    entryPoints: [fileURLToPath(new URL("./page-entry.ts", import.meta.url))],
    absWorkingDir: root,
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": JSON.stringify("development") },
    logLevel: "silent",
  }).then((result) => result.outputFiles[0]!.text);
  return bundled;
}

/** One shipped example: its file name and parsed description. */
export interface Example {
  file: string;
  description: unknown;
}

/**
 * Every `examples/*.json`, read fresh, in name order; `examples/invalid/` is a directory and left
 * out. A new graph type's example is covered by adding its file (TICKET-004 acceptance criteria).
 */
export function loadExamples(): Example[] {
  const dir = new URL("../../examples/", import.meta.url);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .map((file) => ({ file, description: JSON.parse(readFileSync(new URL(file, dir), "utf8")) as unknown }));
}

/**
 * Starts recording on `page` every console error and warning and every uncaught page error, then
 * sets its content to `body` and injects the page bundle. Returns the live list of what was recorded.
 */
export async function preparePage(page: Page, body: string): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.name}: ${error.message}`));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><title>graph</title></head><body>${body}</body></html>`);
  await page.addScriptTag({ content: await browserBundle() });
  return problems;
}

/** Where two strings first differ, with a little of each around it, for a failure message. */
export function firstDifference(expected: string, actual: string): string {
  let i = 0;
  while (i < expected.length && i < actual.length && expected[i] === actual[i]) i++;
  const around = (text: string) => JSON.stringify(text.slice(Math.max(0, i - 60), i + 60));
  return `first difference at ${i}: expected …${around(expected)}… got …${around(actual)}…`;
}
