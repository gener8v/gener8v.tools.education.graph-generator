import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Plugin, build } from "esbuild";
import { describe, expect, it } from "vitest";

// Importing one graph type must not bring in the others (AD-001, CPSE-REQ-004, prd/TC-007;
// code review CR-002 on CPSE TICKET-003). The package's layout table is empty until the type
// tickets land, so this bundles with a second type's layout put into it, and checks that a
// per-type component leaves it out while the entry component keeps it.

const root = fileURLToPath(new URL("../..", import.meta.url));
const OTHER = "OTHER_TYPE_LAYOUT_MARKER";
const OWN = "OWN_TYPE_LAYOUT_MARKER";
const UNUSED = "UNUSED_COMPONENT_LAYOUT_MARKER";
// A graph type that is never given a real layout here, so the marker cannot clash with one.
const OTHER_TYPE = "cylinder";

/** Puts a layout for another type, carrying a marker, into `src/layout/registry.ts`'s table. */
const withOtherLayout: Plugin = {
  name: "with-other-layout",
  setup(b) {
    b.onLoad({ filter: /src[\\/]layout[\\/]registry\.ts$/ }, (args) => {
      const source = readFileSync(args.path, "utf8");
      // The opening of the table's entries, whatever entries the type tickets have added since
      // (quality review QR-001). The marker goes first, so it works for an empty table too.
      const opening = /(Object\.create\(null\) as Partial<Record<GraphType, Layout>>,\s*\{)/;
      if (!opening.test(source)) throw new Error("the layout table's shape changed; update this test");
      const filled = source.replace(opening, `$1 "${OTHER_TYPE}": () => { throw new Error("${OTHER}"); },`);
      return { contents: filled, loader: "ts" };
    });
  },
};

/** A module named `virtual:graphs`, resolved from the repository root. */
const virtualGraphs = (contents: string): Plugin => ({
  name: "virtual-graphs",
  setup(b) {
    b.onResolve({ filter: /^virtual:graphs$/ }, () => ({ path: "virtual:graphs", namespace: "virtual" }));
    b.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({ contents, loader: "tsx", resolveDir: root }));
  },
});

async function bundle(entry: string, graphsModule = ""): Promise<string> {
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: "tsx", sourcefile: "entry.tsx" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    treeShaking: true,
    minify: true,
    jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    plugins: [withOtherLayout, virtualGraphs(graphsModule)],
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

describe("per-type components bundle only their own type (AD-001, CPSE-REQ-004)", () => {
  it("leaves another type's layout out of a per-type component's bundle", async () => {
    const code = await bundle(`
      import { createGraphComponent } from "./src/react/createGraphComponent";
      import { circle } from "./tests/fixtures/definitions/circle";
      const layout = () => { throw new Error("${OWN}"); };
      export const CircleGraph = createGraphComponent("circle", { definition: circle, layout });
    `);
    expect(code).toContain(OWN);
    expect(code).not.toContain(OTHER);
  });

  it("drops a per-type component nothing imports, when it is marked pure (QR-003)", async () => {
    const twoComponents = `
      import { createGraphComponent } from "./src/react/createGraphComponent";
      import { circle } from "./tests/fixtures/definitions/circle";
      export const CircleGraph = /* @__PURE__ */ createGraphComponent("circle", { definition: circle, layout: () => { throw new Error("${OWN}"); } });
      export const UnusedGraph = /* @__PURE__ */ createGraphComponent("circle", { definition: circle, layout: () => { throw new Error("${UNUSED}"); } });
    `;
    const code = await bundle(`export { CircleGraph } from "virtual:graphs";`, twoComponents);
    expect(code).toContain(OWN);
    expect(code).not.toContain(UNUSED);
  });

  it("keeps every type's layout in the entry component's bundle", async () => {
    const code = await bundle(`export { Graph } from "./src/react/Graph";`);
    expect(code).toContain(OTHER);
  });
});
