import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tsupConfig from "../../tsup.config";

// The entry-point list lives in package.json `exports`, tsup.config.ts and .size-limit.json.
// This test fails when a graph-type ticket updates one and not the others.

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const sizeLimit: Array<{ path: string }> = JSON.parse(readFileSync(".size-limit.json", "utf8"));

/** `./dist/core/index.js` → `core/index` */
const distKey = (path: string) => path.replace(/^\.?\/?dist\//, "").replace(/\.js$/, "");

const codeExports = Object.entries(pkg.exports as Record<string, unknown>)
  .filter((entry): entry is [string, { default: string; types: string }] => typeof entry[1] === "object")
  .map(([name, target]) => ({ name, key: distKey(target.default), types: target.types }));

describe("entry points agree across package.json, tsup and size-limit (QR-006)", () => {
  const config = Array.isArray(tsupConfig) ? tsupConfig[0] : tsupConfig;
  const tsupKeys = Object.keys((config as { entry: Record<string, string> }).entry).sort();

  it("every code export is built by tsup, and tsup builds nothing unexported", () => {
    expect(codeExports.map((e) => e.key).sort()).toEqual(tsupKeys);
  });

  it("every code export has a size budget, and no budget points at an unexported file", () => {
    expect(sizeLimit.map((entry) => distKey(entry.path)).sort()).toEqual(tsupKeys);
  });

  it("every code export's types sit beside its JavaScript", () => {
    for (const entry of codeExports) {
      expect(entry.types).toBe(`./dist/${entry.key}.d.ts`);
    }
  });
});
