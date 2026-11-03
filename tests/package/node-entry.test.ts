import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A resolve hook that fails the import if react or react-dom is ever loaded.
const HOOKS = `
export async function resolve(specifier, context, next) {
  if (/^react(-dom)?($|\\/)/.test(specifier)) {
    throw new Error("React was loaded: " + specifier);
  }
  return next(specifier, context);
}
`;

const NODE_ENTRIES = ["core", "tool", "export"].map((entry) => `@gener8v/graph-generator/${entry}`);

let dir: string;
let register: string;

/** Runs a module program in plain Node.js with the React-blocking hook registered. */
function runWithHook(program: string): string {
  // Run from the repository root so the package resolves itself through its exports map.
  return execFileSync(process.execPath, ["--import", register, "--input-type=module", "--eval", program], {
    encoding: "utf8",
    stdio: "pipe",
  });
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "graph-generator-node-"));
  const hooks = join(dir, "hooks.mjs");
  register = join(dir, "register.mjs");
  writeFileSync(hooks, HOOKS);
  writeFileSync(
    register,
    `import { register } from "node:module";\nregister(${JSON.stringify(pathToFileURL(hooks).href)});\n`,
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("non-rendering entry points in plain Node.js (CPSE-REQ-006, prd/TC-005)", () => {
  it("imports ./core, ./tool and ./export without loading React or needing browser globals", () => {
    const output = runWithHook(`
      for (const entry of ${JSON.stringify(NODE_ENTRIES)}) await import(entry);
      console.log(JSON.stringify({ window: typeof window, document: typeof document }));
    `);
    expect(JSON.parse(output.trim())).toEqual({ window: "undefined", document: "undefined" });
  });

  it("validates a description from ./core in plain Node.js (GSV-REQ-026)", () => {
    const output = runWithHook(`
      const { validate } = await import("@gener8v/graph-generator/core");
      const result = validate({ type: "pie" });
      console.log(JSON.stringify({ valid: result.valid, code: result.issues?.[0]?.code }));
    `);
    expect(JSON.parse(output.trim())).toEqual({ valid: false, code: "unknown_graph_type" });
  });

  it("exports a description as component source from ./export in plain Node.js (CPSE-REQ-019, AD-013)", () => {
    const output = runWithHook(`
      const { exportSource } = await import("@gener8v/graph-generator/export");
      const result = exportSource({ type: "circle", radius: 5 });
      console.log(JSON.stringify({ ok: result.ok, component: /export function CircleGraph\\(\\)/.test(result.source) }));
    `);
    expect(JSON.parse(output.trim())).toEqual({ ok: true, component: true });
  });

  it("serves the schema and vocabulary from ./core and as static files (GSV-REQ-010)", () => {
    const output = runWithHook(`
      const core = await import("@gener8v/graph-generator/core");
      const { readFileSync } = await import("node:fs");
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const file = (name) => JSON.parse(readFileSync(require.resolve("@gener8v/graph-generator/" + name), "utf8"));
      console.log(JSON.stringify({
        schema: JSON.stringify(core.getSchema()) === JSON.stringify(file("schema.json")),
        vocabulary: JSON.stringify(core.getVocabulary()) === JSON.stringify(file("vocabulary.json")),
        tool: core.getToolSchema().type,
      }));
    `);
    expect(JSON.parse(output.trim())).toEqual({ schema: true, vocabulary: true, tool: "object" });
  });

  it("fails the same check when an entry does load React (the hook works)", () => {
    expect(() => runWithHook(`await import("react");`)).toThrow(/React was loaded/);
  });
});
