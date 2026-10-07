import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt, fmtPoints } from "../../src/layout/kit/format";
import { ELEMENT_FOR_KIND, REACT_PROP, SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { SceneSvg } from "../../src/react/SceneSvg";
import { BENIGN_TEXT, HOSTILE_TEXT } from "../fixtures/plain-text";

const stroke = [
  ["stroke", "#222222"],
  ["stroke-width", fmt(2)],
] as const;

/** One node of every kind, nested groups and a nested svg viewport. */
const sample: Scene = {
  width: SCENE_WIDTH,
  height: fmt(250),
  textAlternative: "A circle with radius 5 cm, and its diameter.",
  nodes: [
    { kind: "rect", attrs: [["x", fmt(0)], ["y", fmt(0)], ["width", fmt(400)], ["height", fmt(250)], ["fill", "#ffffff"]] },
    {
      kind: "group",
      attrs: [["fill", "none"], ...stroke],
      children: [
        { kind: "circle", attrs: [["cx", fmt(200)], ["cy", fmt(125)], ["r", fmt(100.004)]] },
        { kind: "ellipse", attrs: [["cx", fmt(200)], ["cy", fmt(125)], ["rx", fmt(50)], ["ry", fmt(28.87)]] },
        { kind: "line", attrs: [["x1", fmt(100)], ["y1", fmt(125)], ["x2", fmt(300)], ["y2", fmt(-0.001)], ["stroke-dasharray", "8 4"]] },
        { kind: "polyline", attrs: [["points", fmtPoints([[0, 0], [10.126, 20], [30, 5]])]] },
        { kind: "path", attrs: [["d", `M ${fmt(10)} ${fmt(10)} L ${fmt(20)} ${fmt(20)}`], ["stroke-linecap", "round"]] },
      ],
    },
    // An arrowhead is a polygon, not a <marker> (AD-008).
    { kind: "polygon", attrs: [["points", fmtPoints([[300, 125], [290, 120], [290, 130]])], ["fill", "#222222"]] },
    {
      kind: "svg",
      attrs: [["x", fmt(10)], ["y", fmt(200)], ["width", fmt(12.5)], ["height", fmt(25)], ["viewBox", "0 0 25 25"]],
      children: [{ kind: "rect", attrs: [["width", fmt(25)], ["height", fmt(25)], ["fill", "#0072b2"]] }],
    },
    {
      kind: "text",
      attrs: [["x", fmt(200)], ["y", fmt(240)], ["font-size", fmt(14)], ["font-family", "system-ui, sans-serif"], ["text-anchor", "middle"]],
      text: "d = 10 cm",
    },
  ],
};

function parse(markup: string): Document {
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("SceneSvg markup (AD-002, AD-008, CPSE-REQ-013)", () => {
  const markup = renderToStaticMarkup(<SceneSvg scene={sample} />);

  it("opens with role, accessible name, a 400-unit viewBox and container width, in that order", () => {
    expect(markup.startsWith(
      `<svg role="img" aria-label="A circle with radius 5 cm, and its diameter." viewBox="0 0 400 250" width="100%">` +
        `<title>A circle with radius 5 cm, and its diameter.</title>`,
    )).toBe(true);
  });

  it("maps each node one-to-one to an SVG element, attributes in Scene order", () => {
    const svg = parse(markup).querySelector("svg")!;
    const check = (element: Element, node: SceneNode) => {
      expect(element.tagName).toBe(ELEMENT_FOR_KIND[node.kind]);
      expect([...element.attributes].map((a) => [a.name, a.value])).toEqual(node.attrs.map(([n, v]) => [n, String(v)]));
      if (node.text !== undefined) expect(element.textContent).toBe(node.text);
      expect(element.children).toHaveLength(node.children?.length ?? 0);
      node.children?.forEach((child, i) => check(element.children[i]!, child));
    };
    const [title, ...rest] = [...svg.children];
    expect(title!.tagName).toBe("title");
    expect(rest).toHaveLength(sample.nodes.length);
    sample.nodes.forEach((node, i) => check(rest[i]!, node));
  });

  it("prints kebab-case presentation attributes under their SVG names", () => {
    expect(markup).toContain(`stroke-width="2"`);
    expect(markup).toContain(`stroke-dasharray="8 4"`);
    expect(markup).toContain(`text-anchor="middle"`);
    expect(markup).toContain(`r="100"`);
    expect(markup).toContain(`y2="0"`);
    expect(markup).toContain(`points="0,0 10.13,20 30,5"`);
  });

  it("has a React prop for every Scene attribute and an element for every node kind", () => {
    for (const [name, prop] of Object.entries(REACT_PROP)) {
      const out = renderToStaticMarkup(<SceneSvg scene={{ ...sample, nodes: [{ kind: "rect", attrs: [[name as keyof typeof REACT_PROP, "1"]] }] }} />);
      expect(out, `${name} → ${prop}`).toContain(` ${name}="1"`);
    }
    expect(Object.values(ELEMENT_FOR_KIND).sort()).toEqual(["circle", "ellipse", "g", "line", "path", "polygon", "polyline", "rect", "svg", "text"]);
  });

  it("uses no ids, id references, markers or clip paths", () => {
    expect(markup).not.toMatch(/\sid=|url\(#|<marker|<clipPath|aria-labelledby|xlink:href|href=/);
  });

  it("is a pure function component: no hooks, state, effects, ids or url(#…)", () => {
    const source = readFileSync(new URL("../../src/react/SceneSvg.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/\buse[A-Z]\w*\s*\(/);
    expect(source).not.toMatch(/\bid\b|url\(#|dangerouslySetInnerHTML/);
  });
});

describe("text alternative (CPSE-REQ-012, prd/CC-002)", () => {
  const nameOf = (markup: string) => {
    const svg = parse(markup).querySelector("svg")!;
    return [svg.getAttribute("aria-label"), svg.querySelector("title")!.textContent];
  };

  it("uses the Scene's generated text alternative by default", () => {
    expect(nameOf(renderToStaticMarkup(<SceneSvg scene={sample} />))).toEqual([sample.textAlternative, sample.textAlternative]);
  });

  it("replaces it with a caller-supplied text alternative in aria-label and <title>", () => {
    const supplied = "Circle for question 3";
    expect(nameOf(renderToStaticMarkup(<SceneSvg scene={sample} textAlternative={supplied} />))).toEqual([supplied, supplied]);
  });

  it("keeps the generated one when the supplied text alternative is blank", () => {
    for (const blank of ["", "   "]) {
      expect(nameOf(renderToStaticMarkup(<SceneSvg scene={sample} textAlternative={blank} />))).toEqual([
        sample.textAlternative,
        sample.textAlternative,
      ]);
    }
  });
});

describe("plain text renders literally (GSV-REQ-043; GSV TICKET-001 security review SEC-001)", () => {
  for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT]) {
    it(`renders ${JSON.stringify(text)} as text, not markup`, () => {
      const scene: Scene = {
        ...sample,
        textAlternative: text,
        nodes: [{ kind: "text", attrs: [["x", fmt(0)], ["y", fmt(20)]], text }],
      };
      const doc = parse(renderToStaticMarkup(<SceneSvg scene={scene} />));
      const svg = doc.querySelector("svg")!;
      expect(svg.getAttribute("aria-label")).toBe(text);
      expect(svg.querySelector("title")!.textContent).toBe(text);
      expect(svg.querySelector("text")!.textContent).toBe(text);
      expect([...svg.querySelectorAll("*")].map((e) => e.tagName)).toEqual(["title", "text"]);
      expect([...svg.attributes].map((a) => a.name)).toEqual(["role", "aria-label", "viewBox", "width"]);
    });
  }
});

describe("server and browser render the same markup (CPSE-REQ-011, prd/TC-001, prd/RF-003)", () => {
  it("renders in Node.js with no browser globals, and a jsdom render produces the same DOM", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const scenes: Scene[] = [
      sample,
      ...[...BENIGN_TEXT, ...HOSTILE_TEXT].map((text): Scene => ({
        ...sample,
        textAlternative: text,
        nodes: [...sample.nodes, { kind: "text", attrs: [["x", fmt(0)], ["y", fmt(20)]], text }],
      })),
    ];
    const serverMarkup = scenes.map((scene) => renderToString(<SceneSvg scene={scene} />));

    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const globals = globalThis as Record<string, unknown>;
    globals.window = dom.window;
    globals.document = dom.window.document;
    try {
      const { createRoot } = await import("react-dom/client");
      const { flushSync } = await import("react-dom");
      scenes.forEach((scene, i) => {
        const container = dom.window.document.createElement("div");
        dom.window.document.body.append(container);
        const root = createRoot(container);
        flushSync(() => root.render(<SceneSvg scene={scene} />));
        // Serialize the server string through the same DOM, so the comparison is of trees, not of
        // React's and jsdom's different (equally valid) text escaping.
        const fromServer = dom.window.document.createElement("div");
        fromServer.innerHTML = serverMarkup[i]!;
        expect(container.innerHTML).toBe(fromServer.innerHTML);
        expect(container.firstElementChild!.isEqualNode(fromServer.firstElementChild)).toBe(true);
        root.unmount();
        container.remove();
      });
      // Let React's scheduler finish its queued work while the DOM globals still exist.
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      delete globals.window;
      delete globals.document;
      dom.window.close();
    }
  });
});
