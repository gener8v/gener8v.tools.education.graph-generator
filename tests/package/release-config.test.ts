import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../scripts/changelog-categories";

const workflow = readFileSync(".github/workflows/release.yml", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

// The workflow is read with a few structural regular expressions, not a YAML parser: `yaml` is not a
// dependency of this package, and the file keeps a plain layout (two-space indents, one job per
// top-level key under `jobs:`) that these expressions rely on.
const code = workflow
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");
const jobsBlock = code.slice(code.indexOf("\njobs:\n") + "\njobs:\n".length);
const jobs = new Map<string, string>();
{
  const headings = [...jobsBlock.matchAll(/^ {2}([\w-]+):$/gm)];
  headings.forEach((heading, i) => jobs.set(heading[1] ?? "", jobsBlock.slice(heading.index, headings[i + 1]?.index ?? jobsBlock.length)));
}
const job = (name: string): string => {
  const text = jobs.get(name);
  if (text === undefined) throw new Error(`release.yml has no job "${name}"`);
  return text;
};

// @spec CPSE-NFR-008
describe("release workflow (CPSE-NFR-008, prd/OC-002, prd/IC-003)", () => {
  it("has the five jobs", () => {
    expect([...jobs.keys()].sort()).toEqual(["checks", "dry-run", "publish", "version-pr"]);
  });

  it("publishes with --provenance, and only in the publish job", () => {
    expect(job("publish")).toMatch(/run: npm publish --provenance --access public$/m);
    expect(job("publish")).not.toMatch(/--provenance=false|--dry-run/);
    for (const name of ["checks", "version-pr", "dry-run"]) expect(job(name), name).not.toMatch(/npm publish --provenance(?!=)/);
  });

  it("grants id-token: write to the publish job alone, and read-only access at the top", () => {
    expect(code.match(/id-token:\s*write/g)).toHaveLength(1);
    expect(job("publish")).toMatch(/permissions:\n\s+contents: read\n\s+id-token: write/);
    for (const name of ["checks", "version-pr", "dry-run"]) expect(job(name), name).not.toMatch(/id-token/);
    const top = code.slice(0, code.indexOf("\njobs:\n"));
    expect(top).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(top).not.toMatch(/write/);
  });

  it("holds no long-lived npm token", () => {
    expect(code).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|registry-url/);
    // The only secret the workflow reads is the built-in token, for the version pull request.
    expect([...code.matchAll(/secrets\.(\w+)/g)].map((match) => match[1])).toEqual(["GITHUB_TOKEN"]);
    expect(job("version-pr")).toContain("secrets.GITHUB_TOKEN");
    for (const name of ["checks", "publish", "dry-run"]) expect(job(name), name).not.toMatch(/secrets\./);
  });

  it("runs the smoke and browser checks in checks and not in publish, and publish needs checks", () => {
    const checks = job("checks");
    expect(checks).toMatch(/pnpm test:smoke/);
    expect(checks).toMatch(/pnpm test:e2e/);
    expect(checks).toMatch(/playwright install/);
    expect(job("publish")).not.toMatch(/smoke|e2e|playwright/);
    expect(job("publish")).toMatch(/^ {4}needs: checks$/m);
  });

  it("publishes only from a version tag, and only when NPM_PUBLISH_ENABLED is true", () => {
    expect(job("publish")).toContain("if: startsWith(github.ref, 'refs/tags/v') && vars.NPM_PUBLISH_ENABLED == 'true'");
    expect(code).toMatch(/tags: \["v\*"\]/);
  });

  it("checks that the tag names the package version, and confirms the attestation after publishing", () => {
    const publish = job("publish");
    expect(publish).toMatch(/"v\$version"/);
    expect(publish.indexOf("The tag matches")).toBeLessThan(publish.indexOf("npm publish"));
    expect(publish.indexOf("npm publish")).toBeLessThan(publish.indexOf("dist.attestations"));
    expect(publish).toMatch(/npm audit signatures/);
  });

  it("opens the version pull request from main, with the version script, and never publishes there", () => {
    const versionPr = job("version-pr");
    expect(versionPr).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(versionPr).toMatch(/version: pnpm run version$/m);
    expect(versionPr).toMatch(/contents: write\n\s+pull-requests: write/);
    expect(versionPr).not.toMatch(/npm publish|publish:/);
    expect(pkg.scripts.version).toBe("changeset version && tsx scripts/group-changelog.ts && pnpm generate");
  });

  it("runs a dry run on manual dispatch that does not publish", () => {
    expect(code).toMatch(/workflow_dispatch:\n\s+inputs:\n\s+dry_run:[\s\S]*?default: true/);
    expect(job("dry-run")).toMatch(/npm publish --dry-run --provenance=false/);
  });

  it("pins every action to a commit SHA", () => {
    const uses = [...code.matchAll(/^\s*(?:- )?uses: (\S+)/gm)].map((match) => match[1]);
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) expect(action).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
    for (const line of workflow.split("\n").filter((l) => /\buses: /.test(l))) expect(line).toMatch(/# v\d/);
  });

  it("pins the npm version that publishes", () => {
    expect(job("publish")).toMatch(/npm install --global npm@\d+\.\d+\.\d+$/m);
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
