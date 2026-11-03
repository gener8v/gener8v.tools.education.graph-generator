import { escapeChars } from "../core/issues";
import { type AttrValue, ELEMENT_FOR_KIND, REACT_PROP, type Scene, type SceneNode, rootAttrs, textAlternativeFor } from "../layout/scene";

// The JSX printer of source export (AD-002, AD-013): the second user of the node-to-element mapping
// in src/layout/scene.ts, after `SceneSvg` (src/react/SceneSvg.tsx). It has no table of its own, so
// the exported component prints the markup the package component prints (CPSE-NFR-001).

/** A PascalCase identifier: the shape every exported component name has (CPSE-REQ-024). */
export const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/;

// An element or attribute name as the shared tables give it. Checked anyway, so nothing but a name
// can reach a name position in the printed file.
const JSX_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;

const INDENT = "  ";

/**
 * Text as a JavaScript string literal: `JSON.stringify` escapes quotes, backslashes, C0 controls and
 * lone surrogates, and the plain-text policy's escapes cover the rest (line and paragraph
 * separators, C1 controls, direction controls, invisible characters). Caller text in the file is
 * only ever this, inside an expression container, never JSX text or a quoted attribute, so it is
 * data, never code (GSV TICKET-001 security review SEC-001).
 */
function literal(text: string): string {
  return escapeChars(JSON.stringify(text));
}

function name(text: string): string {
  if (!JSX_NAME.test(text)) throw new Error("printScene: not an element or attribute name");
  return text;
}

/** An attribute value as an expression container: a number as a number, as `SceneSvg` passes it, a string as a literal. */
function value(attr: AttrValue | string): string {
  if (typeof attr === "number") {
    if (!Number.isFinite(attr)) throw new Error("printScene: a number that is not finite");
    return `{${String(attr)}}`;
  }
  if (typeof attr !== "string") throw new Error("printScene: an attribute value that is neither a string nor a number");
  return `{${literal(attr)}}`;
}

/** A Scene attribute under the React prop `SceneSvg` gives it (`REACT_PROP`). */
function prop(attr: string): string {
  if (!Object.hasOwn(REACT_PROP, attr)) throw new Error("printScene: an attribute outside the Scene's set");
  return name(REACT_PROP[attr as keyof typeof REACT_PROP]);
}

/** One node and its children as lines: the element and children by node kind, exactly as `SceneSvg`'s `toElement`. */
function printNode(node: SceneNode, depth: number, lines: string[]): void {
  const indent = INDENT.repeat(depth);
  const tag = name(ELEMENT_FOR_KIND[node.kind]);
  const attrs = node.attrs.map(([attr, v]) => ` ${prop(attr)}=${value(v)}`).join("");
  if (node.kind === "text") {
    lines.push(`${indent}<${tag}${attrs}>{${literal(node.text)}}</${tag}>`);
  } else if ((node.kind === "group" || node.kind === "svg") && node.children.length > 0) {
    lines.push(`${indent}<${tag}${attrs}>`);
    for (const child of node.children) printNode(child, depth + 1, lines);
    lines.push(`${indent}</${tag}>`);
  } else {
    lines.push(`${indent}<${tag}${attrs} />`);
  }
}

/**
 * The header as a block comment. Each line goes through the same escapes as a string literal, so no
 * text can break a line or hide in it, and `*\/` is written `*\\/`, which closes no comment and
 * reads back as the same JSON (GSV TICKET-001 security review SEC-001).
 */
function comment(header: string): string {
  const lines = header.split("\n").map((line) => ` * ${escapeChars(line).replace(/\*\//g, "*\\/")}`.trimEnd());
  return `/*\n${lines.join("\n")}\n */\n`;
}

/**
 * A Scene as the source of one TypeScript React component file (AD-013): the header comment, then
 * `export function <name>() { return (<svg …>…</svg>); }`. The markup follows `SceneSvg` from the
 * same contract: `rootAttrs`, a first-child `<title>`, then each node with `ELEMENT_FOR_KIND` and
 * `REACT_PROP`, attributes in Scene order. The component takes no props and uses no hooks, so it
 * also works as a Server Component; it imports nothing, using the automatic JSX runtime. Throws on
 * a name that is not PascalCase or a malformed Scene; `exportSource` reports either as
 * `internal_error`.
 */
// @spec CPSE-REQ-019, CPSE-REQ-020, CPSE-REQ-021, CPSE-REQ-022, CPSE-REQ-023, CPSE-NFR-001
export function printScene(scene: Scene, componentName: string, header: string): string {
  if (!COMPONENT_NAME.test(componentName)) throw new Error("printScene: the component name is not a PascalCase identifier");
  // No caller text alternative: an exported component needs no inputs (CPSE-REQ-022).
  const accessibleName = textAlternativeFor(scene, undefined);
  const root = rootAttrs(scene, accessibleName)
    .map(([attr, v]) => ` ${name(attr)}=${value(v)}`)
    .join("");
  const lines: string[] = [`${INDENT.repeat(2)}<svg${root}>`, `${INDENT.repeat(3)}<title>{${literal(accessibleName)}}</title>`];
  for (const node of scene.nodes) printNode(node, 3, lines);
  lines.push(`${INDENT.repeat(2)}</svg>`);
  return `${comment(header)}export function ${componentName}() {\n${INDENT}return (\n${lines.join("\n")}\n${INDENT});\n}\n`;
}
