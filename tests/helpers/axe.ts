import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type axe from "axe-core";
import { JSDOM } from "jsdom";

/**
 * The axe rules for an SVG image: its accessible name (`svg-img-alt`), and the ARIA attributes and
 * role it carries. axe's colour-contrast rule does not evaluate SVG strokes, so mark contrast is
 * not among them (rulers NLC TICKET-004 D5).
 */
export const SVG_IMAGE_RULES = ["svg-img-alt", "aria-allowed-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-roles"] as const;

/**
 * axe-core's browser bundle, read as text and never imported, so it runs only inside the JSDOM
 * window: importing it would run its bundle in Node's realm, which adds `__core-js_shared__` to
 * the global object (rulers NLC TICKET-004 code review CR-001).
 */
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

export interface AxeSvgResult {
  /** Each violated rule's id and help text, with each failing element's selector and failure summary. */
  violations: string[];
  /** The ids of the rules axe could not decide ("needs review"), which are neither a pass nor a violation. */
  incomplete: string[];
  /** The ids of the rules that applied and passed, so a test can tell a pass from a rule that never ran. */
  passes: string[];
}

/**
 * Runs `SVG_IMAGE_RULES` over static markup. The markup is loaded into a fresh JSDOM window and
 * axe-core is evaluated only inside that window, so the globals it sets stay on the window and none
 * reaches the Node environment (NLC-NFR-002, NLC-NFR-006). The window isolates globals, not code:
 * it is a Node.js `vm` context, not a sandbox, so axe-core is trusted as a pinned devDependency
 * (rulers NLC TICKET-004 security review SEC-001). Shared by the ruler's tests and graph-library
 * NLC TICKET-005's.
 */
export async function axeSvgImage(markup: string): Promise<AxeSvgResult> {
  const dom = new JSDOM(`<!doctype html><html lang="en"><head><title>Graph</title></head><body>${markup}</body></html>`, { runScripts: "outside-only" });
  try {
    dom.window.eval(AXE_SOURCE);
    const inWindow = (dom.window as unknown as { axe: typeof axe }).axe;
    const results = await inWindow.run(dom.window.document.body, { runOnly: { type: "rule", values: [...SVG_IMAGE_RULES] } });
    return {
      violations: results.violations.map(
        (rule) => `${rule.id}: ${rule.help} (${rule.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`).join("; ")})`,
      ),
      incomplete: results.incomplete.map((rule) => rule.id),
      passes: results.passes.map((rule) => rule.id),
    };
  } finally {
    dom.window.close();
  }
}
