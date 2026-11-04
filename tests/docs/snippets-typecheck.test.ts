import { join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { fences, pages, read } from "./pages";

// Quality review QR-004 on graph-library CPSE TICKET-008: the ts and tsx snippets on the pages that
// import only this package (and react, node:*) are type-checked against src/, as a reader's project
// would check them against the package's types. Not checked: a snippet with no import from this
// package, which is a fragment (an issue or a tool call written out) or uses a provider's SDK
// (`client`, `ai`: the Anthropic, OpenAI and Google snippets), because the SDKs are not dependencies.

const root = resolve(".");
const PACKAGE = "@gener8v/graph-generator";

/** The source file each of the package's entry points is built from (tsup.config.ts). */
function source(specifier: string): string | undefined {
  if (specifier === PACKAGE) return join(root, "src/index.ts");
  if (!specifier.startsWith(`${PACKAGE}/`)) return undefined;
  const entry = specifier.slice(PACKAGE.length + 1);
  return ["core", "tool", "export"].includes(entry) ? join(root, `src/${entry}/index.ts`) : join(root, `src/entries/${entry}.ts`);
}

interface Snippet {
  where: string;
  text: string;
  specifiers: string[];
}

const snippets: Snippet[] = pages.flatMap((page) =>
  fences(read(page), page)
    .filter(({ lang }) => lang === "ts" || lang === "tsx")
    .map(({ where, text }) => ({ where, text, specifiers: [...text.matchAll(/^\s*import\b[^"']*["']([^"']+)["']/gm)].map((match) => match[1]!) })),
);

const imports = (specifier: string) => specifier === PACKAGE || specifier.startsWith(`${PACKAGE}/`);
const checked = snippets.filter(({ specifiers }) => specifiers.some(imports) && specifiers.every((specifier) => imports(specifier) || specifier === "react" || specifier.startsWith("node:")));
const left = snippets.filter((snippet) => !checked.includes(snippet));

/** The problems TypeScript finds in each snippet, by where it is. `description` is the reader's own value. */
function problems(texts: readonly Snippet[]): Map<string, string[]> {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2023.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUncheckedIndexedAccess: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    skipLibCheck: true,
    types: ["node"],
    typeRoots: [join(root, "node_modules/@types")],
    noEmit: true,
  };
  const files = new Map(texts.map((snippet, index) => [join(root, `docs/.snippets/snippet-${index}.tsx`), snippet] as const));
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  const text = (name: string) => {
    const snippet = files.get(name);
    return snippet === undefined ? undefined : `${snippet.text}\ndeclare const description: unknown;\n`;
  };
  host.fileExists = (name) => files.has(name) || fileExists.call(host, name);
  host.readFile = (name) => text(name) ?? readFile.call(host, name);
  host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
    const own = text(name);
    return own === undefined ? getSourceFile.call(host, name, languageVersion, onError, shouldCreate) : ts.createSourceFile(name, own, languageVersion, true, ts.ScriptKind.TSX);
  };
  host.resolveModuleNameLiterals = (literals, containing, redirected, _options, containingSourceFile) =>
    literals.map((literal) => {
      const file = source(literal.text);
      return file === undefined
        ? ts.resolveModuleName(literal.text, containing, options, host, undefined, redirected, containingSourceFile.impliedNodeFormat)
        : { resolvedModule: { resolvedFileName: file, extension: ts.Extension.Ts, isExternalLibraryImport: false } };
    });
  const program = ts.createProgram([...files.keys()], options, host);
  return new Map(
    [...files].map(([name, snippet]) => {
      const sourceFile = program.getSourceFile(name)!;
      const found = [...program.getSyntacticDiagnostics(sourceFile), ...program.getSemanticDiagnostics(sourceFile)];
      return [
        snippet.where,
        found.map((diagnostic) => {
          const line = diagnostic.start === undefined ? 0 : sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line;
          return `${snippet.where} +${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
        }),
      ] as const;
    }),
  );
};

// @spec CPSE-REQ-046
describe("code snippets on the pages (QR-004)", () => {
  it("finds the snippets that use only this package, and leaves out the rest", () => {
    expect(checked.length).toBeGreaterThanOrEqual(8);
    // Left out: no snippet imports from this package and something else.
    expect(left.filter(({ specifiers }) => specifiers.some(imports))).toEqual([]);
  });

  it("type-checks every one against the package's source", () => {
    const found = problems(checked);
    expect([...found.values()].flat()).toEqual([]);
  }, 60_000);

  it("reports a snippet that does not compile", () => {
    const bad: Snippet = { where: "bad", text: 'import { validate } from "@gener8v/graph-generator/core";\nvalidate(1, 2);\nconst a: number = "x";\nvalidate(description).nothing;', specifiers: [`${PACKAGE}/core`] };
    const good: Snippet = { where: "good", text: 'import { validate } from "@gener8v/graph-generator/core";\nvalidate(description);', specifiers: [`${PACKAGE}/core`] };
    const found = problems([bad, good]);
    expect(found.get("bad")!.length).toBeGreaterThanOrEqual(3);
    expect(found.get("good")).toEqual([]);
  }, 60_000);
});
