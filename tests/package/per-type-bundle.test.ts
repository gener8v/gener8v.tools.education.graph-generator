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

/** Puts a number-line layout, carrying a marker, into `src/layout/registry.ts`'s table. */
const withOtherLayout: Plugin = {
  name: "with-other-layout",
  setup(b) {
    b.onLoad({ filter: /src[\\/]layout[\\/]registry\.ts$/ }, (args) => {
      const source = readFileSync(args.path, "utf8");
      const empty = "Partial<Record<GraphType, Layout>>, {})";
      if (!source.includes(empty)) throw new Error("the layout table's shape changed; update this test");
      const filled = source.replace(empty, `Partial<Record<GraphType, Layout>>, { "number-line": () => { throw new Error("${OTHER}"); } })`);
      return { contents: filled, loader: "ts" };
    });
  },
};

async function bundle(entry: string): Promise<string> {
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
    plugins: [withOtherLayout],
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

  it("keeps every type's layout in the entry component's bundle", async () => {
    const code = await bundle(`export { Graph } from "./src/react/Graph";`);
    expect(code).toContain(OTHER);
  });
});
