import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportSource } from "../../src/export/index";
import { loadExample } from "../fixtures/examples";
import { HOSTILE_TEXT, UNSAFE_CHARS } from "../fixtures/plain-text";

// Spawns the built command (`dist/cli.js`) in a temporary directory, as a build script would
// (CPSE-REQ-026). Every case checks the exit status, the streams and the files left behind.
const root = resolve(import.meta.dirname, "../..");
const cli = join(root, "dist/cli.js");

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "graph-generator-cli-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const circle = loadExample("circle") as Record<string, unknown>;

/** Runs the command with `args` in `cwd`, or in the temporary directory. */
function run(args: string[], cwd: string = dir, entry: string = cli) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, output: result.stdout + result.stderr };
}

/** A new empty directory under the temporary one. */
let counter = 0;
function fresh(): string {
  const path = join(dir, `case-${counter++}`);
  mkdirSync(path);
  return path;
}

function writeDescription(where: string, description: unknown, file = "description.json"): string {
  const path = join(where, file);
  writeFileSync(path, typeof description === "string" ? description : JSON.stringify(description));
  return path;
}

const sourceOf = (description: unknown, options?: { componentName: string }): string => {
  const result = exportSource(description, options);
  if (!result.ok) throw new Error("the description should export");
  return result.source;
};

describe("graph-generator export", () => {
  it("is an executable with a node shebang", () => {
    expect(readFileSync(cli, "utf8").startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).bin).toEqual({ "graph-generator": "./dist/cli.js" });
  });

  it("writes <Name>.tsx beside the input, with exportSource's text unchanged", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const result = run(["export", file]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.split("\n").filter(Boolean)).toHaveLength(1);
    expect(result.stdout).toContain("CircleGraph.tsx");
    expect(readdirSync(where).sort()).toEqual(["CircleGraph.tsx", "description.json"]);
    expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8")).toBe(sourceOf(circle));
  });

  it("writes to --out", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const out = join(where, "Chosen.tsx");
    const result = run(["export", file, "--out", out]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Chosen.tsx");
    expect(readdirSync(where).sort()).toEqual(["Chosen.tsx", "description.json"]);
    expect(readFileSync(out, "utf8")).toBe(sourceOf(circle));
  });

  it("names the component and the default file with --name", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const result = run(["export", file, "--name", "UnitCircle"]);
    expect(result.status).toBe(0);
    expect(readdirSync(where).sort()).toEqual(["UnitCircle.tsx", "description.json"]);
    expect(readFileSync(join(where, "UnitCircle.tsx"), "utf8")).toBe(sourceOf(circle, { componentName: "UnitCircle" }));
  });

  it("overwrites an existing output file", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    writeFileSync(join(where, "CircleGraph.tsx"), "old");
    expect(run(["export", file]).status).toBe(0);
    expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8")).toBe(sourceOf(circle));
  });

  it("refuses a name that is not a PascalCase identifier and writes nothing", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const result = run(["export", file, "--name", "not a name"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("/componentName");
    expect(readdirSync(where)).toEqual(["description.json"]);
  });

  it("prints an invalid description's issues to stderr, exits 1 and writes nothing", () => {
    const where = fresh();
    const file = writeDescription(where, { ...circle, radius: -1 });
    const result = run(["export", file]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("/radius");
    expect(readdirSync(where)).toEqual(["description.json"]);
  });

  it("escapes a hostile key in an issue's path", () => {
    const where = fresh();
    const key = `x${UNSAFE_CHARS.escape}[31m${UNSAFE_CHARS.rightToLeftOverride}${UNSAFE_CHARS.newline}forged: ok`;
    const file = writeDescription(where, { ...circle, [key]: 1 });
    const result = run(["export", file]);
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain(UNSAFE_CHARS.escape);
    expect(result.stderr).not.toContain(UNSAFE_CHARS.rightToLeftOverride);
    expect(result.stderr).not.toMatch(/^forged: ok/m);
    expect(result.stderr).toContain("\\u001b");
  });

  it("prints at most 20 issues for 9,900 unknown keys, then counts the rest", () => {
    const where = fresh();
    const keys = Object.fromEntries(Array.from({ length: 9_900 }, (_, i) => [`unknown${i}`, 1]));
    const file = writeDescription(where, { ...circle, ...keys });
    const result = run(["export", file]);
    expect(result.status).toBe(1);
    expect(result.stderr.length).toBeLessThan(8_000);
    expect(result.stderr).toMatch(/…and 9880 more\n$/);
    const printed = result.stderr.split("\n").filter((line) => line.includes("unknown"));
    expect(printed).toHaveLength(20);
    expect(readdirSync(where)).toEqual(["description.json"]);
  });

  it("reports text that is not JSON as invalid_json, exits 1 and writes nothing", () => {
    const where = fresh();
    const file = writeDescription(where, '{"type": "circle",}');
    const result = run(["export", file]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("not valid JSON");
    expect(readdirSync(where)).toEqual(["description.json"]);
  });

  it("reports a missing file by code and escapes its name", () => {
    const where = fresh();
    const name = `missing${UNSAFE_CHARS.newline}${UNSAFE_CHARS.escape}${UNSAFE_CHARS.rightToLeftOverride}.json`;
    const result = run(["export", join(where, name)]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("(ENOENT)");
    expect(result.stderr.trimEnd().split("\n")).toHaveLength(1);
    expect(result.stderr).not.toContain(UNSAFE_CHARS.escape);
    expect(result.stderr).not.toContain(UNSAFE_CHARS.rightToLeftOverride);
    expect(result.stderr).toContain("\\u001b");
  });

  it("gives an --out that is a directory a fixed message: no message, stack, path or file: text", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const out = join(where, "folder");
    mkdirSync(out);
    const result = run(["export", file, "--out", out]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("(EISDIR)");
    expect(result.output).not.toMatch(/file:|\/node_modules\/| {4}at |illegal operation|EISDIR:/);
  });

  it("carries a hostile title through to a file byte-identical to exportSource's", () => {
    for (const title of HOSTILE_TEXT) {
      const where = fresh();
      const description = { ...circle, title };
      const file = writeDescription(where, description);
      const result = run(["export", file]);
      // A title the validator refuses (a line break, a bidi control) is reported and nothing is written.
      if (!exportSource(description).ok) {
        expect(result.status, title).toBe(1);
        expect(readdirSync(where), title).toEqual(["description.json"]);
        continue;
      }
      expect(result.status, title).toBe(0);
      expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8"), title).toBe(sourceOf(description));
    }
  });

  it("prints its help, on stdout, with exit 0", () => {
    for (const flag of ["--help", "-h"]) {
      const result = run([flag]);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Usage: graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]");
    }
  });

  it("prints the package version", () => {
    const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
    expect(run(["--version"]).stdout).toBe(`${version}\n`);
  });

  it("exits 2 with the usage for a command line it cannot use", () => {
    const where = fresh();
    const file = writeDescription(where, circle);
    const cases = [[], ["export"], ["render", file], ["export", file, "extra"], ["export", file, "--bogus"], ["export", file, "--out"], ["export", file, "--name"]];
    for (const args of cases) {
      const result = run(args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Usage: graph-generator export");
    }
    expect(readdirSync(where)).toEqual(["description.json"]);
  });

  it("does not echo a hostile unknown option in its usage error", () => {
    const result = run([`--${UNSAFE_CHARS.escape}x`]);
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain(UNSAFE_CHARS.escape);
  });

  it("runs from a copy of dist/ with no node_modules, and loads no React", () => {
    const where = fresh();
    cpSync(join(root, "dist"), join(where, "dist"), { recursive: true });
    cpSync(join(root, "package.json"), join(where, "package.json"));
    expect(existsSync(join(where, "node_modules"))).toBe(false);
    const file = writeDescription(where, circle);
    const result = run(["export", file], where, join(where, "dist/cli.js"));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8")).toBe(sourceOf(circle));
    expect(readFileSync(join(where, "dist/cli.js"), "utf8")).not.toMatch(/from ["']react/);
  });
});
