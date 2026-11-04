import { describe, expect, it } from "vitest";
import { LIMITS, grouped } from "../../docs/components/Limit";
import { describe as describeGraph, formatIssue, validate } from "../../src/core/index";
import { exportSource } from "../../src/export/exportSource";
import { PACKAGE_VERSION } from "../../src/generated/version";
import { handleGraphToolCall } from "../../src/tool/index";
import { descriptionFences, fences, pages, read } from "./pages";

// Quality review QR-002 and QR-003, code review CR-002 on graph-library CPSE TICKET-008: what the
// pages say the code prints is what it prints, and the pages type no numeric limit.
//
// A sample output on a page is the fence right after an MDX comment that names it,
// `{/* sample: name */}`. `SAMPLES` below says how each name is produced, and this test runs that
// and compares it with the fence. A sample with no entry, an entry with no sample, and an input
// that the page no longer shows all fail.

/** The page's first json description of a type. */
function description(page: string, type: string): unknown {
  const found = descriptionFences(read(page), page)
    .map(({ text }) => JSON.parse(text) as { type?: unknown })
    .find((value) => value.type === type);
  if (found === undefined) throw new Error(`${page} has no ${type} description`);
  return found;
}

/** The issues of an invalid input, each as `formatIssue` prints it. */
function printed(input: unknown): string[] {
  const result = validate(input);
  if (result.valid) throw new Error("the input is valid");
  return result.issues.map(formatIssue);
}

/** A value as the page writes an object in TypeScript: keys bare, trailing commas, one property to a line at the top. */
function literal(value: unknown, top = false): string {
  if (Array.isArray(value)) return `[${value.map((item) => literal(item)).join(", ")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).map(([key, item]) => [key, literal(item)] as const);
    return top ? `{\n${entries.map(([key, text]) => `  ${key}: ${text},`).join("\n")}\n}` : `{ ${entries.map(([key, text]) => `${key}: ${text}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

interface Sample {
  page: string;
  /** Text the page must still show, so the sample is made from what the page's code does. */
  input?: string;
  /**
   * `exact`: the fence is the output. `excerpt`: each line of the fence is a line of the output, in
   * order, and a line that is only `...` stands for any lines.
   */
  mode?: "exact" | "excerpt";
  make(): string;
}

const SAMPLES: Record<string, Sample> = {
  "describe-circle": {
    page: "docs/vocabulary.mdx",
    input: "describe(result.description)",
    make: () => describeGraph(description("docs/components.mdx", "circle")),
  },
  "format-issue-radius": {
    page: "docs/issue-codes.mdx",
    input: 'validate({ type: "circle", radius: -3 })',
    make: () => printed({ type: "circle", radius: -3 }).join("\n"),
  },
  "issue-radius": {
    page: "docs/issue-codes.mdx",
    make: () => {
      const result = validate({ type: "circle", radius: -3 });
      if (result.valid) throw new Error("the input is valid");
      return literal(result.issues[0], true);
    },
  },
  "messages-plain-text": {
    page: "docs/issue-codes.mdx",
    make: () => [...printed({ type: "circle", radius: 3, title: "a‮b" }), ...printed({ type: "circle", radius: 3, title: "x".repeat(201) })].join("\n"),
  },
  "tool-summary-ok": {
    page: "docs/model-tool.mdx",
    make: () => handleGraphToolCall({ graph: { type: "circle", radius: 3 } }).summary,
  },
  "tool-summary-failed": {
    page: "docs/model-tool.mdx",
    make: () => handleGraphToolCall({ graph: { type: "circle", radius: -3 } }).summary,
  },
  "export-square": {
    page: "docs/export.mdx",
    input: 'exportSource(description, { componentName: "SquareFigure" })',
    mode: "excerpt",
    make: () => {
      const result = exportSource(description("docs/export.mdx", "square"), { componentName: "SquareFigure" });
      if (!result.ok) throw new Error("the square is not exported");
      return result.source.replaceAll(PACKAGE_VERSION, "<version>");
    },
  },
};

/** The first line of the excerpt that is not a line of the output in order (`...` stands for any lines), or undefined when all are. */
function isExcerpt(excerpt: string, output: string): string | undefined {
  const lines = output.split("\n");
  let at = 0;
  let gap = false;
  for (const line of excerpt.split("\n")) {
    if (line.trim() === "...") {
      gap = true;
      continue;
    }
    const found = gap ? lines.indexOf(line, at) : lines[at] === line ? at : -1;
    if (found === -1) return line;
    at = found + 1;
    gap = false;
  }
  return undefined;
}

// @spec CPSE-REQ-046
describe("sample outputs on the pages (QR-002)", () => {
  const used = new Set<string>();
  for (const page of pages) {
    for (const fence of fences(read(page), page).filter(({ sample }) => sample !== undefined)) {
      const name = fence.sample!;
      used.add(name);
      it(`${fence.where}: the sample ${name} is what the code prints`, () => {
        const sample = SAMPLES[name];
        expect(sample, `no entry for the sample ${name} in SAMPLES`).toBeDefined();
        expect(page, `the sample ${name} is on another page`).toBe(sample!.page);
        if (sample!.input !== undefined) expect(read(page), `${page} no longer shows the code that makes ${name}`).toContain(sample!.input);
        const shown = fence.text.trimEnd();
        const made = sample!.make().trimEnd();
        if (sample!.mode === "excerpt") expect(isExcerpt(shown, made), `the line is not in the output of ${name}`).toBeUndefined();
        else expect(shown).toBe(made);
      });
    }
  }

  it("has a sample for every entry", () => {
    expect([...used].sort()).toEqual(Object.keys(SAMPLES).sort());
  });

  it("compares an excerpt line by line, in order", () => {
    expect(isExcerpt("a\n...\nc", "a\nb\nc")).toBeUndefined();
    expect(isExcerpt("a\nc", "a\nb\nc")).toBe("c");
    expect(isExcerpt("c\n...\na", "a\nb\nc")).toBe("c");
    expect(isExcerpt("a\n...\na", "a\nb\nc")).toBe("a");
    expect(isExcerpt("a\nx", "a\nb\nc")).toBe("x");
  });
});

/** A page's prose: the fenced blocks (checked above or by the example tests) and MDX comments left out. */
function prose(page: string): string {
  return page
    .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<Limit name="\w+" \/>/g, "");
}

/** The ways a page could type a limit: the number, with and without thousands separators, and the size in MiB. */
const typed = [...new Set(Object.values(LIMITS).flatMap((value) => [String(value), grouped(value)]))].map((number) => ({
  label: number,
  pattern: new RegExp(`(?<![\\w.,/-])${number.replaceAll(",", "[,]?")}(?![\\w]|[.,]\\d)`),
}));

/**
 * A number in the words of a limit or a size: "at most 250", "more than 500", "250 characters". Any
 * other number than a package constant is a wrong or new hand-typed limit, unless it is one of the
 * measured facts below, which the package does not state as a constant.
 */
const LIMIT_PHRASE =
  /(?:(?:at most|more than|fewer than|less than|up to|limit of|longer than|over|first|stop after)\s+(?:about\s+)?\d[\d,]*|\b\d[\d,]*(?:\.\d+)?\s+(?:characters|code points|values|keys|issues|items|bytes|MiB|MB|KiB|parameters))/g;

/** Measured facts and other providers' rules, which no constant in the package states. */
const FACTS: ReadonlySet<string> = new Set([
  "1.6 MB", // the largest valid description as JSON (README, the CLI's MAX_INPUT_BYTES comment)
  "64 characters", // where formatIssue clips a path that is not a plain pointer
  "at most 16", // Anthropic strict mode's limit on union-type parameters
  "876,000 characters", // the largest valid tool input, compact
  "more than 500,000", // what the largest graphs' text alternative states
]);

// @spec CPSE-REQ-046
describe("numeric limits on the pages (QR-003, CR-002)", () => {
  for (const page of pages) {
    it(`${page} types none of them, it renders them from the package's constants`, () => {
      const text = prose(read(page));
      expect(typed.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)).toEqual([]);
      expect(text).not.toMatch(/\b3 MiB\b/);
      expect((text.match(LIMIT_PHRASE) ?? []).filter((phrase) => !FACTS.has(phrase))).toEqual([]);
    });
  }

  it("finds a limit typed in prose, and not one written with the component", () => {
    const find = (text: string) => typed.some(({ pattern }) => pattern.test(prose(text)));
    expect(find("Titles are at most 200 characters.")).toBe(true);
    expect(find("A description of 10,000 values.")).toBe(true);
    expect(find("About 2000000 characters.")).toBe(true);
    expect(find('Titles are at most <Limit name="CALLER_TEXT_LIMIT" /> characters.')).toBe(false);
    expect(find("On 2026-11-04, about 1.6 MB, 1,200 items.")).toBe(false);
    expect(find("```text\nlimit of 200\n```")).toBe(false);
    expect((prose("Titles are at most 250 characters, or 12 items.").match(LIMIT_PHRASE) ?? []).length).toBe(2);
  });

  it("measures the tool's summary limit, which the package does not export", () => {
    expect(LIMITS.TOOL_SUMMARY_ISSUES).toBeGreaterThan(0);
  });
});
