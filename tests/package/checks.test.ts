import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkChangesetSummary } from "../../scripts/check-changesets";
import { checkDependencies, justifiedDependencies } from "../../scripts/check-dependencies";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const contributing = readFileSync("CONTRIBUTING.md", "utf8");

// @spec CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-038, CPSE-REQ-040
describe("package.json (CPSE-REQ-001..004, CPSE-REQ-037, CPSE-REQ-038, CPSE-REQ-040)", () => {
  it("has the package format and metadata the ticket requires", () => {
    expect(pkg.name).toBe("@gener8v/graph-generator");
    expect(pkg.type).toBe("module");
    expect(pkg.sideEffects).toBe(false);
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.peerDependencies.react).toBe("^18 || ^19");
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.license).toBe("MIT");
    expect(pkg.repository.url).toContain("github.com/gener8v/gener8v.tools.education.graph-generator");
    expect(pkg.bugs.url).toMatch(/\/issues$/);
    expect(pkg.homepage).toMatch(/^https:\/\//);
  });

  it("exports the planned entry points", () => {
    for (const entry of [".", "./core", "./tool", "./export", "./schema.json", "./vocabulary.json"]) {
      expect(pkg.exports).toHaveProperty([entry]);
    }
    for (const entry of [".", "./core", "./tool", "./export"]) {
      expect(pkg.exports[entry].types).toMatch(/\.d\.ts$/);
    }
  });

  it("ships type declarations for every code entry point after the build", () => {
    for (const entry of ["index", "core/index", "tool/index", "export/index"]) {
      expect(existsSync(`dist/${entry}.js`)).toBe(true);
      expect(existsSync(`dist/${entry}.d.ts`)).toBe(true);
    }
    expect(existsSync("dist/schema.json")).toBe(true);
    expect(existsSync("dist/vocabulary.json")).toBe(true);
  });
});

// @spec CPSE-REQ-037, CPSE-REQ-039
describe("repository files (CPSE-REQ-037, CPSE-REQ-039)", () => {
  it("has an MIT LICENSE matching package.json", () => {
    expect(readFileSync("LICENSE", "utf8")).toMatch(/^MIT License/);
  });

  it("README links the repository, issue tracker and documentation", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain(pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, ""));
    expect(readme).toContain(pkg.bugs.url);
    expect(readme).toContain(pkg.homepage);
  });

  it("CONTRIBUTING covers issues, changes and the local checks", () => {
    expect(contributing).toContain("## Reporting issues");
    expect(contributing).toContain("## Proposing changes");
    expect(contributing).toContain("pnpm lint && pnpm typecheck && pnpm test && pnpm build");
  });
});

describe("runtime dependency check (CPSE-NFR-007)", () => {
  it("passes the real package.json, which has no runtime dependencies", () => {
    expect(checkDependencies(pkg, contributing)).toEqual([]);
  });

  it("fails a runtime dependency with no justification", () => {
    const errors = checkDependencies({ dependencies: { "left-pad": "^1.0.0" } }, contributing);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("left-pad");
  });

  it("passes a runtime dependency that is justified in the notes table", () => {
    const notes = `${contributing}| \`left-pad\` | Pads strings; 1 kB, MIT. |\n`;
    expect(justifiedDependencies(notes).has("left-pad")).toBe(true);
    expect(checkDependencies({ dependencies: { "left-pad": "^1.0.0" } }, notes)).toEqual([]);
  });

  it("fails an unjustified optional dependency", () => {
    expect(checkDependencies({ optionalDependencies: { "left-pad": "^1.0.0" } }, contributing)).toHaveLength(1);
  });

  it("fails an unjustified peer dependency other than react", () => {
    const errors = checkDependencies({ peerDependencies: { react: "^18 || ^19", d3: "^7" } }, contributing);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("d3");
  });

  it("fails an unjustified bundled dependency", () => {
    expect(checkDependencies({ bundleDependencies: ["left-pad"] }, contributing)).toHaveLength(1);
    expect(checkDependencies({ bundledDependencies: ["left-pad"] }, contributing)).toHaveLength(1);
  });

  it("does not count a row with an empty justification", () => {
    const notes = `${contributing}| \`left-pad\` |  |\n`;
    expect(checkDependencies({ dependencies: { "left-pad": "^1.0.0" } }, notes)).toHaveLength(1);
  });
});

describe("changeset categories (CPSE-REQ-041)", () => {
  const changeset = (summary: string) => `---\n"@gener8v/graph-generator": minor\n---\n\n${summary}\n`;

  for (const category of ["Added", "Changed", "Deprecated", "Removed", "Fixed"]) {
    it(`accepts a summary starting with "${category}:"`, () => {
      expect(checkChangesetSummary(changeset(`${category}: number lines with arrowheads`))).toBeNull();
    });
  }

  it("rejects a summary without a category", () => {
    expect(checkChangesetSummary(changeset("number lines with arrowheads"))).toMatch(/must start with/);
  });

  it("rejects an unknown category", () => {
    expect(checkChangesetSummary(changeset("Improved: faster validation"))).toMatch(/must start with/);
  });

  it("formats the category in the changelog line", async () => {
    const { getReleaseLine } = await import("../../.changeset/changelog.cjs");
    const line = await getReleaseLine({ summary: "Deprecated: the `size` property\nUse `sideLength`." }, "minor", null);
    expect(line).toBe("- **Deprecated:** the `size` property\n  Use `sideLength`.");
  });
});
