import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_TYPES } from "../../src/core/definitions/types";

// CPSE-NFR-003: the packed package installs into a fresh React project and renders every
// documented example, on each supported React major (graph-library CPSE TICKET-004). Packs the
// package with `pnpm pack`, copies each template (tests/smoke/react18/, tests/smoke/react19/: a
// package.json with exact React versions) and tests/smoke/render.mjs into a fresh temporary
// directory, installs the tarball there with npm from the registry, and runs render.mjs with Node,
// passing it the entry points the package must publish (`PUBLISHED_EXPORTS`), so an entry dropped
// from package.json's exports fails here too (CPSE TICKET-004 code review CR-004).
// Builds first unless GRAPH_GENERATOR_PREBUILT=1 and dist/ exists, as the test setup does.
// Exits non-zero, naming what failed, when any project fails to install or render.
// @spec CPSE-NFR-003

const root = fileURLToPath(new URL("../..", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));
/** One fresh project per supported React major. */
const TEMPLATES = ["react18", "react19"] as const;

/**
 * The exports map's keys the installed package must have, exactly: the entry component, the core,
 * tool and export entries, one entry per graph type in `GRAPH_TYPES` (AD-001), and the JSON files.
 * Fixed here, not read from the package.json under test, so removing an entry fails.
 */
const PUBLISHED_EXPORTS: readonly string[] = [".", "./core", "./tool", "./export", ...GRAPH_TYPES.map((type) => `./${type}`), "./schema.json", "./vocabulary.json", "./package.json"];

const run = (command: string, args: readonly string[], cwd: string) => execFileSync(command, args, { cwd, stdio: "inherit" });

function main(): number {
  if (process.env.GRAPH_GENERATOR_PREBUILT !== "1" || !existsSync(join(root, "dist", "index.js"))) run("pnpm", ["build"], root);

  const work = mkdtempSync(join(tmpdir(), "graph-generator-smoke-"));
  const failures: string[] = [];
  try {
    run("pnpm", ["pack", "--pack-destination", work], root);
    const tarballs = readdirSync(work).filter((file) => file.endsWith(".tgz"));
    if (tarballs.length !== 1) throw new Error(`pnpm pack made ${tarballs.length} tarballs in ${work}`);
    const tarball = join(work, tarballs[0]!);

    for (const template of TEMPLATES) {
      const project = join(work, template);
      cpSync(join(here, template), project, { recursive: true });
      copyFileSync(join(here, "render.mjs"), join(project, "render.mjs"));
      console.log(`\n${template}: installing ${tarballs[0]} into a fresh project`);
      try {
        // No install scripts: the package has none, and React's need none.
        run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--package-lock=false", tarball], project);
      } catch {
        failures.push(`${template}: npm install failed`);
        continue;
      }
      try {
        run(process.execPath, ["render.mjs", join(root, "examples"), JSON.stringify(PUBLISHED_EXPORTS)], project);
      } catch {
        failures.push(`${template}: rendering the examples failed (see above)`);
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`\nSmoke check failed:\n${failures.map((failure) => `  - ${failure}`).join("\n")}`);
    return 1;
  }
  console.log(`\nSmoke check passed: ${TEMPLATES.join(", ")}.`);
  return 0;
}

process.exitCode = main();
