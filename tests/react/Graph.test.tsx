import fc from "fast-check";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createGraphWith } from "../../src/graph";
import type { Issue } from "../../src/core/result";
import { Graph } from "../../src/react/Graph";
import { PLACEHOLDER_ISSUE_LIMIT } from "../../src/react/Placeholder";
import { SceneSvg } from "../../src/react/SceneSvg";
import { type GraphProps, type Registries, createGraphComponentWith, renderGraph } from "../../src/react/createGraphComponent";
import * as entry from "../../src/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions";
import { fixtureLayouts, throwingLayouts } from "../fixtures/layouts";
import { HOSTILE_TEXT } from "../fixtures/plain-text";

const fixtures: Registries = { definitions: fixtureRegistry, layouts: fixtureLayouts };
// `Graph` with the test-only definitions and layouts: the same render routine `Graph` calls.
const TestGraph = (props: GraphProps) => <>{renderGraph(props, fixtures)}</>;
const CircleGraph = createGraphComponentWith("circle", fixtures);

const circle = fixtureExamples[0];
const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>);
const LEAKED_FRAME = /file:|\/node_modules\/| {4}at /;

describe("public entry point (CPSE-REQ-008, CPSE-REQ-009)", () => {
  it("exports Graph and createGraph", () => {
    expect(entry.Graph).toBe(Graph);
    expect(typeof entry.createGraph).toBe("function");
  });

  it("Graph renders with the package registries, which hold no graph types yet", () => {
    expect(html(<Graph description={circle} />)).toContain("This graph could not be drawn.");
  });
});

describe("dispatch and equal output (CPSE-REQ-007, CPSE-REQ-008, CPSE-REQ-010)", () => {
  it("draws a valid description with its type's layout", () => {
    const result = createGraphWith(circle, fixtureRegistry, fixtureLayouts);
    if (!result.ok) throw new Error("fixture circle is invalid");
    expect(html(<TestGraph description={circle} />)).toBe(html(<SceneSvg scene={result.scene} />));
    expect(html(<TestGraph description={circle} />)).toMatch(/^<svg role="img" aria-label="A circle with radius 5\."/);
  });

  it("gives the entry component and the per-type component identical markup for every registered type's example", () => {
    const registered = fixtureExamples.filter((example) => Object.hasOwn(fixtureLayouts, example.type));
    expect(registered.length).toBeGreaterThan(0);
    for (const example of registered) {
      const PerType = createGraphComponentWith(example.type, fixtures);
      for (const textAlternative of [undefined, "A circle.", "   ", ...HOSTILE_TEXT]) {
        expect(html(<TestGraph description={example} textAlternative={textAlternative} />)).toBe(
          html(<PerType description={example} textAlternative={textAlternative} />),
        );
      }
    }
  });

  it("passes textAlternative to SceneSvg unchanged (CPSE TICKET-002 DEL-005)", () => {
    expect(html(<TestGraph description={circle} textAlternative="Radius five" />)).toContain('aria-label="Radius five"');
    expect(html(<TestGraph description={circle} textAlternative={"\u200b "} />)).toContain('aria-label="A circle with radius 5."');
  });
});

describe("invalid descriptions (CPSE-REQ-014, CPSE-REQ-015, CPSE-REQ-016, CPSE-REQ-017)", () => {
  const invalid = { type: "circle", radius: -1 };

  it("renders the placeholder by default, including for no description at all", () => {
    for (const props of [{ description: invalid }, { description: undefined }, {} as GraphProps]) {
      const markup = html(<TestGraph {...props} />);
      expect(markup).not.toContain("<svg");
      expect(markup).toContain("This graph could not be drawn.");
      expect(markup).toMatch(/<li>[^<]+<\/li>/);
    }
    expect(html(<TestGraph description={invalid} />)).toContain("/radius: radius must be");
  });

  it("draws the placeholder in black on white with a border, readable in greyscale", () => {
    const markup = html(<TestGraph description={invalid} />);
    expect(markup).toMatch(/border:2px solid #000000/);
    expect(markup).toMatch(/background:#ffffff/);
    expect(markup).toMatch(/color:#000000/);
    // No other colors anywhere in it.
    expect(markup.match(/#[0-9a-f]{6}/gi)?.every((c) => c === "#000000" || c === "#ffffff")).toBe(true);
  });

  it('renders nothing with fallback="none", and the placeholder for "placeholder" or an unknown value', () => {
    expect(html(<TestGraph description={invalid} fallback="none" />)).toBe("");
    expect(html(<TestGraph description={invalid} fallback="placeholder" />)).toBe(html(<TestGraph description={invalid} />));
    const unknown = "other" as GraphProps["fallback"];
    expect(html(<TestGraph description={invalid} fallback={unknown} />)).toBe(html(<TestGraph description={invalid} />));
  });

  it("renders the fallback function's result, giving it the full issue list", () => {
    const received: Issue[][] = [];
    const fallback = (issues: Issue[]) => {
      received.push(issues);
      return <p>{`${issues.length} problems`}</p>;
    };
    const description = { type: "circle", radius: -1, colour: "red", unit: 3 };
    expect(html(<TestGraph description={description} fallback={fallback} />)).toBe("<p>3 problems</p>");
    const result = createGraphWith(description, fixtureRegistry, fixtureLayouts);
    expect(received).toEqual([result.ok ? [] : result.issues]);
  });

  it("does not call the fallback for a valid description", () => {
    let calls = 0;
    html(<TestGraph description={circle} fallback={() => (calls++, null)} />);
    expect(calls).toBe(0);
  });

  it("reports a description of another type to a per-type component as a graph-type mismatch", () => {
    const received: Issue[][] = [];
    const record = (issues: Issue[]) => (received.push(issues), null);
    html(<CircleGraph description={fixtureExamples[1]} fallback={record} />);
    html(<CircleGraph description={{ radius: 3 }} fallback={record} />);
    expect(received).toEqual([
      [expect.objectContaining({ code: "unknown_graph_type", path: "/type", allowed: ["circle"], message: 'type must be one of: circle; got "number-line".' })],
      [expect.objectContaining({ code: "unknown_graph_type", path: "/type", allowed: ["circle"], message: "type is required; use one of: circle." })],
    ]);
    expect(html(<CircleGraph description={fixtureExamples[2]} />)).toContain('/type: type must be one of: circle; got &quot;xy-graph&quot;.');
    // Not an object: the validator's own issue.
    html(<CircleGraph description={[circle]} fallback={record} />);
    expect(received[2]).toEqual([expect.objectContaining({ code: "not_an_object" })]);
  });

  it("lists at most 20 issues, then how many more, so 5,000 unknown keys stay small (GSV TICKET-002 SEC-002)", () => {
    const description: Record<string, unknown> = { type: "circle", radius: 1 };
    for (let i = 0; i < 5000; i++) description[`k${i}\u202e${"x".repeat(500)}`] = i;
    const result = createGraphWith(description, fixtureRegistry, fixtureLayouts);
    expect(result.ok ? 0 : result.issues.length).toBe(5000);
    const markup = html(<TestGraph description={description} />);
    expect(markup.match(/<li>/g)).toHaveLength(PLACEHOLDER_ISSUE_LIMIT);
    expect(markup).toContain(`…and ${5000 - PLACEHOLDER_ISSUE_LIMIT} more.`);
    expect(markup.length).toBeLessThan(20_000);
    expect(markup).not.toContain("\u202e");
  });

  it("prints issue paths escaped and as text, never as markup (GSV TICKET-002 SEC-001)", () => {
    const description = { type: "circle", radius: 1, "<img src=x onerror=alert(1)>\u0007\u202e": 1 };
    const markup = html(<TestGraph description={description} />);
    expect(markup).not.toContain("<img");
    expect(markup).toContain("/&lt;img src=x onerror=alert(1)&gt;\\u0007\\u202e: ");
  });
});

describe("invalid to valid (CPSE-REQ-014, specification Behaviors)", () => {
  it("draws the graph and drops the placeholder when the description becomes valid", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const globals = globalThis as Record<string, unknown>;
    globals.window = dom.window;
    globals.document = dom.window.document;
    globals.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      const { createRoot } = await import("react-dom/client");
      const container = dom.window.document.createElement("div");
      dom.window.document.body.append(container);
      const root = createRoot(container);
      for (const [Component, name] of [[TestGraph, "Graph"], [CircleGraph, "CircleGraph"]] as const) {
        await act(async () => root.render(<Component description={{ type: "circle", radius: -1 }} />));
        expect([name, container.querySelector("svg"), container.textContent]).toEqual([name, null, expect.stringContaining("could not be drawn")]);
        await act(async () => root.render(<Component description={circle} />));
        expect([name, container.querySelector("svg[role=img]") !== null, container.textContent]).toEqual([name, true, "A circle with radius 5.r = 5"]);
        await act(async () => root.render(<Component description={undefined} />));
        expect(container.querySelector("svg")).toBeNull();
      }
      await act(async () => root.unmount());
    } finally {
      delete globals.window;
      delete globals.document;
      delete globals.IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    }
  });
});

describe("components never throw because of the description (CPSE-REQ-018)", () => {
  it("sends a layout that throws to the fallback as internal_error, with no stack in the output (CPSE TICKET-002 CR-006, SEC-003)", () => {
    const Throwing = (props: GraphProps) => <>{renderGraph(props, { definitions: fixtureRegistry, layouts: throwingLayouts })}</>;
    const ThrowingCircle = createGraphComponentWith("circle", { definitions: fixtureRegistry, layouts: throwingLayouts });
    for (const Component of [Throwing, ThrowingCircle]) {
      const received: Issue[][] = [];
      expect(html(<Component description={circle} fallback={(issues) => (received.push(issues), null)} />)).toBe("");
      expect(received).toEqual([[expect.objectContaining({ code: "internal_error", path: "" })]]);
      const markup = html(<Component description={circle} />);
      expect(markup).toContain("defect in the package");
      expect(markup).not.toMatch(LEAKED_FRAME);
      expect(markup).not.toMatch(/RangeError|Infinity/);
    }
  });

  it("renders <Graph> and a per-type component for any JSON value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.option(fc.string()), (description, textAlternative) => {
        for (const Component of [Graph, TestGraph, CircleGraph]) {
          html(<Component description={description} textAlternative={textAlternative ?? undefined} />);
        }
        // Graph is exactly the shared render routine with the package's registries.
        expect(html(<Graph description={description} />)).toBe(html(renderGraph({ description })));
      }),
      { numRuns: 300 },
    );
  });

  it("renders <Graph> for circle-shaped values of any content", () => {
    const circleLike = fc.record(
      { type: fc.constant("circle"), radius: fc.oneof(fc.double(), fc.jsonValue()), diameter: fc.jsonValue(), showCenter: fc.jsonValue() },
      { requiredKeys: ["type"] },
    );
    fc.assert(
      fc.property(circleLike, (description) => {
        const markup = html(<TestGraph description={description} />);
        expect(markup.startsWith("<svg") || markup.includes("could not be drawn")).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
