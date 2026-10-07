import { REACT_PROP, SCENE_WIDTH, type Scene, type SceneNode } from "../scene";

// Attributes whose strings are colors or font names, where digits are not coordinates.
const NON_NUMERIC_STRINGS = new Set(["fill", "stroke", "font-family"]);
const NUMBER_TOKEN = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const REFERENCE = /url\s*\(/i;

const KIND_SHAPES: Readonly<Record<SceneNode["kind"], "shape" | "text" | "container">> = {
  line: "shape",
  polyline: "shape",
  polygon: "shape",
  path: "shape",
  circle: "shape",
  ellipse: "shape",
  rect: "shape",
  text: "text",
  group: "container",
  svg: "container",
};

const isRounded = (n: number) => Number.isFinite(n) && Math.round(n * 100) / 100 === n && !Object.is(n, -0);

/** Problems with the numbers written inside a string attribute value, if any. */
function stringProblems(value: string): string[] {
  const problems: string[] = [];
  if (REFERENCE.test(value)) problems.push(`references another resource (${JSON.stringify(value)}); AD-008`);
  for (const token of value.match(NUMBER_TOKEN) ?? []) {
    if (/e/i.test(token)) problems.push(`has a number in exponent form (${token})`);
    else if ((token.split(".")[1] ?? "").length > 2) problems.push(`has a number with more than 2 decimals (${token}); use fmt()`);
  }
  return problems;
}

function checkNode(node: SceneNode, path: string, problems: string[]): void {
  const shape = KIND_SHAPES[node.kind];
  if (shape === undefined) {
    problems.push(`${path}: unknown kind ${JSON.stringify(node.kind)}`);
    return;
  }
  const hasText = "text" in node;
  const hasChildren = "children" in node;
  if (shape === "text" && (!hasText || typeof node.text !== "string")) problems.push(`${path}: a text node needs text`);
  if (shape !== "text" && hasText) problems.push(`${path}: only a text node may have text`);
  if (shape === "container" && (!hasChildren || !Array.isArray(node.children))) problems.push(`${path}: a ${node.kind} node needs children`);
  if (shape !== "container" && hasChildren) problems.push(`${path}: only a group or svg node may have children`);

  const seen = new Set<string>();
  node.attrs.forEach(([name, value], i) => {
    const where = `${path}.attrs[${i}] (${name})`;
    if (!Object.hasOwn(REACT_PROP, name)) problems.push(`${where}: not a Scene attribute`);
    if (seen.has(name)) problems.push(`${where}: repeated attribute`);
    seen.add(name);
    if (typeof value === "number") {
      if (!isRounded(value)) problems.push(`${where}: ${value} has not been through fmt()`);
    } else if (typeof value !== "string") {
      problems.push(`${where}: value is neither a string nor a number`);
    } else {
      if (REFERENCE.test(value) || !NON_NUMERIC_STRINGS.has(name)) {
        for (const problem of stringProblems(value)) problems.push(`${where}: ${problem}`);
      }
    }
  });

  if (shape === "container" && Array.isArray((node as { children?: unknown }).children)) {
    (node as { children: readonly SceneNode[] }).children.forEach((child, i) => checkNode(child, `${path}.children[${i}]`, problems));
  }
}

/**
 * Every way a Scene can break the drawing contract that the types cannot rule out: numbers that
 * skipped `fmt()` (including numbers written inside strings such as `d`, `transform` or
 * `viewBox`), `url(…)` references (AD-008), repeated attributes, and `text` or `children` on the
 * wrong kind of node. Returns one message per problem; an empty list means the Scene is sound.
 * Every layout test runs it on the Scenes it produces (AD-007, prd/TC-002).
 */
// @spec CPSE-REQ-011
export function checkScene(scene: Scene): string[] {
  const problems: string[] = [];
  if (scene.width !== SCENE_WIDTH) problems.push(`width: must be ${SCENE_WIDTH}, got ${scene.width}`);
  if (!isRounded(scene.height) || scene.height <= 0) problems.push(`height: ${scene.height} must be positive and through fmt()`);
  scene.nodes.forEach((node, i) => checkNode(node, `nodes[${i}]`, problems));
  return problems;
}
