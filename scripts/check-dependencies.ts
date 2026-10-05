import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const NOTES_HEADING = "## Runtime dependency notes";

/** Names listed with a non-empty justification in CONTRIBUTING.md's runtime dependency notes table. */
export function justifiedDependencies(contributing: string): Map<string, string> {
  const justified = new Map<string, string>();
  const start = contributing.indexOf(NOTES_HEADING);
  if (start === -1) return justified;
  const rest = contributing.slice(start + NOTES_HEADING.length);
  const end = rest.search(/^## /m);
  const section = end === -1 ? rest : rest.slice(0, end);
  for (const line of section.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    // | `name` | justification |  →  ["", "`name`", "justification", ""]
    if (cells.length < 4) continue;
    const name = cells[1]?.replace(/`/g, "") ?? "";
    const why = cells[2] ?? "";
    if (!name || name === "Package" || /^-+$/.test(name) || !why) continue;
    justified.set(name, why);
  }
  return justified;
}

/**
 * Every runtime dependency must be justified in CONTRIBUTING.md; the React peer is the only
 * dependency the package expects. Returns one message per unjustified dependency.
 */
export interface PackageDependencies {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  bundleDependencies?: string[] | boolean;
  bundledDependencies?: string[] | boolean;
}

/** The React peer is the one runtime dependency the package is expected to have. */
export const EXPECTED_PEERS = new Set(["react"]);

/** Every name that reaches a consumer at runtime: dependencies, optional, bundled and non-React peers. */
export function runtimeDependencies(pkg: PackageDependencies): string[] {
  const bundled = [pkg.bundleDependencies, pkg.bundledDependencies].flatMap((value) =>
    Array.isArray(value) ? value : value === true ? Object.keys(pkg.dependencies ?? {}) : [],
  );
  const names = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}).filter((name) => !EXPECTED_PEERS.has(name)),
    ...bundled,
  ];
  return [...new Set(names)];
}

// @spec CPSE-NFR-007
export function checkDependencies(pkg: PackageDependencies, contributing: string): string[] {
  const justified = justifiedDependencies(contributing);
  return runtimeDependencies(pkg)
    .filter((name) => !justified.has(name))
    .map(
      (name) =>
        `Runtime dependency "${name}" has no justification under "${NOTES_HEADING}" in CONTRIBUTING.md (CPSE-NFR-007).`,
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const errors = checkDependencies(pkg, readFileSync("CONTRIBUTING.md", "utf8"));
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  const count = runtimeDependencies(pkg).length;
  console.log(`Runtime dependencies: ${count}, all justified.`);
}
