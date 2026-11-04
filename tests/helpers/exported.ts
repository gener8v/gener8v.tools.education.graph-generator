import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import type { FunctionComponent } from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);

/** An exported file compiled and loaded: its exports and every module it asked for. */
export interface LoadedExport {
  readonly exports: Record<string, unknown>;
  readonly required: readonly string[];
}

/**
 * The two compilers a consumer's toolchain uses on an exported file, each with the automatic JSX
 * runtime, to CommonJS: esbuild (Vite, Vitest, tsx) and TypeScript's own emit (`tsc`). Both read JSX
 * pragmas from comments (CPSE TICKET-005 security review SEC-001).
 */
const COMPILERS = {
  esbuild: (source: string) => transformSync(source, { loader: "tsx", jsx: "automatic", format: "cjs", target: "es2022" }).code,
  tsc: (source: string) =>
    ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
} as const;

export type Compiler = keyof typeof COMPILERS;

/**
 * An exported `.tsx` source compiled in memory, with esbuild unless another compiler is named, and
 * run as a module, with `react/jsx-runtime` the only module it can load (CPSE-NFR-001,
 * CPSE-REQ-021). Nothing is written to disk.
 */
export function loadExport(source: string, compiler: Compiler = "esbuild"): LoadedExport {
  const code = COMPILERS[compiler](source);
  const required: string[] = [];
  const load = (specifier: string): unknown => {
    required.push(specifier);
    if (specifier !== "react/jsx-runtime") throw new Error(`The exported file asked for ${specifier}`);
    return require(specifier);
  };
  const module = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)(load, module, module.exports);
  return { exports: module.exports, required };
}

/** The one component an exported file exports, by name. */
export function exportedComponent(source: string, name: string, compiler: Compiler = "esbuild"): FunctionComponent {
  const { exports } = loadExport(source, compiler);
  const keys = Object.keys(exports);
  if (keys.length !== 1 || keys[0] !== name) throw new Error(`The exported file exports ${keys.join(", ")}, not ${name} alone`);
  return exports[name] as FunctionComponent;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Type-checks exported files as a consumer's strict TypeScript project would, with React's types
 * and the automatic JSX runtime, as if each were `tests/export/__exported__/<name>.tsx` (it is
 * served from memory). Returns every diagnostic as text; none for files that type-check.
 */
export function typecheckExports(files: Readonly<Record<string, string>>): string[] {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUncheckedIndexedAccess: true,
    isolatedModules: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  };
  const virtual = new Map(Object.entries(files).map(([name, text]) => [join(root, "tests", "export", "__exported__", `${name}.tsx`), text]));
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.fileExists = (file) => virtual.has(file) || fileExists.call(host, file);
  host.readFile = (file) => virtual.get(file) ?? readFile.call(host, file);
  host.getSourceFile = (file, language, ...rest) => {
    const text = virtual.get(file);
    return text === undefined ? getSourceFile.call(host, file, language, ...rest) : ts.createSourceFile(file, text, language, true);
  };
  const program = ts.createProgram([...virtual.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((d) => `${d.file?.fileName ?? ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
}
