import { randomBytes } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createIssue, formatIssue, quoteForMessage } from "./core/issues";
import type { Issue } from "./core/result";
import { exportSource } from "./export/exportSource";
import { PACKAGE_VERSION } from "./generated/version";

/** The most issues printed; the rest are counted (GSV TICKET-002 security review SEC-002). */
const MAX_ISSUES_PRINTED = 20;

/** The longest file name printed whole; a path is longer than an issue's term. */
const MAX_NAME_CHARS = 1024;

/**
 * The most bytes read from the description file: 3 MiB. The largest valid description, pretty-
 * printed, is 1,649,745 bytes (the x,y graph at its limits: 1,000 labeled points and 740 labeled
 * segments, every label 200 astral characters, measured 2026-11-04), so this is 1.9 times that
 * (GSV CPSE TICKET-006 security review SEC-002).
 */
const MAX_INPUT_BYTES = 3 * 1024 * 1024;

/** A name Windows opens as a device, whatever its extension: `CON.tsx` is not a file there. */
const RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const OPTIONS = {
  out: { type: "string" },
  name: { type: "string" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

const USAGE = `Usage: graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]

Reads a graph description (a JSON file) and writes one standalone React component file.

Commands:
  export <file.json>   Write the description's component source.

Options:
  --out <file.tsx>     Where to write it. Default: <Name>.tsx next to the description.
  --name <Name>        The component's name, a PascalCase identifier such as CircleGraph.
                       Default: the graph type's, such as CircleGraph.
  -h, --help           Print this help.
  -v, --version        Print the package version.

An existing output file is replaced. The description must be a regular file of at most 3 MiB
(3,145,728 bytes), and --out cannot be the description itself. Exit status: 0 written; 1 the
description or the file is not valid, or the file cannot be read or written; 2 the command line
is not valid, or names the description as the output.
`;

/** A file name as the issue messages show text: quoted, with control and invisible characters escaped. */
const quoted = (text: string) => quoteForMessage(text, MAX_NAME_CHARS);

/** The fixed sentence, then the error's code when it is a plain `E...` code; never its message or stack. */
function failure(sentence: string, error: unknown): string {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && /^E[A-Z]+$/.test(code) ? `${sentence} (${code}).` : `${sentence}.`;
}

function issueLines(issues: readonly Issue[]): string {
  const lines = issues.slice(0, MAX_ISSUES_PRINTED).map(formatIssue);
  if (issues.length > MAX_ISSUES_PRINTED) lines.push(`…and ${issues.length - MAX_ISSUES_PRINTED} more`);
  return lines.join("\n");
}

const fail = (text: string): number => {
  process.stderr.write(`${text}\n`);
  return 1;
};

const usageError = (): number => {
  process.stderr.write(`graph-generator: the command line is not valid.\n\n${USAGE}`);
  return 2;
};

/** A refusal of the command line's meaning, with a fixed sentence: exit status 2. */
const refuse = (sentence: string): number => {
  process.stderr.write(`${sentence}\n`);
  return 2;
};

/**
 * The description file's text, or the exit status when it cannot be used. The file is opened once
 * and checked by its handle, so what is checked is what is read: a directory, a pipe or a device
 * is refused, and so is a file over `MAX_INPUT_BYTES`, before any of it is read. The open does not
 * wait for a writer, so a named pipe cannot hold the command.
 */
function readInput(file: string): { text: string } | { status: number } {
  let fd: number | undefined;
  try {
    fd = openSync(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    const stats = fstatSync(fd);
    if (!stats.isFile()) return { status: fail(`graph-generator: ${quoted(file)} is not a regular file.`) };
    if (stats.size > MAX_INPUT_BYTES) return { status: fail(`graph-generator: ${quoted(file)} is larger than 3 MiB, the most the command reads.`) };
    return { text: readFileSync(fd, "utf8") };
  } catch (error) {
    return { status: fail(failure(`graph-generator: cannot read ${quoted(file)}`, error)) };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Whether `target` is the description file itself: the same file (a link, another spelling), or the same path. */
function isSameFile(file: string, target: string): boolean {
  try {
    const input = statSync(file);
    const output = statSync(target);
    return input.dev === output.dev && input.ino === output.ino;
  } catch {
    // The target does not exist yet (or cannot be checked): compare the paths.
    return resolve(file) === resolve(target);
  }
}

/** Removes a temporary file that may not exist; a failure to remove it is not reported over the first. */
function discard(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // Nothing more can be done.
  }
}

/** Reads, checks and writes one description. Returns the exit status. */
function exportCommand(file: string, out: string | undefined, name: string | undefined): number {
  // Without --out the file is named after the component, and Windows cannot create a file by a device's name.
  if (out === undefined && name !== undefined && RESERVED_NAME.test(name)) return refuse(`graph-generator: ${quoted(name)} is a reserved file name on Windows; give the file with --out.`);
  const input = readInput(file);
  if ("status" in input) return input.status;
  const { text } = input;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    // Only the parser's message is passed on, as the issue's detail, which the issue escapes.
    const detail = error instanceof SyntaxError ? error.message : undefined;
    const issue = createIssue("invalid_json", "", detail === undefined ? {} : { detail });
    return fail(`graph-generator: ${quoted(file)} is not valid JSON.\n${issueLines([issue])}`);
  }
  const result = exportSource(parsed, name === undefined ? undefined : { componentName: name });
  if (!result.ok) return fail(`graph-generator: ${quoted(file)} cannot be exported; nothing was written.\n${issueLines(result.issues)}`);
  const target = out ?? join(dirname(file), `${result.componentName}.tsx`);
  if (isSameFile(file, target)) return refuse(`graph-generator: ${quoted(target)} is the description file; give another file with --out. Nothing was written.`);
  // Written beside the target and renamed over it, so a link at the target is replaced, not followed,
  // and a failure leaves the target as it was (GSV CPSE TICKET-006 security review SEC-003).
  const temporary = `${target}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(temporary, result.source, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    // An existing file of that name is not ours to remove.
    if ((error as { code?: unknown } | null)?.code !== "EEXIST") discard(temporary);
    return fail(failure(`graph-generator: cannot write ${quoted(target)}`, error));
  }
  try {
    renameSync(temporary, target);
  } catch (error) {
    discard(temporary);
    return fail(failure(`graph-generator: cannot write ${quoted(target)}`, error));
  }
  process.stdout.write(`Wrote ${quoted(target)}.\n`);
  return 0;
}

/** Runs the command line and returns the exit status: 0 done, 1 failed, 2 not used correctly. */
// @spec CPSE-REQ-026
export function main(argv: readonly string[]): number {
  try {
    let args: ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>;
    try {
      args = parseArgs({ args: [...argv], options: OPTIONS, allowPositionals: true, strict: true });
    } catch {
      return usageError();
    }
    const { values, positionals } = args;
    if (values.help === true) {
      process.stdout.write(USAGE);
      return 0;
    }
    if (values.version === true) {
      process.stdout.write(`${PACKAGE_VERSION}\n`);
      return 0;
    }
    const [command, file] = positionals;
    if (command !== "export" || file === undefined || positionals.length !== 2) return usageError();
    return exportCommand(file, values.out, values.name);
  } catch {
    // Anything unexpected: the issue's fixed message, never the exception's (GSV TICKET-002 SEC-003).
    return fail(formatIssue(createIssue("internal_error", "", {})));
  }
}

/** Whether this file is the module node was started with, through the `bin` link or not; false when that cannot be told. */
function isEntryModule(): boolean {
  try {
    const entry = process.argv[1];
    return entry !== undefined && import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

// Importing this module, as the tests do, only defines `main`.
if (isEntryModule()) process.exitCode = main(process.argv.slice(2));
