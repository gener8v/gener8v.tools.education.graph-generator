import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CATEGORIES } from "../../scripts/changelog-categories";

type Step = { name?: string; uses?: string; run?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, unknown> };
type Job = {
  name?: string;
  if?: string;
  needs?: string | string[];
  "runs-on"?: string;
  permissions?: Record<string, string>;
  environment?: unknown;
  env?: Record<string, unknown>;
  steps: Step[];
};
type Triggers = {
  push?: { branches?: string[]; tags?: string[] };
  workflow_dispatch?: { inputs?: Record<string, { type?: string; default?: unknown }> };
};
type Workflow = { on: Triggers; permissions?: Record<string, string>; env?: Record<string, unknown>; jobs: Record<string, Job> };
type CompositeAction = { inputs: Record<string, { required?: boolean; default?: string }>; runs: { using: string; steps: Step[] } };

const files = {
  release: ".github/workflows/release.yml",
  ci: ".github/workflows/ci.yml",
  docs: ".github/workflows/docs.yml",
  setup: ".github/actions/setup/action.yml",
};
const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, readFileSync(file, "utf8")])) as Record<keyof typeof files, string>;
const release = parse(text.release) as Workflow;
const ci = parse(text.ci) as Workflow;
const docs = parse(text.docs) as Workflow;
const setup = parse(text.setup) as CompositeAction;
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const SETUP = "./.github/actions/setup";
const PACKAGE_URL = "https://www.npmjs.com/package/@gener8v/graph-generator";

const job = (name: string): Job => {
  const found = release.jobs[name];
  if (found === undefined) throw new Error(`release.yml has no job "${name}"`);
  return found;
};
const step = (jobName: string, name: string): Step => {
  const found = job(jobName).steps.find((s) => s.name === name);
  if (found === undefined) throw new Error(`release.yml job "${jobName}" has no step "${name}"`);
  return found;
};
const runs = (j: Job): string[] => j.steps.flatMap((s) => (s.run === undefined ? [] : [s.run]));
const indexOfRun = (jobName: string, pattern: RegExp): number => {
  const index = job(jobName).steps.findIndex((s) => s.run !== undefined && pattern.test(s.run));
  if (index === -1) throw new Error(`release.yml job "${jobName}" runs nothing matching ${pattern}`);
  return index;
};
const indexOfSetup = (jobName: string): number => job(jobName).steps.findIndex((s) => s.uses === SETUP);
const allJobs = (): [string, Job][] => [release, ci, docs].flatMap((w) => Object.entries(w.jobs));
const allSteps = (): Step[] => [...allJobs().flatMap(([, j]) => j.steps), ...setup.runs.steps];

const ON_MAIN = 'git merge-base --is-ancestor "$GITHUB_SHA" origin/main';

// @spec CPSE-NFR-008
describe("release workflow (CPSE-NFR-008, prd/OC-002, prd/IC-003)", () => {
  it("has exactly the version-pr, checks, publish, verify-provenance, install-check and dry-run jobs", () => {
    expect(Object.keys(release.jobs).sort()).toEqual(["checks", "dry-run", "install-check", "publish", "verify-provenance", "version-pr"]);
    for (const [name, j] of Object.entries(release.jobs)) {
      expect(j["runs-on"], name).toBe("ubuntu-latest");
      expect(j.steps.length, name).toBeGreaterThan(0);
    }
  });

  it("runs npm publish only in publish, with --provenance, and in dry-run, with --dry-run (QR-002)", () => {
    const publishes = Object.entries(release.jobs).flatMap(([name, j]) =>
      runs(j).flatMap((run) => run.split("\n").filter((line) => /\bnpm publish\b/.test(line)).map((line) => [name, line.trim()] as const)),
    );
    expect(publishes).toEqual([
      ["publish", "npm publish --provenance --access public"],
      ["dry-run", "npm publish --dry-run --provenance=false --access public"],
    ]);
    for (const s of [...setup.runs.steps, ...Object.values(ci.jobs).flatMap((j) => j.steps), ...Object.values(docs.jobs).flatMap((j) => j.steps)]) {
      expect(s.run ?? "").not.toMatch(/\bnpm publish\b/);
    }
  });

  it("grants id-token: write to the publish job alone, and read-only access at the top", () => {
    expect(release.permissions).toEqual({ contents: "read" });
    expect(job("publish").permissions).toEqual({ contents: "read", "id-token": "write" });
    expect(job("verify-provenance").permissions).toEqual({ contents: "read" });
    expect(job("install-check").permissions).toEqual({ contents: "read" });
    expect(job("version-pr").permissions).toEqual({ contents: "write", "pull-requests": "write" });
    expect(job("checks").permissions).toBeUndefined();
    expect(job("dry-run").permissions).toBeUndefined();
    // Every job is listed above, so no other job can hold id-token.
    expect(Object.keys(release.jobs)).toHaveLength(6);
  });

  it("publishes in the protected npm environment, and no other job names an environment (SEC-001)", () => {
    expect(job("publish").environment).toEqual({ name: "npm", url: PACKAGE_URL });
    for (const [name, j] of Object.entries(release.jobs)) if (name !== "publish") expect(j.environment, name).toBeUndefined();
  });

  it("publishes only on a pushed version tag with NPM_PUBLISH_ENABLED, never from a manual run (SEC-003)", () => {
    expect(job("publish").if).toBe("github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v') && vars.NPM_PUBLISH_ENABLED == 'true'");
    expect(job("publish").needs).toBe("checks");
    expect(job("verify-provenance").needs).toBe("publish");
    expect(job("install-check").needs).toBe("verify-provenance");
    expect(release.on.push?.tags).toEqual(["v*"]);
  });

  it("fails early, before installing anything, unless the tagged commit is on main (SEC-001, CR-006, QR-001)", () => {
    for (const name of ["checks", "publish"]) {
      const steps = job(name).steps;
      expect(steps[0]?.uses, name).toMatch(/^actions\/checkout@/);
      expect(steps[0]?.with?.["fetch-depth"], name).toBe(0);
      const onMain = step(name, "The tagged commit is on main");
      expect(onMain.run, name).toContain(ON_MAIN);
      expect(steps.indexOf(onMain), name).toBe(1);
      expect(indexOfSetup(name), name).toBeGreaterThan(1);
    }
    // In checks only a tag push is checked; a manual dry run may come from any branch.
    expect(step("checks", "The tagged commit is on main").if).toBe("github.event_name == 'push'");
    expect(step("publish", "The tagged commit is on main").if).toBeUndefined();
    const tagCheck = job("publish").steps.indexOf(step("publish", "The tag matches the package version"));
    expect(step("publish", "The tag matches the package version").run).toMatch(/"\$GITHUB_REF_NAME" != "v\$version"/);
    expect(tagCheck).toBeLessThan(indexOfSetup("publish"));
  });

  it("never puts an expression inside a run script; event values arrive as environment variables", () => {
    for (const s of allSteps()) expect(s.run ?? "", s.name).not.toContain("${{");
  });

  it("holds no long-lived npm token: the only one is the first-version bootstrap secret, in the publish step (SEC-006)", () => {
    expect([...text.release.matchAll(/secrets\.(\w+)/g)].map((match) => match[1])).toEqual(["GITHUB_TOKEN", "NPM_BOOTSTRAP_TOKEN"]);
    for (const other of [text.ci, text.docs, text.setup]) expect(other).not.toMatch(/secrets\.|NPM_TOKEN|NODE_AUTH_TOKEN|registry-url|_authToken/);

    const publishStep = step("publish", "Publish with provenance");
    expect(job("publish").environment).toMatchObject({ name: "npm" });
    expect(publishStep.env).toEqual({ NODE_AUTH_TOKEN: "${{ secrets.NPM_BOOTSTRAP_TOKEN }}" });
    // The registry credential is configured only when the bootstrap secret is present.
    expect(publishStep.run).toMatch(/^if \[ -n "\$NODE_AUTH_TOKEN" \]; then\n[\s\S]*_authToken=\$\{NODE_AUTH_TOKEN\}[\s\S]*\nfi\nnpm publish --provenance --access public\n$/);

    for (const [name, j] of Object.entries(release.jobs)) {
      expect(JSON.stringify({ ...j, steps: [] }), name).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN|registry-url|_authToken/);
      for (const s of j.steps) {
        if (s === publishStep) continue;
        expect(JSON.stringify(s), `${name}: ${s.name ?? s.uses}`).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN|registry-url|_authToken/);
      }
    }
    expect(release.env).toBeUndefined();
    // The built-in token is read once, by the version pull request.
    expect(job("version-pr").steps.find((s) => s.uses?.startsWith("changesets/action@"))?.env).toEqual({ GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" });
  });

  it("runs every check CI runs in checks, the smoke and browser checks there and not in publish (CR-004)", () => {
    const checks = runs(job("checks"));
    const ciChecks = Object.values(ci.jobs)
      .flatMap((j) => runs(j))
      .filter((run) => /^pnpm [\w:-]+( .*)?$/.test(run) && !run.startsWith("pnpm add "));
    expect(ciChecks.length).toBeGreaterThan(10);
    for (const run of ciChecks) expect(checks, run).toContain(run);
    for (const run of ["pnpm check:dist", "pnpm check:deps", "pnpm check:images", "pnpm check:changesets", "pnpm bench"]) expect(checks).toContain(run);
    for (const run of ["pnpm test:smoke", "pnpm test:e2e", "pnpm exec playwright install --with-deps chromium webkit"]) expect(checks).toContain(run);
    expect(runs(job("publish")).join("\n")).not.toMatch(/smoke|e2e|playwright|pnpm test|pnpm bench/);
  });

  it("checks the build it publishes, after building and before publishing (SEC-004)", () => {
    const build = indexOfRun("publish", /^pnpm build$/);
    const scan = indexOfRun("publish", /^pnpm check:dist$/);
    const lint = indexOfRun("publish", /^pnpm publint$/);
    const publish = indexOfRun("publish", /npm publish --provenance/);
    expect(build).toBeLessThan(scan);
    expect(scan).toBeLessThan(publish);
    expect(build).toBeLessThan(lint);
    expect(lint).toBeLessThan(publish);
  });

  it("uses no cache in the jobs that hold a credential (SEC-002)", () => {
    for (const name of ["publish", "version-pr", "verify-provenance", "install-check"]) {
      for (const s of job(name).steps) {
        if (s.uses === SETUP) expect(s.with, name).toEqual({ cache: false });
        else if (s.uses?.startsWith("actions/setup-node@")) {
          expect(s.with?.cache, name).toBeUndefined();
          expect(s.with?.["package-manager-cache"], name).toBe(false);
        } else expect(s.with?.cache, `${name}: ${s.name ?? s.uses}`).toBeUndefined();
        expect(s.uses ?? "", name).not.toMatch(/^actions\/cache/);
      }
    }
    // The composite action caches only when asked to, and turns setup-node's own caching off otherwise.
    expect(setup.inputs.cache?.required).toBe(true);
    const setupNode = setup.runs.steps.filter((s) => s.uses?.startsWith("actions/setup-node@"));
    expect(setupNode.map((s) => s.if)).toEqual(["inputs.cache == 'true'", "inputs.cache != 'true'"]);
    expect(setupNode[0]?.with?.cache).toBe("pnpm");
    expect(setupNode[1]?.with?.cache).toBeUndefined();
    expect(setupNode[1]?.with?.["package-manager-cache"]).toBe(false);
  });

  it("verifies the provenance in its own job with no id-token: installs without scripts and checks whose attestation it is (SEC-005, CR-005)", () => {
    const verify = job("verify-provenance");
    expect(verify.steps.some((s) => s.uses?.startsWith("actions/checkout@"))).toBe(false);
    const script = runs(verify).join("\n");
    expect(script).toContain('npm view "$PACKAGE@$version" dist.attestations --json');
    expect(script).toMatch(/npm install --ignore-scripts --omit=peer [^\n]*"\$PACKAGE@\$version"/);
    expect(script).toContain("npm audit signatures");
    expect(script).not.toMatch(/\|\| true|2>\s*\/dev\/null/);
    expect(script).toContain("buildDefinition?.externalParameters?.workflow");
    for (const field of ["workflow.repository", "workflow.path", "workflow.ref", "resolvedDependencies[0].digest.gitCommit"]) expect(script).toContain(`"${field}"`);

    const identity = step("verify-provenance", "The attestation names this repository, release.yml, the tag and the commit");
    expect(identity.env).toEqual({
      PACKAGE: pkg.name,
      REPOSITORY: "gener8v/gener8v.tools.education.graph-generator",
      WORKFLOW: ".github/workflows/release.yml",
    });
    expect(pkg.repository.url).toBe(`git+https://github.com/${identity.env?.REPOSITORY}.git`);
    for (const s of verify.steps) if (s.env?.PACKAGE !== undefined) expect(s.env.PACKAGE).toBe(pkg.name);

    // Nothing from the registry is installed in the job that holds the OIDC token.
    expect(runs(job("publish")).join("\n")).not.toMatch(/npm install (?!--global npm@)|npm audit|dist\.attestations/);
  });

  // @spec CPSE-REQ-047
  // @spec CPSE-REQ-052
  it("checks the published package in its own job: the exact version, no scripts, a 10-minute retry cap, no failure swallowed (CPSE-REQ-047 to 052)", () => {
    const check = job("install-check");
    const checkout = check.steps.find((s) => s.uses?.startsWith("actions/checkout@"));
    expect(checkout?.with).toEqual({ "persist-credentials": false });
    expect(runs(check)).toEqual(['node tests/smoke/published.mjs "${GITHUB_REF_NAME#v}"']);
    expect(check.env).toBeUndefined();

    const script = readFileSync("tests/smoke/published.mjs", "utf8");
    expect(script).toContain("--ignore-scripts");
    expect(script).toContain("`${PACKAGE}@${version}`");
    expect(script).toContain("npm");
    expect(script).toContain('"audit", "signatures"');
    expect(script).toContain("--no-install");
    expect(script).toContain("INSTALL_DEADLINE_MS = 600_000");
    expect(script).not.toMatch(/\|\| true|shell:\s*true/);
  });

  it("opens the version pull request from main with changesets/action v2 inputs, and never publishes there (SEC-008)", () => {
    const versionPr = job("version-pr");
    expect(versionPr.if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    // `changeset version` reads each changeset's commit; a shallow clone makes it fetch with no credential.
    expect(versionPr.steps.find((s) => s.uses?.startsWith("actions/checkout@"))?.with?.["fetch-depth"]).toBe(0);
    const changesets = versionPr.steps.find((s) => s.uses?.startsWith("changesets/action@"));
    expect(changesets?.uses).toBe("changesets/action@ae32849d5ba541f9ae29e40e22a623bc13562f51");
    // The inputs that changesets/action v2.1.2 declares (action.yml at the pinned commit); v2 throws
    // on the v1 names `version`, `commit` and `title`.
    const v2Inputs = ["github-token", "publish-script", "version-script", "commit-message", "pr-title", "pr-draft", "pr-base-branch", "create-github-releases", "push-git-tags", "push-with-git-cli", "cwd"];
    for (const input of Object.keys(changesets?.with ?? {})) expect(v2Inputs, input).toContain(input);
    expect(changesets?.with).toEqual({ "version-script": "pnpm run release:version", "commit-message": "Version the package", "pr-title": "Version the package" });
    expect(pkg.scripts["release:version"]).toBe("changeset version && tsx scripts/group-changelog.ts && pnpm generate");
    // `version` is an npm lifecycle name: `npm version` would run it (CR-007).
    expect(pkg.scripts.version).toBeUndefined();
  });

  it("runs a dry run on manual dispatch, with no id-token, no environment and no tag condition", () => {
    expect(release.on.workflow_dispatch?.inputs?.dry_run).toMatchObject({ type: "boolean", default: true });
    const dryRun = job("dry-run");
    expect(dryRun.if).toBe("github.event_name == 'workflow_dispatch' && inputs.dry_run");
    expect(dryRun.needs).toBe("checks");
    expect(dryRun.permissions).toBeUndefined();
    expect(dryRun.environment).toBeUndefined();
  });

  it("pins every action to a commit SHA, and the actionlint image to a digest", () => {
    for (const [key, source] of Object.entries(text)) {
      const lines = source.split("\n").filter((line) => /^\s*(?:- )?uses: /.test(line));
      expect(lines.length, key).toBeGreaterThan(0);
      for (const line of lines) {
        const uses = /uses: (\S+)/.exec(line)?.[1] ?? "";
        if (uses === SETUP) continue;
        if (uses.startsWith("docker://")) expect(uses, key).toMatch(/^docker:\/\/[\w./-]+:[\w.-]+@sha256:[0-9a-f]{64}$/);
        else expect(uses, key).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
        expect(line, key).toMatch(/ # v\d/);
      }
    }
    expect(existsSync(`${SETUP.slice(2)}/action.yml`)).toBe(true);
  });

  it("sets every job up through the one composite action, with the pnpm of packageManager (QR-005)", () => {
    expect(setup.runs.using).toBe("composite");
    expect(setup.runs.steps.map((s) => s.run).filter(Boolean)).toEqual([`npm install --global ${pkg.packageManager}`, "pnpm install --frozen-lockfile"]);
    const directSetupNode: string[] = [];
    for (const [name, j] of allJobs()) {
      for (const s of j.steps) {
        expect(s.run ?? "", name).not.toMatch(/npm install --global pnpm|pnpm install/);
        if (s.uses?.startsWith("actions/setup-node@")) directSetupNode.push(name);
      }
    }
    // verify-provenance and install-check need Node.js and npm only, and verify-provenance must not check out the repository to run the action.
    expect(directSetupNode).toEqual(["verify-provenance", "install-check"]);
  });

  it("pins the npm version that publishes", () => {
    expect(runs(job("publish"))).toContainEqual(expect.stringMatching(/^npm install --global npm@\d+\.\d+\.\d+$/));
  });

  it("lints the workflows in CI with actionlint (QR-003)", () => {
    const lint = ci.jobs.actionlint?.steps.find((s) => s.uses?.startsWith("docker://rhysd/actionlint:"));
    expect(lint?.with).toEqual({ args: "-color" });
  });
});

// @spec CPSE-REQ-041
describe("changelog categories (one list, many readers)", () => {
  it("are listed once, in changelog-categories.json, and every reader agrees", async () => {
    const listed = JSON.parse(readFileSync("scripts/changelog-categories.json", "utf8"));
    expect(listed).toEqual(["Added", "Changed", "Deprecated", "Removed", "Fixed"]);
    expect([...CATEGORIES]).toEqual(listed);

    // changelog.cjs (CommonJS) builds its pattern from the same file.
    const { getReleaseLine } = createRequire(import.meta.url)("../../.changeset/changelog.cjs") as {
      getReleaseLine: (changeset: { summary: string }) => Promise<string>;
    };
    for (const category of listed) {
      await expect(getReleaseLine({ summary: `${category}: text` })).resolves.toBe(`- **${category}:** text`);
    }
    await expect(getReleaseLine({ summary: "Other: text" })).resolves.toBe("- Other: text");

    // The readers do not keep a copy of the list.
    for (const file of ["scripts/check-changesets.ts", "scripts/group-changelog.ts", ".changeset/changelog.cjs"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/Added\W+Changed\W+Deprecated/);
    }
    expect(readFileSync(".changeset/README.md", "utf8")).toContain("scripts/changelog-categories.json");
  });
});

// @spec CPSE-REQ-051
describe("published-package check script (CPSE-REQ-051)", () => {
  it.each([[[]], [["1.0; rm -rf /"]], [["latest"]]])("refuses the argument %j with exit status 2 and the usage, before any network use", (args) => {
    const result = spawnSync(process.execPath, ["tests/smoke/published.mjs", ...args], { encoding: "utf8", timeout: 20_000 });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage: node tests/smoke/published.mjs <version>");
    expect(result.stdout).toBe("");
  });
});
