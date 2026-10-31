// Runs inside a fresh React project made by tests/smoke/run.ts, with the packed package installed
// from its tarball (CPSE-NFR-003; graph-library CPSE TICKET-004). Imports `@gener8v/graph-generator`
// and every entry point its exports map names, then server-renders every example through <Graph>
// and through the matching per-type component from that type's own entry. Fails on an import or
// render that throws, a fallback (an example the package finds invalid), markup that is not an
// <svg>, or a per-type component whose markup differs from <Graph>'s. Usage: node render.mjs <examples dir>
// @spec CPSE-NFR-003
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";

const PACKAGE = "@gener8v/graph-generator";
/** Entry points that are not a graph type. */
const NOT_A_TYPE = new Set(["core", "tool", "export"]);

const examplesDir = process.argv[2];
if (examplesDir === undefined) {
  console.error("usage: node render.mjs <examples dir>");
  process.exit(2);
}

const failures = [];
const fail = (message) => failures.push(message);
const describeError = (error) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

const manifest = JSON.parse(readFileSync(new URL(`./node_modules/${PACKAGE}/package.json`, import.meta.url), "utf8"));
// Every JavaScript entry point but the root: "./circle" → "circle"; the JSON files are not modules.
const subpaths = Object.keys(manifest.exports)
  .filter((key) => key !== "." && !key.endsWith(".json"))
  .map((key) => key.slice(2));

let root;
try {
  root = await import(PACKAGE);
} catch (error) {
  fail(`import ${PACKAGE}: ${describeError(error)}`);
}
if (root !== undefined && typeof root.Graph !== "function") fail(`${PACKAGE} exports no Graph component`);

/** Each graph type's component, from its own entry point. */
const typeComponents = new Map();
for (const subpath of subpaths) {
  let entry;
  try {
    entry = await import(`${PACKAGE}/${subpath}`);
  } catch (error) {
    fail(`import ${PACKAGE}/${subpath}: ${describeError(error)}`);
    continue;
  }
  if (NOT_A_TYPE.has(subpath)) continue;
  const component = Object.values(entry).find((value) => typeof value === "function" && value.graphType === subpath);
  if (component === undefined) fail(`${PACKAGE}/${subpath} exports no component for the ${subpath} type`);
  else typeComponents.set(subpath, component);
}

const examples = readdirSync(examplesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort();
if (examples.length === 0) fail(`no examples in ${examplesDir}`);

/** Renders `component` for `description` on the server; records a fallback, a throw or markup that is not an <svg>. */
function render(label, component, description) {
  const fallback = (issues) => {
    fail(`${label}: rendered the fallback: ${issues.map((issue) => `${issue.code} at ${issue.path}`).join("; ")}`);
    return null;
  };
  try {
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(component, { description, fallback }));
    if (!markup.startsWith("<svg")) fail(`${label}: markup is not an <svg>: ${markup.slice(0, 80)}`);
    return markup;
  } catch (error) {
    fail(`${label}: threw ${describeError(error)}`);
    return undefined;
  }
}

let rendered = 0;
for (const file of examples) {
  const description = JSON.parse(readFileSync(join(examplesDir, file), "utf8"));
  const viaGraph = root?.Graph === undefined ? undefined : render(`${file} through <Graph>`, root.Graph, description);
  const component = typeComponents.get(description.type);
  if (component === undefined) {
    fail(`${file}: no ${PACKAGE}/${description.type} entry point with its component`);
    continue;
  }
  const viaType = render(`${file} through ${component.displayName ?? description.type} from ${PACKAGE}/${description.type}`, component, description);
  if (viaGraph !== undefined && viaType !== undefined && viaGraph !== viaType) fail(`${file}: the per-type component's markup differs from <Graph>'s`);
  rendered++;
}

if (failures.length > 0) {
  console.error(`React ${React.version}: ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`React ${React.version}: imported ${PACKAGE} and its ${subpaths.length} other entry points; rendered ${rendered} of ${examples.length} examples through <Graph> and through each type's own component.`);
