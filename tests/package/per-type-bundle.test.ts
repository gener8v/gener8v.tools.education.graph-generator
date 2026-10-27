import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Plugin, build } from "esbuild";
import { describe, expect, it } from "vitest";
import { images } from "../../src/images/index";

// Importing one graph type must not bring in the others (AD-001, CPSE-REQ-004, prd/TC-007;
// code review CR-002 on CPSE TICKET-003). Until a second type lands, this bundles with a second
// type's layout and definition put into the package's tables, and checks that a per-type component
// leaves both out while the entry component keeps them (GSS TICKET-002 DEL-002).

const root = fileURLToPath(new URL("../..", import.meta.url));
const OTHER = "OTHER_TYPE_LAYOUT_MARKER";
const OTHER_DEFINITION = "OTHER_TYPE_DEFINITION_MARKER";
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

/** Puts a definition for another type, carrying a marker, into `src/core/definitions/index.ts`'s table. */
const withOtherDefinition: Plugin = {
  name: "with-other-definition",
  setup(b) {
    b.onLoad({ filter: /src[\\/]core[\\/]definitions[\\/]index\.ts$/ }, (args) => {
      const source = readFileSync(args.path, "utf8");
      const opening = /(Object\.create\(null\) as Partial<Record<GraphType, GraphTypeDefinition>>,\s*\{)/;
      if (!opening.test(source)) throw new Error("the definitions table's shape changed; update this test");
      const filled = source.replace(opening, `$1 "${OTHER_TYPE}": { type: "${OTHER_TYPE}", title: "${OTHER_DEFINITION}" } as never,`);
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
    plugins: [withOtherLayout, withOtherDefinition, virtualGraphs(graphsModule)],
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

/**
 * `entry`, a module importing the built package (`dist/`, which the global setup builds), bundled
 * as a consumer's bundler would bundle it, as `pnpm size` measures it (quality review QR-005).
 */
async function consumerBundle(entry: string): Promise<string> {
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: "js", sourcefile: "consumer.js" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    treeShaking: true,
    minify: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
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

  it("leaves every other type out of the circle's own entry and component", async () => {
    for (const entry of [`export { CircleGraph } from "./src/entries/circle";`, `export { CircleGraph } from "./src/react/graphs/CircleGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A circle");
      expect(code).not.toContain(OTHER);
      expect(code).not.toContain(OTHER_DEFINITION);
    }
  });

  it("leaves the image drawings out of a consumer's bundle of the built ./circle entry (DGP TICKET-004 code review CR-004)", async () => {
    // The built package splits shared code into chunks, and the circle's shared chunk holds the
    // drawings too; a consumer's bundler then drops what the circle never reads. This bundles the
    // built entry as a consumer would (the global setup builds it), as \`pnpm size\` measures it.
    const code = await consumerBundle(`export { CircleGraph } from "./dist/circle.js";`);
    expect(code).toContain("A circle");
    expect(code).not.toContain("A red apple");
    expect(code).not.toContain("A pictograph");
  });

  it("leaves the pictograph and its image drawings out of the circle's bundle (DGP TICKET-004 code review CR-004)", async () => {
    // The pictograph definition is built by a side-effect-free factory, so reaching the
    // definitions module does not keep it or the drawings it names.
    const code = await bundle(`export { CircleGraph } from "./src/entries/circle";`);
    expect(code).not.toContain("A pictograph");
    // The apple's description and path data: text only the drawing carries.
    expect(code).not.toContain("A red apple");
    expect(code).not.toContain("M 50 30 C 30 18");
  });

  it("leaves the circle out of the pictograph's entry and component, and keeps every image", async () => {
    for (const entry of [`export { Pictograph } from "./src/entries/pictograph";`, `export { Pictograph } from "./src/react/graphs/PictographGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A pictograph");
      expect(code).not.toContain("A circle");
      expect(code).not.toContain(OTHER);
      for (const image of Object.values(images)) expect(code, image.name).toContain(image.description);
    }
  });

  it("leaves every other type, and the image drawings, out of the line graph's entry and component (DGP TICKET-002)", async () => {
    for (const entry of [`export { LineGraph } from "./src/entries/line-graph";`, `export { LineGraph } from "./src/react/graphs/LineGraphGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A line graph");
      expect(code).not.toContain("A circle");
      expect(code).not.toContain("A pictograph");
      expect(code).not.toContain("A red apple");
      expect(code).not.toContain(OTHER);
      expect(code).not.toContain(OTHER_DEFINITION);
    }
  });

  it("leaves the line graph out of the circle's and the pictograph's bundles, and out of a consumer's bundle of either built entry", async () => {
    for (const entry of [`export { CircleGraph } from "./src/entries/circle";`, `export { Pictograph } from "./src/entries/pictograph";`]) {
      expect(await bundle(entry)).not.toContain("A line graph");
    }
    for (const built of ["circle", "pictograph"]) {
      expect(await consumerBundle(`export * from "./dist/${built}.js";`), built).not.toContain("A line graph");
    }
  });

  it("leaves every other type out of the bar graph's entry and component, and the bar graph out of theirs (DGP TICKET-003)", async () => {
    for (const entry of [`export { BarGraph } from "./src/entries/bar-graph";`, `export { BarGraph } from "./src/react/graphs/BarGraphGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A bar graph");
      for (const other of ["A circle", "A pictograph", "A line graph", "A red apple", OTHER, OTHER_DEFINITION]) expect(code, other).not.toContain(other);
    }
    for (const entry of [
      `export { CircleGraph } from "./src/entries/circle";`,
      `export { Pictograph } from "./src/entries/pictograph";`,
      `export { LineGraph } from "./src/entries/line-graph";`,
    ]) {
      expect(await bundle(entry), entry).not.toContain("A bar graph");
    }
  });

  it("leaves every other type out of the ruler's entry and component, and the ruler out of theirs (rulers NLC TICKET-003)", async () => {
    for (const entry of [`export { RulerGraph } from "./src/entries/ruler";`, `export { RulerGraph } from "./src/react/graphs/RulerGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A ruler");
      for (const other of ["A circle", "A pictograph", "A line graph", "A bar graph", "A red apple", OTHER, OTHER_DEFINITION]) expect(code, other).not.toContain(other);
    }
    for (const entry of [
      `export { CircleGraph } from "./src/entries/circle";`,
      `export { Pictograph } from "./src/entries/pictograph";`,
      `export { LineGraph } from "./src/entries/line-graph";`,
      `export { BarGraph } from "./src/entries/bar-graph";`,
    ]) {
      expect(await bundle(entry), entry).not.toContain("A ruler");
    }
  });

  it("leaves every other type out of the number line's entry and component, and the number line out of theirs (graph-library NLC TICKET-002)", async () => {
    for (const entry of [`export { NumberLineGraph } from "./src/entries/number-line";`, `export { NumberLineGraph } from "./src/react/graphs/NumberLineGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A number line");
      for (const other of ["A circle", "A pictograph", "A line graph", "A bar graph", "A ruler", "A red apple", OTHER, OTHER_DEFINITION]) expect(code, other).not.toContain(other);
    }
    for (const entry of [
      `export { CircleGraph } from "./src/entries/circle";`,
      `export { Pictograph } from "./src/entries/pictograph";`,
      `export { LineGraph } from "./src/entries/line-graph";`,
      `export { BarGraph } from "./src/entries/bar-graph";`,
      `export { RulerGraph } from "./src/entries/ruler";`,
    ]) {
      expect(await bundle(entry), entry).not.toContain("A number line");
    }
  });

  it("leaves the number line and the axis kit out of a consumer's bundle of every other built entry", async () => {
    // Text that survives minifying: the definition's description, the layout's and the axis kit's errors.
    for (const built of ["circle", "pictograph", "line-graph", "bar-graph", "ruler"]) {
      const code = await consumerBundle(`export * from "./dist/${built}.js";`);
      for (const text of ["A number line", "numberLineLayout()", "drawAxis()"]) expect(code, `${built}: ${text}`).not.toContain(text);
    }
  });

  it("leaves the ruler, its mark rule's tables and its kit out of a consumer's bundle of every other built entry (rulers NLC TICKET-002 quality review QR-002)", async () => {
    // The built package shares chunks between entries, so the mark rule's frozen tables reach the
    // others' chunks; marked pure, a consumer's bundler drops them. Text that survives minifying,
    // including the kit's mark lengths (code review CR-002).
    for (const built of ["circle", "pictograph", "line-graph", "bar-graph"]) {
      const code = await consumerBundle(`export * from "./dist/${built}.js";`);
      for (const ruler of ["A ruler", "sixteenth", "drawRulerMarks()", "rulerLayout()", "9.5,6.5"]) expect(code, `${built}: ${ruler}`).not.toContain(ruler);
    }
  });

  it("leaves every other type out of the x,y graph's entry and component, and the x,y graph out of theirs (graph-library NLC TICKET-003)", async () => {
    for (const entry of [`export { XyGraph } from "./src/entries/xy-graph";`, `export { XyGraph } from "./src/react/graphs/XyGraph";`]) {
      const code = await bundle(entry);
      expect(code).toContain("A coordinate graph");
      for (const other of ["A circle", "A pictograph", "A line graph", "A bar graph", "A ruler", "A number line", "A red apple", OTHER, OTHER_DEFINITION]) expect(code, other).not.toContain(other);
    }
    for (const entry of [
      `export { CircleGraph } from "./src/entries/circle";`,
      `export { Pictograph } from "./src/entries/pictograph";`,
      `export { LineGraph } from "./src/entries/line-graph";`,
      `export { BarGraph } from "./src/entries/bar-graph";`,
      `export { RulerGraph } from "./src/entries/ruler";`,
      `export { NumberLineGraph } from "./src/entries/number-line";`,
    ]) {
      expect(await bundle(entry), entry).not.toContain("A coordinate graph");
    }
  });

  it("leaves the x,y graph out of a consumer's bundle of every other built entry, and the other types out of the built ./xy-graph", async () => {
    // Text that survives minifying: the definition's description and the text alternative's wording.
    for (const built of ["circle", "pictograph", "line-graph", "bar-graph", "ruler", "number-line"]) {
      const code = await consumerBundle(`export * from "./dist/${built}.js";`);
      for (const text of ["A coordinate graph", "To fit, one y unit"]) expect(code, `${built}: ${text}`).not.toContain(text);
    }
    // "A circle" is left unasserted: the circle's definition is a plain object a bundler cannot drop,
    // so it reaches every built per-type entry (a known problem, recorded in the delivery record).
    const code = await consumerBundle(`export * from "./dist/xy-graph.js";`);
    expect(code).toContain("A coordinate graph");
    for (const other of ["A pictograph", "A line graph", "A bar graph", "A ruler", "A number line", "A red apple"]) expect(code, other).not.toContain(other);
  });

  it("keeps every type's layout and definition in the entry component's bundle", async () => {
    const code = await bundle(`export { Graph } from "./src/react/Graph";`);
    expect(code).toContain(OTHER);
    expect(code).toContain(OTHER_DEFINITION);
  });
});
