import { readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { exportSource } from "../../src/export/index";
import { Graph } from "../../src/react/Graph";
import { exportedComponent, typecheckExports } from "../helpers/exported";
import { loadExample } from "../fixtures/examples";

// CPSE-NFR-001: for every example, the exported component, compiled as a consumer compiles it,
// renders the markup the package's component renders, character for character (AD-002, AD-013).

const examples = readdirSync(new URL("../../examples/", import.meta.url))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

const exported = (example: string) => {
  const result = exportSource(loadExample(example), { componentName: "Exported" });
  if (!result.ok) throw new Error(`${example} did not export: ${result.issues.map((issue) => issue.message).join("; ")}`);
  return result.source;
};

describe("export equality (CPSE-NFR-001, CPSE-REQ-020)", () => {
  it("covers an example of every graph type", () => {
    const types = new Set(examples.map((example) => (loadExample(example) as { type: string }).type));
    expect([...types].sort()).toEqual([...GRAPH_TYPES].sort());
  });

  for (const example of examples) {
    it(`renders examples/${example}.json exactly as the package component does`, () => {
      const description = loadExample(example);
      const Exported = exportedComponent(exported(example), "Exported");
      // React prints an attribute it does not know (`stroke-width` for `strokeWidth`) as written, so
      // the markup alone cannot catch a prop name the shared table does not give; its warning can.
      const warnings = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const expected = renderToStaticMarkup(createElement(Graph, { description }));
        expect(expected.startsWith("<svg ")).toBe(true);
        expect(renderToStaticMarkup(createElement(Exported))).toBe(expected);
        expect(warnings.mock.calls).toEqual([]);
      } finally {
        warnings.mockRestore();
      }
    });
  }

  it("exports files that type-check in a strict TypeScript project with React's types", () => {
    expect(typecheckExports(Object.fromEntries(examples.map((example) => [example, exported(example)])))).toEqual([]);
  });
});
