import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { componentName } from "./core/definitions/names";
import type { GraphType } from "./core/definitions/types";
import { createIssue, formatIssue, quoteEscaped } from "./core/issues";
import type { Issue } from "./core/result";
import { exportSource } from "./export/exportSource";
import { PACKAGE_VERSION } from "./generated/version";

/** The most issues printed; the rest are counted (GSV TICKET-002 security review SEC-002). */
const MAX_ISSUES_PRINTED = 20;

/** The longest file name printed whole; a path is longer than an issue's term. */
const MAX_NAME_CHARS = 1024;

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

An existing output file is overwritten. Exit status: 0 written; 1 the description or the file
is not valid, or the file cannot be read or written; 2 the command line is not valid.
`;

/** A file name as the issue messages show text: quoted, with control and invisible characters escaped. */
const quoted = (text: string) => quoteEscaped(text, MAX_NAME_CHARS);

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

/** Reads, checks and writes one description. Returns the exit status. */
function exportCommand(file: string, out: string | undefined, name: string | undefined): number {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    return fail(failure(`graph-generator: cannot read ${quoted(file)}`, error));
  }
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
  // The description is valid, so it has a graph type and the default name follows from it.
  const target = out ?? join(dirname(file), `${name ?? componentName((parsed as { type: GraphType }).type)}.tsx`);
  try {
    writeFileSync(target, result.source, "utf8");
  } catch (error) {
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

process.exitCode = main(process.argv.slice(2));
