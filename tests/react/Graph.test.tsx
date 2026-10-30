import fc from "fast-check";
import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createGraph, createGraphWith } from "../../src/graph";
import type { Issue } from "../../src/core/result";
import { Graph } from "../../src/react/Graph";
import { PLACEHOLDER_ISSUE_LIMIT } from "../../src/react/Placeholder";
import { SceneSvg } from "../../src/react/SceneSvg";
import { CircleGraph as PackageCircleGraph } from "../../src/react/graphs/CircleGraph";
import { Pictograph as PackagePictograph } from "../../src/react/graphs/PictographGraph";
import { LineGraph as PackageLineGraph } from "../../src/react/graphs/LineGraphGraph";
import { BarGraph as PackageBarGraph } from "../../src/react/graphs/BarGraphGraph";
import { RulerGraph as PackageRulerGraph } from "../../src/react/graphs/RulerGraph";
import { NumberLineGraph as PackageNumberLineGraph } from "../../src/react/graphs/NumberLineGraph";
import { XyGraph as PackageXyGraph } from "../../src/react/graphs/XyGraph";
import { SquareGraph as PackageSquareGraph } from "../../src/react/graphs/SquareGraph";
import { TriangleGraph as PackageTriangleGraph } from "../../src/react/graphs/TriangleGraph";
import { CubeGraph as PackageCubeGraph } from "../../src/react/graphs/CubeGraph";
import { CylinderGraph as PackageCylinderGraph } from "../../src/react/graphs/CylinderGraph";
import { XyzGraph as PackageXyzGraph } from "../../src/react/graphs/XyzGraph";
import {
  type GraphComponent,
  type GraphProps,
  type GraphTypeParts,
  type Registries,
  componentName,
  createGraphComponent,
  renderGraph,
} from "../../src/react/createGraphComponent";
import { definitions } from "../../src/core/definitions/index";
import { layouts } from "../../src/layout/registry";
import * as entry from "../../src/index";
import { existsSync, readFileSync } from "node:fs";
import { registeredTypes } from "../../src/core/definitions/index";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions";
import { type Circle, circle as circleFixture } from "../fixtures/definitions/circle";
import type { DescriptionBase, GraphType } from "../../src/core/definitions/types";
import type { Layout } from "../../src/layout/registry";
import { circleLayout, fixtureLayouts, malformedLayouts, throwingLayouts } from "../fixtures/layouts";
import { HOSTILE_TEXT, oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";

const fixtures: Registries = { definitions: fixtureRegistry, layouts: fixtureLayouts };
// `Graph` with the test-only definitions and layouts: the same render routine `Graph` calls.
const TestGraph = (props: GraphProps) => <>{renderGraph(props, fixtures)}</>;
const circleDefinition = circleFixture;
const CircleGraph = createGraphComponent("circle", { definition: circleFixture, layout: circleLayout });

const circle = fixtureExamples[0];
const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>);
const LEAKED_FRAME = /file:|\/node_modules\/| {4}at /;

describe("public entry point (CPSE-REQ-008, CPSE-REQ-009)", () => {
  it("exports Graph and createGraph", () => {
    expect(entry.Graph).toBe(Graph);
    expect(typeof entry.createGraph).toBe("function");
  });

  it("Graph renders with the package registries", () => {
    // A type no definition will ever have, so this holds whichever types the package ships.
    expect(html(<Graph description={{ type: "hexagon" }} />)).toContain("This graph could not be drawn.");
  });
});

describe("the package's graph types fit together (code review CR-003; CPSE-REQ-008, CPSE-REQ-010)", () => {
  // Every registered type, from the circle on (GSS TICKET-002); each type ticket joins every check below.
  const registered = registeredTypes(definitions);
  const shipped = Object.values(entry).filter(
    (value): value is GraphComponent => typeof value === "function" && "graphType" in value,
  );

  it("gives every defined type a layout, and every layout a definition", () => {
    expect(Object.keys(layouts).sort()).toEqual([...registered].sort());
  });

  it("exports one per-type component for every defined type", () => {
    expect(shipped.map((component) => component.graphType).sort()).toEqual([...registered].sort());
  });

  it("draws each type's documented example identically through Graph and its per-type component", () => {
    for (const component of shipped) {
      const file = new URL(`../../examples/${component.graphType}.json`, import.meta.url);
      expect([component.graphType, existsSync(file)]).toEqual([component.graphType, true]);
      const example: unknown = JSON.parse(readFileSync(file, "utf8"));
      const PerType = component;
      const markup = html(<PerType description={example} />);
      expect(markup.startsWith("<svg")).toBe(true);
      expect(html(<Graph description={example} />)).toBe(markup);
    }
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
      const PerType = createGraphComponent(example.type, { definition: fixtureRegistry[example.type]!, layout: fixtureLayouts[example.type]! });
      for (const textAlternative of [undefined, "A circle.", "   ", ...HOSTILE_TEXT]) {
        expect(html(<TestGraph description={example} textAlternative={textAlternative} />)).toBe(
          html(<PerType description={example} textAlternative={textAlternative} />),
        );
      }
    }
  });

  it("names each per-type component for DevTools and stacks (QR-007)", () => {
    expect(CircleGraph.displayName).toBe("CircleGraph");
    expect(["circle", "number-line", "bar-graph", "xy-graph", "pictograph", "line-graph"].map((type) => componentName(type as GraphType))).toEqual([
      "CircleGraph",
      "NumberLineGraph",
      "BarGraph",
      "XyGraph",
      "PictographGraph",
      "LineGraph",
    ]);
    expect(PackageLineGraph.displayName).toBe("LineGraph");
    expect(PackageBarGraph.displayName).toBe("BarGraph");
    expect(PackageRulerGraph.displayName).toBe("RulerGraph");
    expect(PackageNumberLineGraph.displayName).toBe("NumberLineGraph");
    expect(PackageXyGraph.displayName).toBe("XyGraph");
    expect(PackageXyzGraph.displayName).toBe("XyzGraph");
    expect(PackageSquareGraph.displayName).toBe("SquareGraph");
    expect(PackageTriangleGraph.displayName).toBe("TriangleGraph");
    expect(PackageCubeGraph.displayName).toBe("CubeGraph");
    expect(PackageCylinderGraph.displayName).toBe("CylinderGraph");
  });

  it("types a layout by its graph type's description (QR-002; pnpm typecheck fails if these stop being errors)", () => {
    // @ts-expect-error a misspelt field of the circle's description
    const misspelt: Layout<Circle> = (normalized) => ({ ...circleLayout(normalized, {}), height: normalized.raduis });
    const other: Layout<DescriptionBase & { type: "square"; side: number }> = () => circleLayout(fixtureExamples[0] as unknown as Circle, {});
    // @ts-expect-error a square's layout paired with the circle's definition
    const mismatched: GraphTypeParts<Circle> = { definition: circleFixture, layout: other };
    expect([misspelt, mismatched]).toHaveLength(2);
  });

  it("tags each per-type component with its type, and refuses another type's definition", () => {
    expect(CircleGraph.graphType).toBe("circle");
    expect(() => createGraphComponent("square", { definition: circleDefinition, layout: circleLayout })).toThrow(/for "circle", not "square"/);
  });

  it("passes textAlternative to SceneSvg unchanged (CPSE TICKET-002 DEL-005)", () => {
    expect(html(<TestGraph description={circle} textAlternative="Radius five" />)).toContain('aria-label="Radius five"');
    expect(html(<TestGraph description={circle} textAlternative={"\u200b "} />)).toContain('aria-label="A circle with radius 5."');
  });
});

describe("the ruler's accessible name (NLC-REQ-013, NLC-REQ-056; rulers NLC TICKET-003)", () => {
  const example: unknown = JSON.parse(readFileSync(new URL("../../examples/ruler.json", import.meta.url), "utf8"));
  const generated =
    "A ruler titled “How long is the pencil?”, 6 inches long, numbered every inch and marked to eighths of an inch. An object labeled “pencil” lies along it from the 1.5 in mark to the 4.25 in mark.";

  it("names the ruler with its generated text alternative, as aria-label and <title>, through <RulerGraph> and <Graph>", () => {
    const markup = html(<PackageRulerGraph description={example} />);
    expect(markup).toBe(html(<Graph description={example} />));
    expect(markup).toContain(`aria-label="${generated}"`);
    expect(markup).toContain(`<title>${generated}</title>`);
  });

  it("replaces it with the caller's text alternative, and keeps it for a blank one", () => {
    for (const Component of [Graph, PackageRulerGraph]) {
      const supplied = html(<Component description={example} textAlternative="A ruler with a pencil on it." />);
      expect(supplied).toContain('aria-label="A ruler with a pencil on it."');
      expect(supplied).toContain("<title>A ruler with a pencil on it.</title>");
      expect(supplied).not.toContain(generated);
      expect(html(<Component description={example} textAlternative={"\u200b "} />)).toContain(`aria-label="${generated}"`);
    }
  });
});

describe("props and Scene nodes are read as own keys (rulers NLC TICKET-003 security review SEC-002)", () => {
  const example: unknown = JSON.parse(readFileSync(new URL("../../examples/ruler.json", import.meta.url), "utf8"));
  const prototype = Object.prototype as Record<string, unknown>;
  const polluted = <T,>(values: Record<string, unknown>, run: () => T): T => {
    for (const [key, value] of Object.entries(values)) Object.defineProperty(prototype, key, { value, configurable: true, writable: true });
    try {
      return run();
    } finally {
      for (const key of Object.keys(values)) delete prototype[key];
    }
  };
  const injected = { type: "ruler", rulerUnit: "centimeters", length: 3, title: "Injected" };

  it("draws the same ruler, with its own accessible name, whatever a polluted Object.prototype holds", () => {
    for (const Component of [Graph, PackageRulerGraph]) {
      const plain = html(<Component description={example} />);
      for (const values of [
        { textAlternative: "PWN: this ruler is 3 cm" },
        { fallback: "none" },
        { description: injected },
        { text: "x" },
        { children: [] },
      ]) {
        expect(polluted(values, () => html(<Component description={example} />)), JSON.stringify(values)).toBe(plain);
      }
    }
  });

  it("still renders the placeholder for an invalid ruler, and nothing injected for a missing description", () => {
    for (const Component of [Graph, PackageRulerGraph]) {
      const invalid = polluted({ fallback: "none" }, () => html(<Component description={{ type: "ruler", rulerUnit: "centimeters", length: 0 }} />));
      expect(invalid).toContain("This graph could not be drawn.");
      const missing = polluted({ description: injected }, () => html(<Component {...({} as GraphProps)} />));
      expect(missing).not.toContain("Injected");
      expect(missing).toContain("This graph could not be drawn.");
    }
  });
});

describe("the number line's accessible name (NLC-REQ-012, NLC-REQ-013; graph-library NLC TICKET-002)", () => {
  const example: unknown = JSON.parse(readFileSync(new URL("../../examples/number-line.json", import.meta.url), "utf8"));
  const generated =
    "A number line titled “Temperatures at noon”, labeled “Degrees Celsius”, from -10 to 10, ticked every 2, with arrowheads at both ends. Ticks labeled: 0 as “zero”. 2 points are marked: -3 labeled “Monday” and 4 labeled “Tuesday”.";

  it("names the number line with its generated text alternative, as aria-label and <title>, through <NumberLineGraph> and <Graph>", () => {
    const markup = html(<PackageNumberLineGraph description={example} />);
    expect(markup).toBe(html(<Graph description={example} />));
    expect(markup).toContain(`aria-label="${generated}"`);
    expect(markup).toContain(`<title>${generated}</title>`);
  });

  it("replaces it with the caller's text alternative in both places, and keeps it for a blank one", () => {
    for (const Component of [Graph, PackageNumberLineGraph]) {
      const supplied = html(<Component description={example} textAlternative="A number line with two days marked." />);
      expect(supplied).toContain('aria-label="A number line with two days marked."');
      expect(supplied).toContain("<title>A number line with two days marked.</title>");
      expect(supplied).not.toContain(generated);
      expect(html(<Component description={example} textAlternative="  " />)).toContain(`aria-label="${generated}"`);
    }
  });
});

describe("the x,y graph's accessible name (NLC-REQ-012, NLC-REQ-013; graph-library NLC TICKET-003)", () => {
  const example: unknown = JSON.parse(readFileSync(new URL("../../examples/xy-graph.json", import.meta.url), "utf8"));
  const generated =
    "A coordinate graph titled “A walk across town”, x from -5 to 5 ticked every 1, y from -5 to 5 ticked every 1, showing all four quadrants, with grid lines. The x-axis is labeled “Blocks east”. The y-axis is labeled “Blocks north”. 2 points are plotted: (1, 2) labeled “Home” and (-3, 4) labeled “School”. 1 segment is drawn: from (1, 2) to (-3, 4) labeled “Route”.";

  it("names the x,y graph with its generated text alternative, as aria-label and <title>, through <XyGraph> and <Graph>", () => {
    const markup = html(<PackageXyGraph description={example} />);
    expect(markup).toBe(html(<Graph description={example} />));
    expect(markup).toContain(`aria-label="${generated}"`);
    expect(markup).toContain(`<title>${generated}</title>`);
  });

  it("replaces it with the caller's text alternative in both places, and keeps it for a blank one", () => {
    for (const Component of [Graph, PackageXyGraph]) {
      const supplied = html(<Component description={example} textAlternative="A route from home to school." />);
      expect(supplied).toContain('aria-label="A route from home to school."');
      expect(supplied).toContain("<title>A route from home to school.</title>");
      expect(supplied).not.toContain(generated);
      expect(html(<Component description={example} textAlternative="  " />)).toContain(`aria-label="${generated}"`);
    }
  });
});

describe("the x,y,z graph's accessible name (NLC-REQ-012, NLC-REQ-013; graph-library NLC TICKET-004)", () => {
  const example: unknown = JSON.parse(readFileSync(new URL("../../examples/xyz-graph.json", import.meta.url), "utf8"));
  const generated =
    "A three-dimensional coordinate graph titled “Corners of a box”, x from 0 to 5 ticked every 1, y from 0 to 5 ticked every 1, z from 0 to 5 ticked every 1, in isometric projection, with guide lines from each point to the x,y plane. The x-axis is labeled “Length”. The y-axis is labeled “Width”. The z-axis is labeled “Height”. 3 points are plotted: (1, 2, 3) labeled “A”, (4, 1, 2) labeled “B” and (2, 5, 1) labeled “C”.";

  it("names the x,y,z graph with its generated text alternative, as aria-label and <title>, through <XyzGraph> and <Graph>", () => {
    const markup = html(<PackageXyzGraph description={example} />);
    expect(markup).toBe(html(<Graph description={example} />));
    expect(markup).toContain(`aria-label="${generated}"`);
    expect(markup).toContain(`<title>${generated}</title>`);
  });

  it("replaces it with the caller's text alternative in both places, and keeps it for a blank one", () => {
    for (const Component of [Graph, PackageXyzGraph]) {
      const supplied = html(<Component description={example} textAlternative="Three corners of a box." />);
      expect(supplied).toContain('aria-label="Three corners of a box."');
      expect(supplied).toContain("<title>Three corners of a box.</title>");
      expect(supplied).not.toContain(generated);
      expect(html(<Component description={example} textAlternative="  " />)).toContain(`aria-label="${generated}"`);
    }
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

  it("lists exactly 20 issues with no count line, and counts the 21st (QR-005)", () => {
    const withUnknownKeys = (n: number) => {
      const description: Record<string, unknown> = { type: "circle", radius: 1 };
      for (let i = 0; i < n; i++) description[`k${i}`] = i;
      return description;
    };
    const twenty = html(<TestGraph description={withUnknownKeys(PLACEHOLDER_ISSUE_LIMIT)} />);
    expect(twenty.match(/<li>/g)).toHaveLength(PLACEHOLDER_ISSUE_LIMIT);
    expect(twenty).not.toContain("more.");
    const twentyOne = html(<TestGraph description={withUnknownKeys(PLACEHOLDER_ISSUE_LIMIT + 1)} />);
    expect(twentyOne.match(/<li>/g)).toHaveLength(PLACEHOLDER_ISSUE_LIMIT);
    expect(twentyOne).toContain("…and 1 more.");
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
    expect(markup).toContain("&quot;/&lt;img src=x onerror=alert(1)&gt;\\u0007\\u202e&quot;: ");
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
    const ThrowingCircle = createGraphComponent("circle", { definition: circleDefinition, layout: throwingLayouts.circle! });
    for (const Component of [Throwing, ThrowingCircle]) {
      const received: Issue[][] = [];
      expect(html(<Component description={circle} fallback={(issues: Issue[]) => (received.push(issues), null)} />)).toBe("");
      expect(received).toEqual([[expect.objectContaining({ code: "internal_error", path: "" })]]);
      const markup = html(<Component description={circle} />);
      expect(markup).toContain("defect in the package");
      expect(markup).not.toMatch(LEAKED_FRAME);
      expect(markup).not.toMatch(/RangeError|Infinity/);
    }
  });

  it("renders hostile values in both components: revoked proxies, throwing getters, inherited or lying type (code review CR-001)", () => {
    const { proxy: revoked, revoke } = Proxy.revocable({}, {});
    revoke();
    const throwingGetter = Object.defineProperty({ radius: 1 }, "type", {
      enumerable: true,
      get() {
        throw new Error("boom at file:///secret.js");
      },
    });
    const inherited = Object.create({ type: "circle" }) as object;
    // Answers "circle" when read, but holds "number-line" as its own property.
    const lying = new Proxy({ type: "number-line", axis: { min: 0, max: 1 } }, { get: (target, key) => (key === "type" ? "circle" : Reflect.get(target, key)) });
    const cases: Array<[unknown, string]> = [
      [revoked, "not_an_object"],
      [throwingGetter, "wrong_kind"],
      [inherited, "not_an_object"],
      [lying, "unknown_graph_type"],
    ];
    for (const [description, code] of cases) {
      for (const Component of [TestGraph, CircleGraph]) {
        const received: Issue[][] = [];
        expect(html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />)).toBe("");
        expect(received[0]?.map((issue) => issue.code)).toContain(code);
        expect(html(<Component description={description} />)).not.toMatch(LEAKED_FRAME);
      }
    }
  });

  it("renders the fallback, not a crash, when a layout returns a malformed Scene (security review SEC-002)", () => {
    for (const [defect, layout] of malformedLayouts) {
      const table = Object.freeze(Object.assign(Object.create(null) as Record<string, unknown>, { circle: layout })) as Registries["layouts"];
      const Entry = (props: GraphProps) => <>{renderGraph(props, { definitions: fixtureRegistry, layouts: table })}</>;
      const PerType = createGraphComponent("circle", { definition: circleFixture, layout });
      for (const Component of [Entry, PerType]) {
        const markup = html(<Component description={circle} />);
        expect([defect, markup.includes("defect in the package")]).toEqual([defect, true]);
      }
    }
  });

  it("draws a valid circle with its unit at the limit in <Graph> and <CircleGraph>, never throwing (GSS TICKET-002 security review SEC-001; GSV-REQ-053)", () => {
    const description = { type: "circle", radius: 5, unit: "@".repeat(UNIT_TEXT_LIMIT), labelRadius: true, labelDiameter: true, labelCircumference: true };
    for (const Component of [Graph, PackageCircleGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      expect(markup).toContain("<circle");
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(12);
    }
  });

  it("draws a valid pictograph with its label and title at the limit in <Graph> and <Pictograph>, never throwing (GSS TICKET-002 security review SEC-001; GSV-REQ-052)", () => {
    const description = {
      type: "pictograph",
      title: wordsOf(CALLER_TEXT_LIMIT),
      valueUnitLabel: "@".repeat(CALLER_TEXT_LIMIT),
      categories: [{ name: "Cats" }, { name: "Dogs" }],
      values: [7, 4],
      unitImage: "apple",
      unitValue: 2,
    };
    for (const Component of [Graph, PackagePictograph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title at most 3 lines, key at most 2, two category names.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 2 + 2);
    }
  });

  it("draws a valid line graph with its title, axis labels and series labels at the limit in <Graph> and <LineGraph>, never throwing (GSS TICKET-002 SEC-001; GSV-REQ-052)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const description = {
      type: "line-graph",
      title: long,
      categoryAxisLabel: long,
      valueAxisLabel: "@".repeat(CALLER_TEXT_LIMIT),
      categories: [{ name: "Mon" }, { name: "Tue" }],
      // Labels differ at the start, so none repeats another (DGP TICKET-002 SEC-003).
      series: Array.from({ length: 6 }, (_, s) => ({ values: [7, -4], lineLabel: `${s} ${wordsOf(CALLER_TEXT_LIMIT - 2)}` })),
    };
    for (const Component of [Graph, PackageLineGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title 3 lines, two axis labels of 2, six legend labels of 2, two names, at most 12 tick labels.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 4 + 12 + 2 + 12);
    }
  });

  it("draws a valid bar graph with its title and axis labels at the limit in <Graph> and <BarGraph>, in both orientations, never throwing (GSS TICKET-002 SEC-001; GSV-REQ-052)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    for (const orientation of ["vertical", "horizontal"]) {
      const description = {
        type: "bar-graph",
        orientation,
        title: long,
        categoryAxisLabel: long,
        valueAxisLabel: "@".repeat(CALLER_TEXT_LIMIT),
        categories: [{ name: "Walk" }, { name: "Bus" }],
        values: [7, 0.000123456789],
        showValues: true,
      };
      for (const Component of [Graph, PackageBarGraph]) {
        const received: Issue[][] = [];
        const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
        expect(received).toEqual([]);
        // Title 3 lines, two axis labels of 2, two names, two value labels, at most 12 tick labels.
        expect(markup.match(/<text /g)!.length, orientation).toBeLessThanOrEqual(3 + 4 + 2 + 4 + 12);
      }
    }
  });

  it("draws a valid ruler with its label and title at the limit in <Graph> and <RulerGraph>, never throwing (rulers NLC TICKET-002 SEC-002; GSV-REQ-052)", () => {
    const description = {
      type: "ruler",
      rulerUnit: "centimeters",
      length: 30,
      title: wordsOf(CALLER_TEXT_LIMIT),
      measuredObject: { start: 0.1, end: 29.9, label: "@".repeat(CALLER_TEXT_LIMIT) },
    };
    for (const Component of [Graph, PackageRulerGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title 3 lines, label 2, and the 31 numbers.
      expect(markup.match(/<text /g)!.length).toBe(3 + 2 + 31);
    }
  });

  it("draws a valid number line with every text at its limit in <Graph> and <NumberLineGraph>, never throwing (GSV-REQ-052)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const description = {
      type: "number-line",
      title: long,
      lineLabel: long,
      axis: { min: 0, max: 10, tickSpacing: 1 },
      points: Array.from({ length: 4 }, (_, i) => ({ value: i, label: `${i}${long.slice(1)}` })),
      tickLabels: [{ value: 5, text: long }],
    };
    for (const Component of [Graph, PackageNumberLineGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title 3 lines, line label 2, four point labels of 2, eleven tick labels.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 2 + 8 + 11);
    }
  });

  it("draws a valid x,y graph with every text at its limit in <Graph> and <XyGraph>, never throwing (GSV-REQ-052)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const description = {
      type: "xy-graph",
      title: long,
      xAxisLabel: long,
      yAxisLabel: long,
      xAxis: { min: -5, max: 5, tickSpacing: 1 },
      yAxis: { min: -5, max: 5, tickSpacing: 1 },
      showGrid: true,
      points: Array.from({ length: 4 }, (_, i) => ({ x: i, y: i, label: `${i}${long.slice(1)}` })),
      segments: [{ from: { x: -4, y: 4 }, to: { x: 4, y: -4 }, label: long }],
    };
    for (const Component of [Graph, PackageXyGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title 3 lines, two axis labels of 2, four point labels and a segment label of 2, 22 tick labels and the origin's 0.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 4 + 10 + 22 + 1);
    }
  });

  it("draws a valid square with every text at its limit in <Graph> and <SquareGraph>, never throwing (GSV-REQ-052, GSV-REQ-053)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const descriptions = [
      { type: "square", sideLength: 4, title: long, unit: "@".repeat(UNIT_TEXT_LIMIT), labelSides: "all", sideLabelText: long, showRightAngles: true },
      ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT)).map((cluster) => ({
        type: "square",
        sideLength: 4,
        title: cluster,
        unit: "@".repeat(UNIT_TEXT_LIMIT),
        labelSides: "all",
        sideLabelText: cluster,
      })),
    ];
    for (const description of descriptions) {
      for (const Component of [Graph, PackageSquareGraph]) {
        const received: Issue[][] = [];
        const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
        expect(received).toEqual([]);
        // Title 3 lines and four labels of at most 4 lines each.
        expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 4 * 4);
      }
    }
  });

  it("draws a valid triangle with every text at its limit in <Graph> and <TriangleGraph>, never throwing (GSV-REQ-052, GSV-REQ-053)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const sides = { type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "@".repeat(UNIT_TEXT_LIMIT), labelSides: "all", labelAngles: true };
    const texts = (text: string) => ({
      title: text,
      sideALabelText: text,
      sideBLabelText: text,
      sideCLabelText: text,
      angleALabelText: text,
      angleBLabelText: text,
      angleCLabelText: text,
      vertexNames: [text, text, text],
    });
    const descriptions = [{ ...sides, ...texts(long) }, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT)).map((cluster) => ({ ...sides, ...texts(cluster) }))];
    for (const description of descriptions) {
      for (const Component of [Graph, PackageTriangleGraph]) {
        const received: Issue[][] = [];
        const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
        expect(received).toEqual([]);
        // Title 3 lines, and nine labels (three sides, three angles, three names) of at most 4 lines each.
        expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 9 * 4);
      }
    }
  });

  it("draws a valid cube with every text at its limit in <Graph> and <CubeGraph>, never throwing (GSV-REQ-052, GSV-REQ-053)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const edges = { type: "cube", edgeLength: 3, unit: "@".repeat(UNIT_TEXT_LIMIT), labelEdges: "three", hiddenEdges: "dashed" };
    const descriptions = [{ ...edges, title: long, edgeLabelText: long }, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT)).map((cluster) => ({ ...edges, title: cluster, edgeLabelText: cluster }))];
    for (const description of descriptions) {
      for (const Component of [Graph, PackageCubeGraph]) {
        const received: Issue[][] = [];
        const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
        expect(received).toEqual([]);
        // Title 3 lines, and three edge labels of at most 4 lines each.
        expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 3 * 4);
      }
    }
  });

  it("draws a valid cylinder with every text at its limit in <Graph> and <CylinderGraph>, never throwing (GSV-REQ-052, GSV-REQ-053)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const base = { type: "cylinder", radius: 2, height: 5, unit: "@".repeat(UNIT_TEXT_LIMIT), showRadius: true, showDiameter: true, labelHeight: true, hiddenBase: "dashed" };
    const textsOf = (text: string) => ({ title: text, radiusLabelText: text, diameterLabelText: text, heightLabelText: text });
    const descriptions = [{ ...base, ...textsOf(long) }, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT)).map((cluster) => ({ ...base, ...textsOf(cluster) }))];
    for (const description of descriptions) {
      for (const Component of [Graph, PackageCylinderGraph]) {
        const received: Issue[][] = [];
        const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
        expect(received).toEqual([]);
        // Title 3 lines, and three labels (radius, diameter, height) of at most 4 lines each.
        expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 3 * 4);
      }
    }
  });

  it("draws a valid x,y,z graph with every text at its limit in <Graph> and <XyzGraph>, never throwing (GSV-REQ-052)", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const axis = { min: 0, max: 5, tickSpacing: 1 };
    const description = {
      type: "xyz-graph",
      title: long,
      xAxisLabel: long,
      yAxisLabel: long,
      zAxisLabel: long,
      xAxis: axis,
      yAxis: axis,
      zAxis: axis,
      guideLines: true,
      points: Array.from({ length: 4 }, (_, i) => ({ x: i, y: i + 1, z: 4 - i, label: `${i}${long.slice(1)}` })),
    };
    for (const Component of [Graph, PackageXyzGraph]) {
      const received: Issue[][] = [];
      const markup = html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toEqual([]);
      // Title 3 lines, three axis labels and four point labels of 2, and 16 tick labels: the origin's 0 once.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 6 + 8 + 16);
    }
  });

  it("refuses every caller text one character over its limit, with too_large naming the limit, in <Graph> and each component (GSV-REQ-052, GSV-REQ-053)", () => {
    const over = "@".repeat(CALLER_TEXT_LIMIT + 1);
    const cases: Array<[GraphComponent, object, string]> = [
      [PackageCircleGraph, { type: "circle", radius: 5, unit: "@".repeat(UNIT_TEXT_LIMIT + 1) }, "/unit"],
      [PackageCircleGraph, { type: "circle", radius: 5, radiusLabelText: over }, "/radiusLabelText"],
      [PackagePictograph, { type: "pictograph", categories: [{ name: "Cats" }], values: [2], unitImage: "apple", unitValue: 2, valueUnitLabel: over }, "/valueUnitLabel"],
      [PackageLineGraph, { type: "line-graph", categories: [{ name: "Mon" }, { name: "Tue" }], series: [{ values: [1, 2], lineLabel: over }] }, "/series/0/lineLabel"],
      [PackageBarGraph, { type: "bar-graph", title: over, categories: [{ name: "Walk" }], values: [7] }, "/title"],
      [PackageBarGraph, { type: "bar-graph", valueAxisLabel: over, categories: [{ name: "Walk" }], values: [7] }, "/valueAxisLabel"],
      [PackageRulerGraph, { type: "ruler", rulerUnit: "centimeters", length: 5, measuredObject: { start: 1, end: 2, label: over } }, "/measuredObject/label"],
      [PackageNumberLineGraph, { type: "number-line", axis: { min: 0, max: 10 }, points: [{ value: 1, label: over }] }, "/points/0/label"],
      [PackageNumberLineGraph, { type: "number-line", axis: { min: 0, max: 10 }, tickLabels: [{ value: 2, text: over }] }, "/tickLabels/0/text"],
      [PackageNumberLineGraph, { type: "number-line", axis: { min: 0, max: 10 }, lineLabel: over }, "/lineLabel"],
      [PackageXyGraph, { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, title: over }, "/title"],
      [PackageXyGraph, { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, xAxisLabel: over }, "/xAxisLabel"],
      [PackageXyGraph, { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, yAxisLabel: over }, "/yAxisLabel"],
      [PackageXyGraph, { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, points: [{ x: 1, y: 1, label: over }] }, "/points/0/label"],
      [PackageXyGraph, { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, segments: [{ from: { x: 1, y: 1 }, to: { x: 2, y: 2 }, label: over }] }, "/segments/0/label"],
      [PackageXyzGraph, { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, title: over }, "/title"],
      [PackageXyzGraph, { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, xAxisLabel: over }, "/xAxisLabel"],
      [PackageXyzGraph, { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, yAxisLabel: over }, "/yAxisLabel"],
      [PackageXyzGraph, { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, zAxisLabel: over }, "/zAxisLabel"],
      [PackageXyzGraph, { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, points: [{ x: 1, y: 1, z: 1, label: over }] }, "/points/0/label"],
      [PackageSquareGraph, { type: "square", sideLength: 4, title: over }, "/title"],
      [PackageSquareGraph, { type: "square", sideLength: 4, sideLabelText: over }, "/sideLabelText"],
      [PackageSquareGraph, { type: "square", sideLength: 4, unit: "@".repeat(UNIT_TEXT_LIMIT + 1) }, "/unit"],
      [PackageTriangleGraph, { type: "triangle", sideA: 3, sideB: 4, sideC: 5, title: over }, "/title"],
      [PackageTriangleGraph, { type: "triangle", sideA: 3, sideB: 4, sideC: 5, unit: "@".repeat(UNIT_TEXT_LIMIT + 1) }, "/unit"],
      [PackageTriangleGraph, { type: "triangle", sideA: 3, sideB: 4, sideC: 5, vertexNames: ["P", over] }, "/vertexNames/1"],
      ...(["sideALabelText", "sideBLabelText", "sideCLabelText", "angleALabelText", "angleBLabelText", "angleCLabelText"] as const).map(
        (term): [GraphComponent, object, string] => [PackageTriangleGraph, { type: "triangle", sideA: 3, sideB: 4, sideC: 5, [term]: over }, `/${term}`],
      ),
      [PackageCubeGraph, { type: "cube", edgeLength: 3, title: over }, "/title"],
      [PackageCubeGraph, { type: "cube", edgeLength: 3, edgeLabelText: over }, "/edgeLabelText"],
      [PackageCubeGraph, { type: "cube", edgeLength: 3, unit: "@".repeat(UNIT_TEXT_LIMIT + 1) }, "/unit"],
      ...(["title", "radiusLabelText", "diameterLabelText", "heightLabelText"] as const).map(
        (term): [GraphComponent, object, string] => [PackageCylinderGraph, { type: "cylinder", radius: 2, height: 5, [term]: over }, `/${term}`],
      ),
      [PackageCylinderGraph, { type: "cylinder", radius: 2, height: 5, unit: "@".repeat(UNIT_TEXT_LIMIT + 1) }, "/unit"],
    ];
    for (const [Component, description, path] of cases) {
      for (const Drawn of [Graph, Component]) {
        const received: Issue[][] = [];
        expect(html(<Drawn description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />)).toBe("");
        expect(received.flat().map((issue) => `${issue.code} ${issue.path}`), path).toEqual([`too_large ${path}`]);
        expect(received.flat()[0]!.message).toMatch(/has \d+ characters, more than the limit of (200|20);/);
      }
    }
  });

  it("keeps the bar graph's value labels bounded at the limits: 100 categories, every value written in full (DGP TICKET-003 code review CR-001, security review SEC-001, SEC-002)", () => {
    // The longest written value, 5e-324, is 326 characters, never cut. Measured 2026-10-19:
    // - upright: 3,802 text nodes and 861,141 characters of markup (crowded labels wrap to 72 units).
    //   Crowded names rotate to one line whatever their words, so 87 columns of combining-mark words
    //   draw 3,308 nodes, down from 11,921 and 2.32 MB (SEC-002);
    // - across, from a scale at zero: 2,502 text nodes, 616,995 characters, 22,048 units tall (each
    //   label wraps to the free width right of its bar). A negative minimum puts a label before the
    //   zero line when there is more room there: at most 29,248 units (a minimum about −2.2 of a
    //   maximum of 1), down from 53,728 (SEC-001). Names of 200 wide characters alone reach 42,208.
    // Before code review CR-001: 11,002 nodes and 2.19 MB; 53,728 units.
    const name = (i: number, fill: string) => `${String(i).padStart(3, "0")}${fill.repeat(197)}`;
    const x = Array.from({ length: 100 }, (_, i) => ({ name: name(i, "x") }));
    const wide = Array.from({ length: 100 }, (_, i) => ({ name: name(i, "@") }));
    const short = Array.from({ length: 100 }, (_, i) => ({ name: `C${i}` }));
    const marks = Array.from({ length: 87 }, (_, i) => ({ name: Array.from({ length: 100 }, (_, j) => (j === i ? "\u0301" : "\u0300")).join(" ") }));
    for (const [what, orientation, categories, valueScale, nodes, markupLength, height] of [
      ["x names", "vertical", x, undefined, 4_000, 900_000, 2_500],
      ["combining-mark words", "vertical", marks, { maximum: 1, tickInterval: 1 }, 4_000, 900_000, 2_500],
      ["x names", "horizontal", x, undefined, 2_700, 650_000, 23_000],
      ["x names, minimum −2.2", "horizontal", x, { minimum: -2.2, maximum: 1 }, 4_000, 900_000, 30_000],
      ["short names, minimum −1", "horizontal", short, { minimum: -1, maximum: 1e-9 }, 1_500, 400_000, 20_000],
      ["wide names", "horizontal", wide, undefined, 4_000, 900_000, 43_000],
    ] as const) {
      const description = { type: "bar-graph", orientation, categories, values: categories.map(() => 5e-324), showValues: true, ...(valueScale && { valueScale }) };
      const result = createGraph(description);
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      expect(result.scene.height, what).toBeLessThan(height);
      const markup = html(<PackageBarGraph description={description} />);
      expect(markup.match(/<text /g)!.length, what).toBeLessThan(nodes);
      expect(markup.length, what).toBeLessThan(markupLength);
    }
  });

  it("keeps the line graph's text alternative and markup bounded at its limits: 6 series × 100 categories, 200-character names, values written in full (DGP TICKET-002 SEC-001)", () => {
    // The worst case the provisional limits allow: every category name repeated once per series and
    // every value at its longest written form (-5e-324 is 327 characters). Measured 2026-10-15:
    // a 26 KB description gives a 321,158-character text alternative and 760,583 characters of
    // markup, 84% of it the aria-label and <title>; 108 text nodes.
    const categories = Array.from({ length: 100 }, (_, i) => ({ name: `${String(i).padStart(3, "0")}${"x".repeat(197)}` }));
    const series = Array.from({ length: 6 }, (_, s) => ({ values: categories.map(() => -5e-324), lineLabel: `Series label ${s}` }));
    const description = { type: "line-graph", categories, series };
    const result = createGraph(description);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene.textAlternative.length).toBeGreaterThan(300_000);
    expect(result.scene.textAlternative.length).toBeLessThan(330_000);
    const markup = html(<PackageLineGraph description={description} />);
    expect(markup.length).toBeLessThan(800_000);
    expect(markup.match(/<text /g)!.length).toBeLessThan(150);
  });

  it("keeps the number line's text alternative and markup bounded at its limits: 100 points, 100 custom labels, 200-character texts, values written in full (NLC TICKET-002 SEC-001)", () => {
    // The worst case the limits allow: 100 ticks each with a 200-character custom label, 100 points
    // each with a 200-character label, at values with the longest written forms (5e-324 is 326
    // characters). Measured 2026-10-23: a 47 KB description gives a 75,721-character text
    // alternative and 228,807 characters of markup; with "&" as the text, 560,771.
    const text = "a".repeat(CALLER_TEXT_LIMIT);
    const axis = { min: -0.99, max: 1, tickSpacing: 0.02 };
    const tickLabels = Array.from({ length: 100 }, (_, i) => ({ value: Math.round((-0.98 + i * 0.02) * 100) / 100, text }));
    const points = Array.from({ length: 100 }, (_, i) => ({ value: i % 2 === 0 ? 5e-324 : -2.2250738585072014e-308, label: text }));
    const description = { type: "number-line", title: text, lineLabel: text, axis, tickLabels, points };
    const result = createGraph(description);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene.textAlternative.length).toBeGreaterThan(70_000);
    expect(result.scene.textAlternative.length).toBeLessThan(80_000);
    const markup = html(<PackageNumberLineGraph description={description} />);
    expect(markup.length).toBeLessThan(700_000);
    expect(markup.match(/<text /g)!.length).toBeLessThan(320);
  });

  it("keeps the x,y graph's text alternative and markup bounded at its limits: the worst case for each (NLC TICKET-003 SEC-001)", () => {
    // The 10,000-value limit lets through 1,000 labeled points and 740 labeled segments (4 and 8
    // values each), or 1,000 points and 950 segments unlabeled. Coordinates are stated at most 12
    // significant digits and noise as 0 (SEC-001), so the longest stated coordinate is one just above
    // a trillionth of the narrowest axis's span. Measured 2026-10-27 on a 2e-9-wide plane: 224,391
    // characters unlabeled (1.79 million before SEC-001); with every text 200 × `"`, a 559,223-
    // character text alternative and 5,818,168 characters of markup, which escapes each `"` as
    // `&quot;` and holds the text alternative twice. Raising XY_ELEMENT_LIMIT,
    // DESCRIPTION_VALUE_LIMIT or CALLER_TEXT_LIMIT raises these in proportion.
    const span = 2e-9;
    const coordinate = (i: number) => (i % 2 ? -1 : 1) * span * 1.23456789012e-12 * (1 + (i % 7) / 10);
    const plane = (label: string | undefined, points: number, segments: number) => ({
      type: "xy-graph",
      ...(label === undefined ? {} : { title: label, xAxisLabel: label, yAxisLabel: label }),
      xAxis: { min: -span / 2, max: span / 2 },
      yAxis: { min: -span / 2, max: span / 2 },
      showGrid: true,
      points: Array.from({ length: points }, (_, i) => ({ x: coordinate(i), y: coordinate(i + 1), ...(label === undefined ? {} : { label }) })),
      segments: Array.from({ length: segments }, (_, i) => ({ from: { x: coordinate(i), y: coordinate(i + 2) }, to: { x: coordinate(i + 3), y: coordinate(i + 5) }, ...(label === undefined ? {} : { label }) })),
    });
    const unlabeled = createGraph(plane(undefined, 1000, 950));
    if (!unlabeled.ok) throw new Error(JSON.stringify(unlabeled.issues));
    expect(unlabeled.scene.textAlternative.length).toBeLessThan(250_000);
    // Subnormal coordinates, 326 digits each written in full, made 126 KB into 1.79 million
    // characters before SEC-001; they draw at 0 and are stated as 0.
    const subnormal = (i: number) => (i % 2 === 0 ? 5e-324 : -2.2250738585072014e-308);
    const points = Array.from({ length: 1000 }, (_, i) => ({ x: subnormal(i), y: subnormal(i + 1) }));
    const segments = Array.from({ length: 857 }, (_, i) => ({ from: { x: subnormal(i), y: subnormal(i + 1) }, to: { x: 1, y: subnormal(i) } }));
    const piled = createGraph({ type: "xy-graph", xAxis: { min: -10, max: 10 }, yAxis: { min: -10, max: 10 }, points, segments });
    if (!piled.ok) throw new Error(JSON.stringify(piled.issues));
    expect(piled.scene.textAlternative.length).toBeLessThan(100_000);
    const quoted = plane('"'.repeat(CALLER_TEXT_LIMIT), 1000, 740);
    const result = createGraph(quoted);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene.textAlternative.length).toBeLessThan(600_000);
    const markup = html(<PackageXyGraph description={quoted} />);
    expect(markup.length).toBeLessThan(6_200_000);
    // Each label at most two lines; title 3, axis labels 2 each, tick labels and the origin's 0.
    expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(2 * 1740 + 3 + 4 + 23);
  });

  it("keeps the x,y,z graph's text alternative and markup bounded at its limits, below the x,y graph's (NLC TICKET-004 SEC-001)", () => {
    // 1,000 labeled points (5 values each) on a 2e-9-wide cube, each coordinate just above a
    // trillionth of the span, so stated in 12 significant digits; every text 200 × `"`, guide lines
    // on. Measured 2026-10-28: a 322,212-character text alternative and 3,672,785 characters of
    // markup, below the x,y graph's 559,223 and 5,818,168 above, so the x,y graph stays the largest
    // description (CPSE TICKET-007). Raising XYZ_POINT_LIMIT or CALLER_TEXT_LIMIT, stating
    // coordinates raw or adding segments (spec OQ-007) raises these.
    const quote = '"'.repeat(CALLER_TEXT_LIMIT);
    const axis = { min: -1e-9, max: 1e-9 };
    const coordinate = (i: number) => -(1 + (i % 9) / 10 + 0.023456789012) * 1e-20;
    const description = {
      type: "xyz-graph",
      title: quote,
      xAxisLabel: quote,
      yAxisLabel: quote,
      zAxisLabel: quote,
      xAxis: axis,
      yAxis: axis,
      zAxis: axis,
      guideLines: true,
      points: Array.from({ length: 1000 }, (_, i) => ({ x: coordinate(i), y: coordinate(i + 1), z: coordinate(i + 2), label: quote, color: "#123456" })),
    };
    const result = createGraph(description);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene.textAlternative.length).toBeLessThan(350_000);
    const markup = html(<PackageXyzGraph description={description} />);
    expect(markup.length).toBeLessThan(4_000_000);
    // Below the x,y graph's ceilings in the test above.
    expect(result.scene.textAlternative.length).toBeLessThan(600_000);
    expect(markup.length).toBeLessThan(6_200_000);
    // Each point label at most two lines; title 3, axis labels 2 each, and at most 101 tick labels per axis.
    expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(2 * 1000 + 3 + 6 + 3 * 101);
  });

  it("keeps the triangle's text alternative and markup bounded at its limits (GSS TICKET-005 security review SEC-002)", () => {
    // Every caller text at 200 × `"` (quoted in the text alternative), a 20-character unit, every
    // label shown, measurements with 15 significant digits. Measured 2026-10-29: a 2,375-character
    // text alternative and 38,948 characters of markup with 39 <text> nodes, for three sides and
    // for a 0.02° needle alike; a triangle has a fixed number of texts, so these do not grow.
    const quote = '"'.repeat(CALLER_TEXT_LIMIT);
    const texts = {
      title: quote,
      unit: '"'.repeat(UNIT_TEXT_LIMIT),
      vertexNames: [quote, quote, quote],
      labelSides: "all",
      labelAngles: true,
      sideALabelText: quote,
      sideBLabelText: quote,
      sideCLabelText: quote,
      angleALabelText: quote,
      angleBLabelText: quote,
      angleCLabelText: quote,
    };
    for (const set of [{ sideA: 3.14159265358979, sideB: 4.12345678901234, sideC: 5.98765432109876 }, { angleA: 0.0212345678, angleB: 0.0212345678, sideC: 999999.123456789 }]) {
      const description = { type: "triangle", ...set, ...texts };
      const result = createGraph(description);
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      expect(result.scene.textAlternative.length).toBeLessThan(4_000);
      const markup = html(<PackageTriangleGraph description={description} />);
      expect(markup.length).toBeLessThan(60_000);
      // A title of at most 3 lines, and nine labels (three names, three sides, three angles) of at most 4 each.
      expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 9 * 4);
    }
  });

  it("keeps the cube's text alternative and markup bounded at its limits (GSS TICKET-006; GSS TICKET-002 security review SEC-002)", () => {
    // Every caller text at its limit, the three front-corner edges labeled, edge lengths with 15 to 17
    // significant digits. `"` texts are quoted and escaped in the markup; emoji are two UTF-16 units
    // each, and a unit ending in "." is quoted in the text alternative. Measured 2026-10-29 (security
    // review SEC-002): at most a 978-unit text alternative (emoji, hidden edges omitted), 13,640
    // characters of markup, 15 <text> nodes and a height of 595.2. A cube has a fixed number of texts
    // and edges, so these do not grow.
    const quote = '"'.repeat(CALLER_TEXT_LIMIT);
    const emoji = String.fromCodePoint(0x1f600).repeat(CALLER_TEXT_LIMIT);
    const texts = [
      { title: quote, unit: '"'.repeat(UNIT_TEXT_LIMIT), edgeLabelText: quote },
      { title: "'".repeat(CALLER_TEXT_LIMIT), unit: "'".repeat(UNIT_TEXT_LIMIT), edgeLabelText: "'".repeat(CALLER_TEXT_LIMIT) },
      { title: emoji, unit: `${String.fromCodePoint(0x1f600).repeat(UNIT_TEXT_LIMIT - 1)}.`, edgeLabelText: emoji },
    ];
    for (const text of texts) {
      for (const hiddenEdges of ["dashed", "omitted"]) {
        for (const edgeLength of [3.14159265358979, 999999.123456789, 0.00123456789012345, 0.0010000000000000002]) {
          const description = { type: "cube", edgeLength, labelEdges: "three", hiddenEdges, ...text };
          const result = createGraph(description);
          if (!result.ok) throw new Error(JSON.stringify(result.issues));
          expect(result.scene.textAlternative.length).toBeLessThan(1_100);
          expect(result.scene.height).toBeLessThan(650);
          const markup = html(<PackageCubeGraph description={description} />);
          expect(markup.length).toBeLessThan(20_000);
          // A title of at most 3 lines, and three edge labels of at most 4 each.
          expect(markup.match(/<text /g)!.length).toBeLessThanOrEqual(3 + 3 * 4);
        }
      }
    }
  });

  it("keeps the cylinder's text alternative and markup bounded at its limits (GSS TICKET-007; GSS TICKET-002 security review SEC-002)", () => {
    // Every caller text at its limit, the radius, diameter and height labeled, measurements with 15 to
    // 17 significant digits, very tall and very wide. `"` texts are quoted and escaped in the markup;
    // emoji are two UTF-16 units each, and a unit ending in "." is quoted in the text alternative.
    // Measured 2026-10-29: at most a 1,985-unit text alternative (emoji: four quoted texts), 18,731
    // characters of markup, 15 <text> nodes and a height of 582.73. A cylinder has a fixed number of
    // texts and lines, so these do not grow.
    const quote = '"'.repeat(CALLER_TEXT_LIMIT);
    const emoji = String.fromCodePoint(0x1f600).repeat(CALLER_TEXT_LIMIT);
    const textsOf = (text: string, unit: string) => ({ title: text, unit, radiusLabelText: text, diameterLabelText: text, heightLabelText: text });
    const texts = [
      textsOf(quote, '"'.repeat(UNIT_TEXT_LIMIT)),
      textsOf("'".repeat(CALLER_TEXT_LIMIT), "'".repeat(UNIT_TEXT_LIMIT)),
      textsOf(emoji, `${String.fromCodePoint(0x1f600).repeat(UNIT_TEXT_LIMIT - 1)}.`),
    ];
    for (const text of texts) {
      for (const hiddenBase of ["dashed", "omitted"]) {
        for (const [radius, height] of [
          [3.14159265358979, 2.71828182845905],
          [999999.123456789, 0.00123456789012345],
          [0.0010000000000000002, 999999.123456789],
        ]) {
          const description = { type: "cylinder", radius, height, showRadius: true, showDiameter: true, labelHeight: true, hiddenBase, ...text };
          const result = createGraph(description);
          if (!result.ok) throw new Error(JSON.stringify(result.issues));
          const markup = html(<PackageCylinderGraph description={description} />);
          const count = markup.match(/<text /g)!.length;
          expect(result.scene.textAlternative.length).toBeLessThan(2_200);
          expect(result.scene.height).toBeLessThan(650);
          expect(markup.length).toBeLessThan(22_000);
          // A title of at most 3 lines, and three labels of at most 4 each.
          expect(count).toBeLessThanOrEqual(3 + 3 * 4);
        }
      }
    }
  });

  it("lays out the x,y graph's costliest labels within a second and a half: points stacked at one spot and labeled segments (NLC TICKET-003 SEC-003)", () => {
    // Each label tries up to 12 places (points) or 8 (segments) against every obstacle placed so far,
    // the accepted quadratic cost of placeLabel (CPSE TICKET-002 SEC-004). Measured 2026-10-27:
    // 0.37 to 0.53 s for this 69 KB description, against its forecast of about half a second.
    const points = Array.from({ length: 1000 }, () => ({ x: 5, y: 5, label: "a" }));
    const segments = Array.from({ length: 700 }, (_, i) => ({ from: { x: 5, y: 5 }, to: { x: 5 + (i + 1) / 1000, y: 5 }, label: "a" }));
    const description = { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, points, segments };
    const started = performance.now();
    const result = createGraph(description);
    const elapsed = performance.now() - started;
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(elapsed).toBeLessThan(1_500);
  });

  it("lays out the x,y,z graph's costliest labels within a second and a half: 1,000 labeled points stacked at one spot, with guide lines (NLC TICKET-004)", () => {
    // Each label tries up to 12 places against every obstacle placed so far, the guide lines among
    // them, the accepted quadratic cost of placeLabel (CPSE TICKET-002 SEC-004). Measured
    // 2026-10-27: about 0.6 s.
    const points = Array.from({ length: 1000 }, () => ({ x: 3, y: 2, z: 4, label: "a" }));
    const description = { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, guideLines: true, points };
    const started = performance.now();
    const result = createGraph(description);
    const elapsed = performance.now() - started;
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(elapsed).toBeLessThan(1_500);
  });

  it("reports a category name over the limit rather than drawing it, so a megabyte of names never reaches the renderer (DGP TICKET-005 SEC-001)", () => {
    // Before the limit, 40 columns of names like "i i i …" in 1 MB drew about 500,000 text nodes and
    // 95.5 MB of markup, and 4 MB threw past the fallback.
    const categories = Array.from({ length: 40 }, (_, i) => ({ name: "i ".repeat(12_500 + i).trim() }));
    const description = { type: "pictograph", orientation: "vertical", categories, values: categories.map(() => 1), unitImage: "apple", unitValue: 1 };
    for (const Component of [Graph, PackagePictograph]) {
      const received: Issue[][] = [];
      html(<Component description={description} fallback={(issues: Issue[]) => (received.push(issues), null)} />);
      expect(received).toHaveLength(1);
      expect(received[0]!.map((issue) => `${issue.code} ${issue.path}`)).toEqual(categories.map((_, i) => `too_large /categories/${i}/name`));
    }
  });

  it("keeps the names' markup bounded at the limit: the narrow-word worst case in columns (DGP TICKET-005 SEC-001)", () => {
    // Names of narrow words wrap one word per line under narrow columns: the most text per byte.
    // Crowded columns rotate names to one line (DGP TICKET-003 security review SEC-002), so the worst
    // case under the 200-character limit is 25 columns: 1,107 text nodes, 0.23 MB. Before, 53 columns
    // of "i" drew 3,923 nodes, and 91 of combining-mark words 9,101 nodes and 1.77 MB.
    const marks = (count: number) => Array.from({ length: count }, (_, i) => ({ name: Array.from({ length: 100 }, (_, j) => (j === i ? "\u0301" : "\u0300")).join(" ") }));
    const narrow = (count: number) => Array.from({ length: count }, (_, i) => ({ name: "i ".repeat(100 - i).trim() }));
    for (const categories of [25, 26, 53, 91, 100].flatMap((count) => [narrow(count), marks(count)])) {
      const count = categories.length;
      const markup = html(
        <PackagePictograph description={{ type: "pictograph", orientation: "vertical", categories, values: categories.map(() => 1), unitImage: "apple", unitValue: 1 }} />,
      );
      expect(markup).toContain("<svg");
      expect(markup.match(/<text /g)!.length, String(count)).toBeLessThanOrEqual(1_200);
      expect(markup.length, String(count)).toBeLessThan(250_000);
    }
  });

  it("renders <Graph> and a per-type component for any JSON value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.option(fc.string()), (description, textAlternative) => {
        for (const Component of [Graph, TestGraph, CircleGraph]) {
          html(<Component description={description} textAlternative={textAlternative ?? undefined} />);
        }
        // Graph is exactly the shared render routine with the package's registries.
        expect(html(<Graph description={description} />)).toBe(html(renderGraph({ description }, { definitions, layouts })));
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
