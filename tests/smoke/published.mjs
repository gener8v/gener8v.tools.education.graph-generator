// Checks the version of @gener8v/graph-generator that the release workflow just published, as a
// user gets it from the npm registry (CPSE-REQ-047 to CPSE-REQ-052; change release-install-check).
// In a fresh temporary project it installs React from the react19 smoke template's lockfile, waits
// for the exact version to be installable, installs it as a saved dependency with no lifecycle
// scripts, checks the registry signatures and provenance attestations of every installed package
// (this one included), runs the installed `export` command on examples/circle.json, and runs
// tests/smoke/render.mjs with the entry points named in the checked-out package.json, which imports
// every one of them and renders every example.
// Usage: node tests/smoke/published.mjs <version>   (for example 0.1.0; `pnpm test:published 0.1.0`)
// Exits 0 when every check passes, 1 naming the version and the failed step, 2 on a bad argument.
// Plain Node with node: built-ins only, so the release job needs no install of the repository.
// npm runs against the public registry with none of the caller's npm configuration. The check runs
// the published package's code with the caller's privileges: on your own machine, use a throwaway
// environment for a release you suspect.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
/** npm's errors for a package or version the registry does not serve (yet); any other error fails at once. */
const NOT_YET_PUBLISHED = /\b(E404|ETARGET|notarget)\b/;
/** The predicate type of the provenance attestation the release workflow publishes. */
const SLSA_PROVENANCE = "https://slsa.dev/provenance/v1";

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

/** The public registry; the check tests what users get from it, whatever the caller's npm configuration says. */
const PUBLIC_REGISTRY = "https://registry.npmjs.org/";
/** The environment every command runs with; set by `isolateNpm` before the first one. */
let environment = process.env;

/**
 * Makes every later npm and npx call use the public registry and no configuration of the caller's:
 * an empty user and global npmrc in `work`, and none of the caller's `npm_config_*` variables, so a
 * scoped registry or a mirror set up for other work cannot decide what is installed (security review SEC-003).
 */
// @spec CPSE-REQ-047
function isolateNpm(work) {
  // Two files: npm refuses to load one file as both the user and the global configuration.
  const [userconfig, globalconfig] = ["user.npmrc", "global.npmrc"].map((name) => join(work, name));
  for (const file of [userconfig, globalconfig]) writeFileSync(file, "");
  const inherited = Object.entries(process.env).filter(([name]) => !/^npm_config_/i.test(name));
  environment = { ...Object.fromEntries(inherited), npm_config_userconfig: userconfig, npm_config_globalconfig: globalconfig, npm_config_registry: PUBLIC_REGISTRY };
}

/** Runs a command with an argument array (never a shell), capturing its output; returns stdout. */
function run(step, command, args, cwd, timeout = NPM_TIMEOUT_MS) {
  try {
    return execFileSync(command, args, { cwd, timeout, env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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

/**
 * Installs exactly `version` from the registry with no scripts, as a saved dependency so that npm
 * audits it (an extraneous package is skipped) and React stays on the template's lockfile. Tries
 * again every 15 s for at most 10 minutes while the registry does not serve the version yet; any
 * other install error fails at once.
 */
// @spec CPSE-REQ-047, CPSE-REQ-052
async function installFromRegistry(work, version) {
  const step = "install from the registry";
  const args = ["install", "--save-exact", "--no-audit", "--no-fund", "--ignore-scripts", `${PACKAGE}@${version}`];
  const deadline = Date.now() + INSTALL_DEADLINE_MS;
  for (;;) {
    try {
      run(step, "npm", args, work);
      return;
    } catch (error) {
      if (!NOT_YET_PUBLISHED.test(error.message)) throw error;
      if (Date.now() + INSTALL_RETRY_MS >= deadline) {
        throw new StepFailure(step, `not installable within ${INSTALL_DEADLINE_MS / 60_000} minutes: ${error.message}`);
      }
      console.warn(`${PACKAGE}@${version} is not installable yet (${messageOf(error)}); trying again in ${INSTALL_RETRY_MS / 1000} s`);
      await sleep(INSTALL_RETRY_MS);
    }
  }
}

/**
 * Requires the registry signatures and attestations of every installed package to verify, this
 * package included: npm must audit as many packages as the lockfile holds, and the registry must
 * list this version's provenance attestation, which `npm audit signatures` then verified.
 */
// @spec CPSE-REQ-048
function verifySignatures(work, version) {
  const step = "verify signatures";
  let installed;
  try {
    installed = Object.keys(JSON.parse(readFileSync(join(work, "package-lock.json"), "utf8")).packages).filter((key) => key !== "").length;
  } catch (error) {
    throw new StepFailure(step, `cannot count the installed packages in package-lock.json: ${messageOf(error)}`);
  }
  const output = run(step, "npm", ["audit", "signatures"], work);
  console.log(output.trimEnd());
  const audited = Number(/audited (\d+) packages?/.exec(output)?.[1]);
  if (audited !== installed) throw new StepFailure(step, `npm audited ${audited} packages, but ${installed} are installed`);
  const signed = Number(/(\d+) packages? ha(?:s|ve) verified registry signatures?/.exec(output)?.[1]);
  if (signed !== installed) throw new StepFailure(step, `${signed} of ${installed} installed packages have verified registry signatures`);
  if (!VERIFIED_ATTESTATIONS.test(output)) throw new StepFailure(step, "npm audit signatures reported no verified attestation");
  const predicateType = run(step, "npm", ["view", `${PACKAGE}@${version}`, "dist.attestations.provenance.predicateType"], work).trim();
  if (predicateType !== SLSA_PROVENANCE) throw new StepFailure(step, `the registry lists no ${SLSA_PROVENANCE} attestation for this version (found "${predicateType}")`);
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

/**
 * Imports every public entry point and renders every example. The entry points expected are those of
 * the checked-out repository's package.json, the release's own source, so render.mjs fails when the
 * installed package lacks one or has one more (quality review QR-001).
 */
// @spec CPSE-REQ-050
function importEntryPoints(work, version) {
  const step = "import and render";
  let source;
  try {
    source = JSON.parse(readFileSync(join(repository, "package.json"), "utf8"));
  } catch (error) {
    throw new StepFailure(step, `cannot read the repository's package.json: ${messageOf(error)}`);
  }
  if (source.version !== version) {
    throw new StepFailure(step, `the checked-out package.json is version ${source.version}; check out the tag v${version} to check ${version}`);
  }
  const expected = Object.keys(source.exports);
  const output = run(step, "node", ["render.mjs", join(repository, "examples"), JSON.stringify(expected)], work);
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
    isolateNpm(work);
    installReact(work);
    await installFromRegistry(work, version);
    verifySignatures(work, version);
    runExport(work);
    importEntryPoints(work, version);
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
