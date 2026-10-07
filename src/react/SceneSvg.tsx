import { createElement, type ReactElement, type ReactNode } from "react";
import {
  ELEMENT_FOR_KIND,
  REACT_PROP,
  rootAttrs,
  textAlternativeFor,
  type Scene,
  type SceneNode,
} from "../layout/scene";

export interface SceneSvgProps {
  readonly scene: Scene;
  /** The caller's text alternative; replaces the Scene's generated one when anything visible is left after cleaning. */
  readonly textAlternative?: string;
}

/** A node as a React element: one SVG element, props in Scene order, text as a text child. */
function toElement(node: SceneNode): ReactElement {
  const props: Record<string, string | number> = {};
  for (const [name, value] of node.attrs) props[REACT_PROP[name]] = value;
  let children: ReactNode[] = [];
  if (node.kind === "text") children = [node.text];
  else if (node.kind === "group" || node.kind === "svg") children = node.children.map(toElement);
  // Children are passed as arguments, not an array, so React needs no keys.
  return createElement(ELEMENT_FOR_KIND[node.kind], props, ...children);
}

/**
 * Prints a Scene as SVG (AD-002): scaled to its container through `viewBox` and `width="100%"`,
 * named for assistive technology by `role="img"`, `aria-label` and a first-child `<title>`
 * (AD-008, prd/CC-002). A pure function: no hooks, state, effects, ids or `url(#…)` references,
 * so server and browser render the same markup. Every Scene string reaches React as a text child
 * or an attribute value, never as markup (GSV-REQ-043).
 *
 * The source exporter's printer (CPSE TICKET-005) prints the same markup from the same contract:
 * `rootAttrs`, `textAlternativeFor`, `ELEMENT_FOR_KIND` and `REACT_PROP` in src/layout/scene.ts.
 */
// @spec CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-013
export function SceneSvg({ scene, textAlternative }: SceneSvgProps): ReactElement {
  const name = textAlternativeFor(scene, textAlternative);
  return createElement(
    "svg",
    Object.fromEntries(rootAttrs(scene, name)),
    createElement("title", null, name),
    ...scene.nodes.map(toElement),
  );
}
