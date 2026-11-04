import { ELEMENT_FOR_KIND, REACT_PROP, type Scene, type SceneNode, rootAttrs, textAlternativeFor } from "../layout/scene";

// The JSX printer of source export (AD-002, AD-013): the second user of the node-to-element mapping
// in src/layout/scene.ts, after `SceneSvg` (src/react/SceneSvg.tsx). It has no table of its own, so
// the exported component prints the markup the package component prints (CPSE-NFR-001).

/** A PascalCase identifier: the shape every exported component name has (CPSE-REQ-024). */
export const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/;

// An element or attribute name as the shared tables give it. Checked anyway, so nothing but a name
// can reach a name position in the printed file.
const JSX_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;

const INDENT = "  ";

// Every UTF-16 unit the printed file writes as a `\u` escape: all but printable ASCII, so the file
// is ASCII and nothing invisible, line-breaking or reordering hides in it (security review SEC-003),
// and the at sign, which starts every directive a compiler or tool reads from a comment (the JSX
// pragmas jsxImportSource, jsx, jsxFrag and jsxRuntime, TypeScript's ts-nocheck, a test runner's
// environment, a license marker), so no caller text can form one (security review SEC-001). This
// comment names them without it. Without the `u` flag, a surrogate pair is two units, two escapes.
const ESCAPED = /[^\x20-\x3f\x41-\x7e]/g;

/** Text with every `ESCAPED` unit as `\uXXXX`: the same string in a JavaScript or JSON string literal. */
function ascii(text: string): string {
  return text.replace(ESCAPED, (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/**
 * Text as a JavaScript string literal: `JSON.stringify` escapes quotes, backslashes, C0 controls and
 * lone surrogates, and `ascii` the rest. Caller text in the file is only ever this, inside an
 * expression container, never JSX text or a quoted attribute, so it is data, never code (GSV
 * TICKET-001 security review SEC-001).
 */
function literal(text: string): string {
  return ascii(JSON.stringify(text));
}

function name(text: unknown): string {
  // `typeof` first: `test` would read `undefined`, a missing table entry, as the name "undefined".
  if (typeof text !== "string" || !JSX_NAME.test(text)) throw new Error("printScene: not an element or attribute name");
  return text;
}

/** The element `SceneSvg` draws a node kind as (`ELEMENT_FOR_KIND`), own entries only. */
function element(kind: string): string {
  if (!Object.hasOwn(ELEMENT_FOR_KIND, kind)) throw new Error("printScene: a node kind with no element");
  return name(ELEMENT_FOR_KIND[kind as keyof typeof ELEMENT_FOR_KIND]);
}

/**
 * An attribute value as an expression container: a number as a number, as `SceneSvg` passes it, a
 * string as a literal. Typed `unknown` because the Scene is checked, not trusted: anything else is
 * refused at run time.
 */
function value(attr: unknown): string {
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
  const tag = element(node.kind);
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
 * The header as a block comment. Each line goes through `ascii`, so no text can break a line, hide
 * in it or form a compiler directive (no at sign is left), and `*\/` is written `*\\/`, which closes no
 * comment. Inside the description's JSON both are escapes, so it reads back as the same JSON (GSV
 * TICKET-001 security review SEC-001; CPSE TICKET-005 security review SEC-001). Every line starts
 * ` * `, so no caller text starts a line.
 */
function comment(header: string): string {
  const lines = header.split("\n").map((line) => ` * ${ascii(line).replace(/\*\//g, "*\\/")}`.trimEnd());
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
