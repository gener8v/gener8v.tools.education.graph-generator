import { describeNormalized } from "../../src/core/describe";
import { displayValue, fmt } from "../../src/layout/kit/format";
import type { Layout, LayoutRegistry } from "../../src/layout/registry";
import { SCENE_WIDTH, type Scene } from "../../src/layout/scene";
import { fixtureRegistry } from "./definitions";
import type { Circle } from "./definitions/circle";

/**
 * A test-only circle layout for the fixture circle definition, standing in for the real one until
 * GSS TICKET-002 lands. The circle fills the drawing whatever the radius; the label shows it.
 */
export const circleLayout: Layout<Circle> = (normalized): Scene => ({
  width: SCENE_WIDTH,
  height: fmt(300),
  textAlternative: describeNormalized(normalized, fixtureRegistry),
  nodes: [
    { kind: "circle", attrs: [["cx", fmt(200)], ["cy", fmt(140)], ["r", fmt(120)], ["fill", "none"], ["stroke", "#000000"]] },
    {
      kind: "text",
      attrs: [["x", fmt(200)], ["y", fmt(290)], ["text-anchor", "middle"]],
      text: `r = ${displayValue(normalized.radius, "derived")}`,
    },
  ],
});

/** Test-only layouts, keyed like the package's registry. */
export const fixtureLayouts: LayoutRegistry = Object.freeze(
  Object.assign(Object.create(null) as Record<string, Layout>, { circle: circleLayout }),
);

/** A layout that fails the way `fmt()` does on an extreme value, with a stack trace to leak. */
export const throwingLayouts: LayoutRegistry = Object.freeze(
  Object.assign(Object.create(null) as Record<string, Layout>, {
    circle: () => fmt(Number.POSITIVE_INFINITY) as unknown as Scene,
  }),
);

/**
 * Layouts that return a malformed Scene instead of throwing (security review SEC-002), each paired
 * with the defect it stands for.
 */
const base = (normalized: Circle) => circleLayout(normalized);
export const malformedLayouts: ReadonlyArray<readonly [string, Layout<Circle>]> = [
  ["an undefined node", (n) => ({ ...base(n), nodes: [undefined as unknown as Scene["nodes"][number]] })],
  ["no node list", (n) => ({ ...base(n), nodes: undefined as unknown as Scene["nodes"] })],
  ["a node of unknown kind", (n) => ({ ...base(n), nodes: [{ kind: "image", attrs: [] } as unknown as Scene["nodes"][number]] })],
  ["a node with no attrs", (n) => ({ ...base(n), nodes: [{ kind: "rect" } as unknown as Scene["nodes"][number]] })],
  ["text that is not a string", (n) => ({ ...base(n), nodes: [{ kind: "text", attrs: [], text: { a: 1 } } as unknown as Scene["nodes"][number]] })],
  ["no Scene at all", () => undefined as unknown as Scene],
  ["an unrounded number", (n) => ({ ...base(n), height: (1 / 3) as Scene["height"] })],
  ["a url() reference", (n) => ({ ...base(n), nodes: [{ kind: "rect", attrs: [["fill", "url(#x)"]] }] })],
];
