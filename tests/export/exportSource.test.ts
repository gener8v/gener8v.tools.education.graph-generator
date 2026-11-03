import { readFileSync } from "node:fs";
import fc from "fast-check";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findUnsafeTextChar } from "../../src/core/format";
import { exportSource } from "../../src/export/index";
import { printScene } from "../../src/export/print";
import { createGraph } from "../../src/graph";
import { fmt } from "../../src/layout/kit/format";
import { REACT_PROP, SCENE_WIDTH, type Scene, type SvgAttr } from "../../src/layout/scene";
import { Graph } from "../../src/react/Graph";
import { SceneSvg } from "../../src/react/SceneSvg";
import { expectNoBrowserGlobalsTouched } from "../helpers/browser-globals";
import { exportedComponent, loadExport } from "../helpers/exported";
import { loadExample } from "../fixtures/examples";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT, UNSAFE_CHARS } from "../fixtures/plain-text";

const circle = loadExample("circle") as Record<string, unknown>;
const version = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;

const sourceOf = (description: unknown, options?: unknown): string => {
  const result = exportSource(description, options as Parameters<typeof exportSource>[1]);
  if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join("; "));
  return result.source;
};

/** The header comment, its ` * ` prefixes removed. */
const headerOf = (source: string): string =>
  source
    .slice(0, source.indexOf("*/"))
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^ \*( |$)/, ""))
    .join("\n");

describe("exportSource results (CPSE-REQ-019, CPSE-REQ-025)", () => {
  it("returns { ok: true, source } for a valid description", () => {
    const result = exportSource(circle);
    expect(result.ok).toBe(true);
    expect(Object.keys(result).sort()).toEqual(["ok", "source"]);
  });

  it("returns { ok: false, issues } for an invalid description: the issues createGraph reports, and no source", () => {
    for (const description of [null, [], "circle", { type: "circle" }, { type: "circle", radius: -1 }, { type: "nope" }]) {
      const graph = createGraph(description);
      expect(graph.ok, JSON.stringify(description)).toBe(false);
      expect(exportSource(description)).toEqual({ ok: false, issues: graph.ok ? [] : graph.issues });
    }
  });

  it("never throws, whatever it is given", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (description, options) => {
        const result = exportSource(description, options as never);
        expect(result.ok ? typeof result.source : result.issues.length > 0).toBeTruthy();
      }),
      { numRuns: 300 },
    );
  });

  it("returns internal_error, not an exception, for options that throw when read", () => {
    const options = Object.defineProperty({}, "componentName", {
      enumerable: true,
      get() {
        throw new Error("secret");
      },
    });
    const result = exportSource(circle, options);
    expect(result).toEqual({ ok: false, issues: [expect.objectContaining({ code: "internal_error", path: "" })] });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});

describe("component names (CPSE-REQ-024)", () => {
  it("default to the package component's name for the type: circle → CircleGraph, line-graph → LineGraph", () => {
    const cases: Array<[string, string]> = [
      ["circle", "CircleGraph"],
      ["number-line", "NumberLineGraph"],
      ["line-graph", "LineGraph"],
      ["bar-graph", "BarGraph"],
      ["pictograph", "PictographGraph"],
      ["xyz-graph", "XyzGraph"],
    ];
    for (const [example, name] of cases) {
      const source = sourceOf(loadExample(example));
      expect(source, example).toContain(`\nexport function ${name}() {\n`);
      expect(Object.keys(loadExport(source).exports), example).toEqual([name]);
    }
    expect(sourceOf(circle, { componentName: undefined })).toBe(sourceOf(circle));
  });

  it("use a chosen PascalCase name", () => {
    for (const name of ["Q3Circle", "C", "UnitCircle2"]) {
      const source = sourceOf(circle, { componentName: name });
      expect(source).toContain(`\nexport function ${name}() {\n`);
      expect(source).toContain(`${name}: a circle exported by`);
    }
  });

  it("report a name that is not a PascalCase identifier at /componentName, with no source", () => {
    for (const componentName of ["", "circleGraph", "Circle Graph", "Circle-Graph", "Circle_Graph", "1Circle", "Ćircle", "Circle()", "X</svg>", 3, null, {}, ["Circle"]]) {
      const result = exportSource(circle, { componentName } as never);
      expect(result, JSON.stringify(componentName)).toEqual({
        ok: false,
        issues: [expect.objectContaining({ code: "wrong_kind", path: "/componentName", expected: expect.stringContaining("PascalCase") })],
      });
    }
  });

  it("report an invalid name after the description's issues", () => {
    const description = { type: "circle" };
    const graph = createGraph(description);
    const result = exportSource(description, { componentName: "bad" });
    expect(graph.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      issues: [...(graph.ok ? [] : graph.issues), expect.objectContaining({ code: "wrong_kind", path: "/componentName" })],
    });
  });

  it("cannot be set by a polluted Object.prototype (ready-tickets reconciliation)", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    Object.defineProperty(prototype, "componentName", { value: "Injected", configurable: true, writable: true });
    try {
      expect(sourceOf(circle)).toContain("export function CircleGraph()");
      expect(sourceOf(circle, {})).not.toContain("Injected");
    } finally {
      delete prototype["componentName"];
    }
  });
});

describe("the exported file (CPSE-REQ-021, CPSE-REQ-022, CPSE-REQ-023, AD-013)", () => {
  const source = sourceOf(circle);

  it("is the same text every time for the same description and package version", () => {
    expect(sourceOf(circle)).toBe(source);
    expect(sourceOf(JSON.parse(JSON.stringify(circle)))).toBe(source);
  });

  it("opens with a header comment naming the package version and holding the description as JSON", () => {
    expect(source.startsWith("/*\n")).toBe(true);
    const header = headerOf(source);
    expect(header).toContain(`exported by @gener8v/graph-generator ${version} with exportSource`);
    const json = header.slice(header.indexOf("Description:\n") + "Description:\n".length);
    expect(JSON.parse(json)).toEqual(circle);
  });

  it("is one exported function component with no props, imports and hooks", () => {
    const code = source.slice(source.indexOf("*/") + 2);
    expect(code).toMatch(/^\nexport function CircleGraph\(\) \{\n {2}return \(\n {4}<svg [^\n]*>\n[\s\S]*\n {4}<\/svg>\n {2}\);\n\}\n$/);
    expect(code).not.toMatch(/\bimport\b|\brequire\b|\buse[A-Z]\w*\s*\(|\bprops\b/);
    expect(code.match(/\bexport\b/g)).toHaveLength(1);
    const { required } = loadExport(source);
    expect([...new Set(required)]).toEqual(["react/jsx-runtime"]);
  });

  it("references nothing outside itself: no URL, href or package", () => {
    expect(source).not.toMatch(/href=|url\(|https?:|from "|@gener8v\/graph-generator["/]/);
  });

  it("prints each Scene attribute under the React prop SceneSvg gives it, from the one shared table", () => {
    for (const [attr, prop] of Object.entries(REACT_PROP)) {
      const scene: Scene = { width: SCENE_WIDTH, height: fmt(10), textAlternative: "A sample.", nodes: [{ kind: "rect", attrs: [[attr as SvgAttr, "1"]] }] };
      expect(printScene(scene, "Sample", "Header"), attr).toContain(`<rect ${prop}={"1"} />`);
    }
  });

});

describe("caller text stays data in the exported file (GSV-REQ-043; GSV TICKET-001 security review SEC-001)", () => {
  const strings = [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT, ...Object.values(UNSAFE_CHARS), "*/", "a */ b /* c", "\\u2028", "${x}`"];
  const pwned = () => (globalThis as Record<string, unknown>)["pwned"];

  /** A Scene carrying the text in its accessible name, a text node and attribute values, at top level and nested. */
  const sceneWith = (text: string): Scene => ({
    width: SCENE_WIDTH,
    height: fmt(100),
    textAlternative: text,
    nodes: [
      { kind: "text", attrs: [["x", fmt(10)], ["y", fmt(20)], ["font-family", text]], text },
      { kind: "group", attrs: [["fill", text]], children: [{ kind: "text", attrs: [["stroke", text]], text }] },
    ],
  });

  /**
   * Every line of the file is free of control, line-breaking and invisible characters, and the
   * header comment's first `*\/` is its own close, just before the component.
   */
  const expectInert = (source: string, label: string) => {
    for (const line of source.split("\n")) expect(findUnsafeTextChar(line), `${label}: ${JSON.stringify(line)}`).toBe(-1);
    expect(source.indexOf("*/"), label).toBe(source.indexOf("\n */\nexport function ") + 2);
  };

  it("prints every plain-text fixture string as a string literal that compiles, runs nothing and renders literally", () => {
    for (const text of strings) {
      const label = JSON.stringify(text);
      const scene = sceneWith(text);
      const source = printScene(scene, "Sample", `Title: ${text}\nDescription: ${JSON.stringify({ title: text })}`);
      expectInert(source, label);
      const markup = expectNoBrowserGlobalsTouched(() => renderToStaticMarkup(createElement(exportedComponent(source, "Sample"))));
      expect(markup, label).toBe(renderToStaticMarkup(createElement(SceneSvg, { scene })));
      expect(pwned(), label).toBeUndefined();
    }
  });

  it("exports a title holding any fixture string the validator accepts exactly as the package component draws it", () => {
    let exported = 0;
    for (const text of strings) {
      const description = { ...circle, title: text };
      const result = exportSource(description);
      if (!result.ok) continue;
      exported++;
      const label = JSON.stringify(text);
      expectInert(result.source, label);
      expect(JSON.parse(headerOf(result.source).split("Description:\n")[1]!.split("\n\n")[0]!), label).toEqual(description);
      const markup = expectNoBrowserGlobalsTouched(() => renderToStaticMarkup(createElement(exportedComponent(result.source, "CircleGraph"))));
      expect(markup, label).toBe(renderToStaticMarkup(createElement(Graph, { description })));
      expect(pwned(), label).toBeUndefined();
    }
    // Every benign and hostile string without an unsafe character is valid caller text.
    expect(exported).toBeGreaterThanOrEqual(BENIGN_TEXT.length + 6);
  });
});

describe("pictograph exports embed their images with the license notice (AD-012, prd/CC-001, prd/TC-009)", () => {
  const pictograph = loadExample("pictograph") as { unitImage: string };
  const source = sourceOf(pictograph);
  const header = headerOf(source);

  it("say the images are embedded, not referenced, and name each with its author and license", () => {
    expect(header).toContain("Images: embedded in this file as drawings, not referenced");
    expect(header).toContain(`- ${pictograph.unitImage}, by gener8v, under the MIT license`);
  });

  it("carry the full MIT notice, identical to the package LICENSE, not just the license's name (DGP TICKET-004 security review SEC-004)", () => {
    const license = readFileSync(new URL("../../LICENSE", import.meta.url), "utf8").trim();
    expect(header).toContain(`\n\n${license}`);
  });

  it("inline the drawing: the exported markup holds the image's nodes and no reference", () => {
    const markup = renderToStaticMarkup(createElement(exportedComponent(source, "PictographGraph")));
    expect(markup).toBe(renderToStaticMarkup(createElement(Graph, { description: pictograph })));
    expect(source).not.toMatch(/href=|url\(|https?:/);
  });

  it("are the only exports with an image section", () => {
    expect(headerOf(sourceOf(circle))).not.toMatch(/Images:|License/);
  });
});
