import { describeNormalized } from "../../src/core/describe";
import type { DescriptionBase } from "../../src/core/definitions/types";
import { displayValue, fmt } from "../../src/layout/kit/format";
import type { Layout, LayoutRegistry } from "../../src/layout/registry";
import { SCENE_WIDTH, type Scene } from "../../src/layout/scene";
import { fixtureRegistry } from "./definitions";

/**
 * A test-only circle layout for the fixture circle definition, standing in for the real one until
 * GSS TICKET-002 lands. The circle fills the drawing whatever the radius; the label shows it.
 */
export const circleLayout: Layout = (normalized: DescriptionBase): Scene => ({
  width: SCENE_WIDTH,
  height: fmt(300),
  textAlternative: describeNormalized(normalized, fixtureRegistry),
  nodes: [
    { kind: "circle", attrs: [["cx", fmt(200)], ["cy", fmt(140)], ["r", fmt(120)], ["fill", "none"], ["stroke", "#000000"]] },
    {
      kind: "text",
      attrs: [["x", fmt(200)], ["y", fmt(290)], ["text-anchor", "middle"]],
      text: `r = ${displayValue(normalized.radius as number, "derived")}`,
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
