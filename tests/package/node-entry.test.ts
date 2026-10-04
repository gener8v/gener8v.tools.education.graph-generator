import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A resolve hook that fails the import if react or react-dom is ever loaded.
const HOOKS = `
export async function resolve(specifier, context, next) {
  if (/^react(-dom)?($|\\/)/.test(specifier)) {
    throw new Error("React was loaded: " + specifier);
  }
  return next(specifier, context);
}
`;

const REGISTER = (hooksUrl: string) => `
import { register } from "node:module";
register(${JSON.stringify(hooksUrl)});
`;

const PROGRAM = `
for (const entry of ["@gener8v/graph-generator/core", "@gener8v/graph-generator/tool", "@gener8v/graph-generator/export"]) {
  await import(entry);
}
console.log(JSON.stringify({ window: typeof window, document: typeof document }));
`;

describe("non-rendering entry points in plain Node.js (CPSE-REQ-006, prd/TC-005)", () => {
  it("imports ./core, ./tool and ./export without loading React or needing browser globals", () => {
    const dir = mkdtempSync(join(tmpdir(), "graph-generator-node-"));
    const hooks = join(dir, "hooks.mjs");
    const register = join(dir, "register.mjs");
    writeFileSync(hooks, HOOKS);
    writeFileSync(register, REGISTER(new URL(`file://${hooks}`).href));

    // Run from the repository root so the package resolves itself through its exports map.
    const output = execFileSync(
      process.execPath,
      ["--import", register, "--input-type=module", "--eval", PROGRAM],
      { encoding: "utf8" },
    );
    expect(JSON.parse(output.trim())).toEqual({ window: "undefined", document: "undefined" });
  });

  it("fails the same check when an entry does load React (the hook works)", () => {
    const dir = mkdtempSync(join(tmpdir(), "graph-generator-node-"));
    const hooks = join(dir, "hooks.mjs");
    const register = join(dir, "register.mjs");
    writeFileSync(hooks, HOOKS);
    writeFileSync(register, REGISTER(new URL(`file://${hooks}`).href));
    expect(() =>
      execFileSync(process.execPath, ["--import", register, "--input-type=module", "--eval", `await import("react");`], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow(/React was loaded/);
  });
});
