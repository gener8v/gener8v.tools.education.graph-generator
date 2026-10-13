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

/**
 * A node as a React element: one SVG element, props in Scene order, text as a text child. Children
 * are passed as one array keyed by position, never spread into arguments: a Scene can hold more
 * nodes than an engine accepts as arguments (GSS TICKET-002 security review SEC-001). Keys are
 * not printed, so the markup is unchanged.
 */
function toElement(node: SceneNode, index: number): ReactElement {
  const props: Record<string, string | number> = { key: index };
  for (const [name, value] of node.attrs) props[REACT_PROP[name]] = value;
  let children: ReactNode = null;
  if (node.kind === "text") children = node.text;
  else if (node.kind === "group" || node.kind === "svg") children = node.children.map(toElement);
  return createElement(ELEMENT_FOR_KIND[node.kind], props, children);
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
  const children = scene.nodes.map(toElement);
  children.unshift(createElement("title", { key: "title" }, name));
  return createElement("svg", Object.fromEntries(rootAttrs(scene, name)), children);
}
