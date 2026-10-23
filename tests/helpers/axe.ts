import axe from "axe-core";
import { JSDOM } from "jsdom";

/**
 * The axe rules for an SVG image: its accessible name (`svg-img-alt`), and the ARIA attributes and
 * role it carries. axe's colour-contrast rule does not evaluate SVG strokes, so mark contrast is
 * not among them (rulers NLC TICKET-004 D5).
 */
export const SVG_IMAGE_RULES = ["svg-img-alt", "aria-allowed-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-roles"] as const;

export interface AxeSvgResult {
  /** Each violated rule's id and the help text axe gives. */
  violations: string[];
  /** The ids of the rules that applied and passed, so a test can tell a pass from a rule that never ran. */
  passes: string[];
}

/**
 * Runs `SVG_IMAGE_RULES` over static markup. The markup is loaded into a fresh JSDOM window and
 * axe-core is evaluated inside that window, so no browser global reaches the Node environment the
 * other tests run in (NLC-NFR-002, NLC-NFR-006). Shared by the ruler's tests and graph-library NLC
 * TICKET-005's.
 */
export async function axeSvgImage(markup: string): Promise<AxeSvgResult> {
  const dom = new JSDOM(`<!doctype html><html lang="en"><head><title>Graph</title></head><body>${markup}</body></html>`, { runScripts: "outside-only" });
  try {
    dom.window.eval(axe.source);
    const inWindow = (dom.window as unknown as { axe: typeof axe }).axe;
    const results = await inWindow.run(dom.window.document.body, { runOnly: { type: "rule", values: [...SVG_IMAGE_RULES] } });
    return {
      violations: results.violations.map((rule) => `${rule.id}: ${rule.help}`),
      passes: results.passes.map((rule) => rule.id),
    };
  } finally {
    dom.window.close();
  }
}
