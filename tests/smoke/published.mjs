// Checks the version of @gener8v/graph-generator that the release workflow just published, as a
// user gets it from the npm registry (CPSE-REQ-047 to CPSE-REQ-052; change release-install-check).
// In a fresh temporary project it installs React from the react19 smoke template's lockfile, waits
// for the exact version to be installable, installs it with no lifecycle scripts, checks the
// registry signatures and provenance attestations, runs the installed `export` command on
// examples/circle.json, and runs tests/smoke/render.mjs with the entry points named in the
// installed package.json, which imports every one of them and renders every example.
// Usage: node tests/smoke/published.mjs <version>   (for example 0.1.0; `pnpm test:published 0.1.0`)
// Exits 0 when every check passes, 1 naming the version and the failed step, 2 on a bad argument.
// Plain Node with node: built-ins only, so the release job needs no install of the repository.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = "@gener8v/graph-generator";
/** A strict semantic version, so the argument is safe to pass on to npm. */
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
/** How often to try the registry again while the new version is not installable yet. */
const INSTALL_RETRY_MS = 15_000;
/** The most time to wait for the registry to serve the new version: 10 minutes. */
const INSTALL_DEADLINE_MS = 600_000;
/** How long one npm call may take. */
const NPM_TIMEOUT_MS = 180_000;
const VERIFIED_ATTESTATIONS = /\d+ packages? (has a verified attestation|have verified attestations)/;

const here = fileURLToPath(new URL(".", import.meta.url));
const repository = fileURLToPath(new URL("../..", import.meta.url));

/** Thrown by a step; carries the step's name for the failure message. */
class StepFailure extends Error {
  constructor(step, reason) {
    super(reason);
    this.step = step;
  }
}

const messageOf = (error) => (error instanceof Error ? error.message.split("\n")[0] : String(error));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs a command with an argument array (never a shell), capturing its output; returns stdout. */
function run(step, command, args, cwd, timeout = NPM_TIMEOUT_MS) {
  try {
    return execFileSync(command, args, { cwd, timeout, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = [error.stderr, error.stdout].filter((text) => typeof text === "string" && text.trim() !== "").join("\n").trim();
    throw new StepFailure(step, detail === "" ? messageOf(error) : `${messageOf(error)}\n${detail}`);
  }
}

/** Copies the react19 template and render.mjs into `work` and installs React from the lockfile. */
function installReact(work) {
  const step = "install React";
  try {
    for (const file of ["package.json", "package-lock.json"]) copyFileSync(join(here, "react19", file), join(work, file));
    copyFileSync(join(here, "render.mjs"), join(work, "render.mjs"));
  } catch (error) {
    throw new StepFailure(step, messageOf(error));
  }
  run(step, "npm", ["ci", "--no-audit", "--no-fund", "--ignore-scripts"], work);
}

/** Installs exactly `version` from the registry with no scripts, trying again every 15 s for at most 10 minutes. */
// @spec CPSE-REQ-047, CPSE-REQ-052
async function installFromRegistry(work, version) {
  const step = "install from the registry";
  const args = ["install", "--no-save", "--no-audit", "--no-fund", "--ignore-scripts", "--package-lock=false", `${PACKAGE}@${version}`];
  const deadline = Date.now() + INSTALL_DEADLINE_MS;
  for (;;) {
    try {
      run(step, "npm", args, work);
      return;
    } catch (error) {
      if (Date.now() + INSTALL_RETRY_MS >= deadline) {
        throw new StepFailure(step, `not installable within ${INSTALL_DEADLINE_MS / 60_000} minutes: ${error.message}`);
      }
      console.warn(`${PACKAGE}@${version} is not installable yet (${messageOf(error)}); trying again in ${INSTALL_RETRY_MS / 1000} s`);
      await sleep(INSTALL_RETRY_MS);
    }
  }
}

/** Requires the registry signatures and provenance attestations of the installed packages to verify. */
// @spec CPSE-REQ-048
function verifySignatures(work) {
  const step = "verify signatures";
  const output = run(step, "npm", ["audit", "signatures"], work);
  console.log(output.trimEnd());
  if (!VERIFIED_ATTESTATIONS.test(output)) throw new StepFailure(step, "npm audit signatures reported no verified attestation");
}

/** Runs the installed `export` command on a sample and requires a non-empty component file. */
// @spec CPSE-REQ-049
function runExport(work) {
  const step = "export command";
  const out = join(work, "CircleGraph.tsx");
  run(step, "npx", ["--no-install", PACKAGE, "export", join(repository, "examples", "circle.json"), "--out", out], work);
  if (!existsSync(out) || statSync(out).size === 0) throw new StepFailure(step, "it wrote no component file, or an empty one");
  if (!/export (default )?function\b/.test(readFileSync(out, "utf8"))) throw new StepFailure(step, "the file it wrote exports no component function");
}

/** Imports every entry point named in the installed package.json, and renders every example. */
// @spec CPSE-REQ-050
function importEntryPoints(work) {
  const step = "import and render";
  let entries;
  try {
    const manifest = JSON.parse(readFileSync(join(work, "node_modules", PACKAGE, "package.json"), "utf8"));
    entries = Object.keys(manifest.exports);
  } catch (error) {
    throw new StepFailure(step, `cannot read the installed package.json exports: ${messageOf(error)}`);
  }
  const output = run(step, "node", ["render.mjs", join(repository, "examples"), JSON.stringify(entries)], work);
  console.log(output.trimEnd());
}

/** Runs every check in a temporary project; returns the process exit status. */
// @spec CPSE-REQ-051
async function main(argv) {
  const version = argv[0];
  if (argv.length !== 1 || !VERSION_PATTERN.test(version)) {
    console.error("usage: node tests/smoke/published.mjs <version>   (a version like 0.1.0, not a tag or a range)");
    return 2;
  }
  const work = mkdtempSync(join(tmpdir(), "graph-generator-published-"));
  try {
    installReact(work);
    await installFromRegistry(work, version);
    verifySignatures(work);
    runExport(work);
    importEntryPoints(work);
    console.log(`${PACKAGE}@${version} passed every check: it installs from the registry, its signatures verify, the export command works and every entry point imports and renders.`);
    return 0;
  } catch (error) {
    const step = error instanceof StepFailure ? error.step : "unexpected error";
    console.error(`${PACKAGE}@${version}: ${step} failed: ${messageOf(error)}`);
    if (error instanceof StepFailure && error.message.includes("\n")) console.error(error.message.split("\n").slice(1).join("\n"));
    return 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

process.exitCode = await main(process.argv.slice(2));
