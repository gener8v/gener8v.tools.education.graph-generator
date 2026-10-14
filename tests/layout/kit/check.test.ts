import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/layout/kit/check";
import { fmt, fmtPoints, pathData, translate } from "../../../src/layout/kit/format";
import { SCENE_WIDTH, type Rounded, type Scene, type SceneNode } from "../../../src/layout/scene";

const scene = (...nodes: SceneNode[]): Scene => ({ width: SCENE_WIDTH, height: fmt(200), textAlternative: "A figure.", nodes });
// Builds Scenes the types reject, as data from a buggy layout or a cast might be.
const unchecked = (node: unknown): Scene => scene(node as SceneNode);

describe("checkScene (AD-007, AD-008; code review CR-001, CR-002, CR-003; quality review QR-004, QR-005)", () => {
  it("accepts a Scene built with the kit helpers", () => {
    expect(
      checkScene(
        scene(
          { kind: "path", attrs: [["d", pathData([["M", 1 / 3, 0], ["L", 10, 20.555], ["Z"]])], ["fill", "#1e3a5f"]] },
          { kind: "polygon", attrs: [["points", fmtPoints([[0, 0], [1 / 7, 2]])], ["stroke-dasharray", "8 4"]] },
          {
            kind: "group",
            attrs: [["transform", translate(10.123, 0)]],
            children: [{ kind: "text", attrs: [["x", fmt(1)], ["font-family", "system-ui, Roboto"]], text: "3.14159 cm" }],
          },
          { kind: "svg", attrs: [["viewBox", "0 0 25 25"], ["width", fmt(12.5)]], children: [] },
        ),
      ),
    ).toEqual([]);
  });

  it("reports a backslash in any string value, which could spell an escaped reference (DGP TICKET-004 security review SEC-001)", () => {
    const problems = checkScene(
      scene(
        { kind: "path", attrs: [["fill", "\\75 rl(#g)"]] },
        { kind: "rect", attrs: [["stroke", "#000\\"]] },
        { kind: "text", attrs: [["font-family", "Arial\\"]], text: "a\\b" },
      ),
    );
    expect(problems).toHaveLength(3);
    for (const problem of problems) expect(problem).toMatch(/has a backslash/);
  });

  it("reports numbers written into strings without fmt()", () => {
    const n = 1 / 3;
    const problems = checkScene(
      scene(
        { kind: "circle", attrs: [["cx", String(n)]] },
        { kind: "path", attrs: [["d", `M ${n} 0 L 1 1`]] },
        { kind: "group", attrs: [["transform", `rotate(${n * 100})`]], children: [] },
        { kind: "svg", attrs: [["viewBox", `0 0 ${n} 25`]], children: [] },
        { kind: "rect", attrs: [["width", "1e3"]] },
      ),
    );
    expect(problems).toHaveLength(5);
    expect(problems[0]).toMatch(/nodes\[0\]\.attrs\[0\] \(cx\).*more than 2 decimals/);
    expect(problems[4]).toMatch(/exponent form/);
  });

  it("reports numbers that skipped fmt() despite the type", () => {
    const raw = 0.125 as Rounded;
    const negativeZero = -0 as Rounded;
    expect(checkScene(scene({ kind: "circle", attrs: [["r", raw], ["cx", negativeZero]] }))).toHaveLength(2);
    expect(checkScene({ ...scene(), height: (1 / 3) as Rounded })).toHaveLength(1);
  });

  it("reports url(…) references in any attribute, including paint", () => {
    const problems = checkScene(
      scene(
        { kind: "rect", attrs: [["fill", "url(#gradient)"]] },
        { kind: "rect", attrs: [["stroke", "URL( https://evil.example/x.svg#a )"]] },
        { kind: "rect", attrs: [["font-family", "url(x)"]] },
      ),
    );
    expect(problems).toHaveLength(3);
    for (const problem of problems) expect(problem).toMatch(/AD-008/);
  });

  it("does not read digits in colors and font names as coordinates", () => {
    expect(checkScene(scene({ kind: "text", attrs: [["fill", "#1e3a5f"], ["font-family", "Font 1.234"]], text: "x" }))).toEqual([]);
  });

  it("reports repeated attributes, which an exported component could not compile", () => {
    const problems = checkScene(scene({ kind: "rect", attrs: [["x", fmt(1)], ["y", fmt(2)], ["x", fmt(3)]] }));
    expect(problems).toEqual(["nodes[0].attrs[2] (x): repeated attribute"]);
  });

  it("reports text or children on the wrong kind of node, at any depth", () => {
    const problems = checkScene(
      scene({
        kind: "group",
        attrs: [],
        children: [
          { kind: "circle", attrs: [], children: [] } as unknown as SceneNode,
          { kind: "rect", attrs: [], text: "hidden words" } as unknown as SceneNode,
          { kind: "text", attrs: [], text: "label", children: [] } as unknown as SceneNode,
          { kind: "text", attrs: [] } as unknown as SceneNode,
          { kind: "svg", attrs: [] } as unknown as SceneNode,
        ],
      }),
    );
    expect(problems).toEqual([
      "nodes[0].children[0]: only a group or svg node may have children",
      "nodes[0].children[1]: only a text node may have text",
      "nodes[0].children[2]: only a group or svg node may have children",
      "nodes[0].children[3]: a text node needs text",
      "nodes[0].children[4]: a svg node needs children",
    ]);
  });

  it("reports unknown kinds and attribute names", () => {
    expect(checkScene(unchecked({ kind: "image", attrs: [] }))).toEqual(['nodes[0]: unknown kind "image"']);
    expect(checkScene(unchecked({ kind: "rect", attrs: [["href", "x"]] }))).toEqual(["nodes[0].attrs[0] (href): not a Scene attribute"]);
  });
});
