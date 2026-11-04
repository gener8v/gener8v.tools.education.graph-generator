import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validate } from "../../src/core/validate/index";
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
  // The timeout fails a command that waits (on a pipe, say) instead of hanging the run.
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: "utf8", timeout: 30_000 });
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

/** What an uncaught exception or a native crash prints: none of it may reach a user. */
const NO_TRACE = /Native stack trace|# {2}Fatal| {4}at /;

/** The largest description the schema allows to be written, pretty-printed (GSV CPSE TICKET-006 SEC-002): the x,y graph at its ceilings, every label 200 characters. */
function largestDescription(label: string): Record<string, unknown> {
  const span = 2e-9;
  const coordinate = (i: number) => (i % 2 ? -1 : 1) * span * 1.23456789012e-12 * (1 + (i % 7) / 10);
  return {
    type: "xy-graph",
    title: label,
    xAxisLabel: label,
    yAxisLabel: label,
    xAxis: { min: -span / 2, max: span / 2 },
    yAxis: { min: -span / 2, max: span / 2 },
    showGrid: true,
    points: Array.from({ length: 1000 }, (_, i) => ({ x: coordinate(i), y: coordinate(i + 1), label })),
    segments: Array.from({ length: 740 }, (_, i) => ({ from: { x: coordinate(i), y: coordinate(i + 2) }, to: { x: coordinate(i + 3), y: coordinate(i + 5) }, label })),
  };
}

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
    // The temporary file is removed when the rename fails.
    expect(readdirSync(where).sort()).toEqual(["description.json", "folder"]);
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

  it("imports nothing but Node built-ins, so a copy needs no node_modules (QR-002)", () => {
    const code = readFileSync(cli, "utf8");
    const specifiers = [...code.matchAll(/(?:^|[;\n])\s*(?:import|export)\b[^;"'`()]*?\bfrom\s*["']([^"']+)["']|(?:^|[;\n])\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? match[4] ?? "");
    // Guards the scan itself: the bundle does import some built-ins.
    expect(specifiers.length).toBeGreaterThan(2);
    for (const specifier of specifiers) expect(builtinModules, specifier).toContain(specifier.replace(/^node:/, ""));
    // No import or require whose specifier is not a string literal.
    expect(code.match(/\bimport\s*\(|\brequire\s*\(/g) ?? []).toHaveLength([...code.matchAll(/\b(?:import|require)\s*\(\s*["']/g)].length);
  });

  it("runs when started through a symlink to dist/cli.js, as npm links a bin", () => {
    const where = fresh();
    const link = join(where, "graph-generator");
    symlinkSync(cli, link);
    const file = writeDescription(where, circle);
    const result = run(["export", file], where, link);
    expect(result.status).toBe(0);
    expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8")).toBe(sourceOf(circle));
  });

  describe("the description file (GSV CPSE TICKET-006 SEC-002)", () => {
    it("refuses a file over 3 MiB with a fixed sentence, before parsing, and writes nothing", () => {
      const where = fresh();
      const file = writeDescription(where, " ".repeat(3 * 1024 * 1024 + 1));
      const result = run(["export", file]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(`graph-generator: "${file}" is larger than 3 MiB, the most the command reads.\n`);
      expect(result.output).not.toMatch(NO_TRACE);
      expect(readdirSync(where)).toEqual(["description.json"]);
    });

    it("refuses a directory", () => {
      const where = fresh();
      const result = run(["export", where]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("is not a regular file.");
      expect(result.output).not.toMatch(NO_TRACE);
      expect(readdirSync(where)).toEqual([]);
    });

    it.skipIf(process.platform === "win32")("refuses a named pipe without waiting for a writer", () => {
      const where = fresh();
      const pipe = join(where, "description.json");
      execFileSync("mkfifo", [pipe]);
      const result = run(["export", pipe]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("is not a regular file.");
      expect(result.output).not.toMatch(NO_TRACE);
      expect(readdirSync(where)).toEqual(["description.json"]);
    });

    it("accepts the largest valid description, pretty-printed, at under two thirds of the limit", () => {
      const description = largestDescription("😀".repeat(200));
      expect(validate(description).valid).toBe(true);
      const text = JSON.stringify(description, null, 2);
      // Measured 1,649,745 bytes on 2026-11-04; with the quote label, 952,545.
      expect(Buffer.byteLength(text, "utf8") * 1.5).toBeLessThan(3 * 1024 * 1024);
      const where = fresh();
      const file = writeDescription(where, text);
      const result = run(["export", file]);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(readFileSync(join(where, "XyGraph.tsx"), "utf8")).toBe(sourceOf(description));
    });
  });

  describe("the output file (GSV CPSE TICKET-006 SEC-003, SEC-004, CR-001)", () => {
    it.skipIf(process.platform === "win32")("replaces a symlink at the default target and leaves what it pointed at unchanged", () => {
      const where = fresh();
      const file = writeDescription(where, circle);
      const victim = join(where, "victim.txt");
      writeFileSync(victim, "victim");
      symlinkSync(victim, join(where, "CircleGraph.tsx"));
      const result = run(["export", file]);
      expect(result.status).toBe(0);
      expect(readFileSync(victim, "utf8")).toBe("victim");
      expect(lstatSync(join(where, "CircleGraph.tsx")).isFile()).toBe(true);
      expect(readFileSync(join(where, "CircleGraph.tsx"), "utf8")).toBe(sourceOf(circle));
      expect(readdirSync(where).sort()).toEqual(["CircleGraph.tsx", "description.json", "victim.txt"]);
    });

    it("refuses an output that is the description, however it is named, and leaves it unchanged", () => {
      const where = fresh();
      mkdirSync(join(where, "sub"));
      const file = writeDescription(where, circle);
      linkSync(file, join(where, "alias.json"));
      const before = readFileSync(file, "utf8");
      for (const out of [file, join(where, "sub", "..", "description.json"), join(where, ".", "description.json"), join(where, "alias.json")]) {
        const result = run(["export", file, "--out", out]);
        expect(result.status, out).toBe(2);
        expect(result.stdout, out).toBe("");
        expect(result.stderr, out).toContain("is the description file");
        expect(result.output, out).not.toMatch(NO_TRACE);
        expect(readFileSync(file, "utf8"), out).toBe(before);
        expect(readdirSync(where).sort(), out).toEqual(["alias.json", "description.json", "sub"]);
      }
    });

    it("refuses a spelling of the description's path that does not exist yet to resolve", () => {
      const where = fresh();
      const file = writeDescription(where, circle);
      const result = run(["export", file, "--out", join(where, "missing", "..", "description.json")]);
      expect(result.status).toBe(2);
      expect(readFileSync(file, "utf8")).toBe(JSON.stringify(circle));
    });

    it("refuses the default target when the description is named that", () => {
      const where = fresh();
      const file = writeDescription(where, circle, "CircleGraph.tsx");
      const result = run(["export", file]);
      expect(result.status).toBe(2);
      expect(readFileSync(file, "utf8")).toBe(JSON.stringify(circle));
      expect(readdirSync(where)).toEqual(["CircleGraph.tsx"]);
    });

    it("leaves no temporary file after a success or a failure", () => {
      const where = fresh();
      const file = writeDescription(where, circle);
      expect(run(["export", file]).status).toBe(0);
      expect(run(["export", file, "--out", join(where, "absent", "Out.tsx")]).status).toBe(1);
      expect(readdirSync(where).sort()).toEqual(["CircleGraph.tsx", "description.json"]);
    });

    it("refuses a component name Windows reserves when --out is absent, and accepts it with --out", () => {
      const where = fresh();
      const file = writeDescription(where, circle);
      for (const name of ["CON", "Con", "PRN", "Aux", "NUL", "Com1", "COM9", "Lpt1", "LPT9"]) {
        const result = run(["export", file, "--name", name]);
        expect(result.status, name).toBe(2);
        expect(result.stdout, name).toBe("");
        expect(result.stderr, name).toContain("--out");
        expect(readdirSync(where), name).toEqual(["description.json"]);
      }
      const out = join(where, "Safe.tsx");
      expect(run(["export", file, "--name", "Con", "--out", out]).status).toBe(0);
      expect(readFileSync(out, "utf8")).toBe(sourceOf(circle, { componentName: "Con" }));
      // A name that only starts like a device is not one.
      expect(run(["export", file, "--name", "Console"]).status).toBe(0);
    });
  });
});
