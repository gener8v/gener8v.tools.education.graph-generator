import { readFileSync, readdirSync } from "node:fs";

// Reading the documentation pages (docs/*.mdx) for the tests in this folder (graph-library CPSE
// TICKET-008).

/** One fenced code block of a page. */
export interface Fence {
  /** The page and line the fence starts on, such as `docs/export.mdx:50`. */
  where: string;
  line: number;
  /** The word after the opening fence; empty for a fence with none. */
  lang: string;
  /** What is between the fences, with the indentation it has. */
  text: string;
  /** The name in the MDX comment `{/* sample: name *\/}` right before the fence, when there is one. */
  sample?: string;
}

/** Every ``` or ~~~ fence of a page, indented or not, in order. */
export function fences(page: string, name = "page"): Fence[] {
  const found: Fence[] = [];
  for (const match of page.matchAll(/^[ \t]*(```|~~~)([\w-]*)[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm)) {
    const line = page.slice(0, match.index).split("\n").length;
    const marker = /\{\/\* sample: ([\w-]+) \*\/\}\s*$/.exec(page.slice(0, match.index));
    found.push({ where: `${name}:${line}`, line, lang: match[2]!, text: match[3]!, ...(marker === null ? {} : { sample: marker[1]! }) });
  }
  return found;
}

/** Languages whose fences are descriptions on sight. */
const DESCRIPTION_LANGS: ReadonlySet<string> = new Set(["json", "jsonc"]);

/** Languages a description could be put in to dodge the check: none, a script, or plain text. */
const OTHER_LANGS: ReadonlySet<string> = new Set(["", "js", "jsx", "ts", "tsx", "javascript", "typescript", "text", "txt", "plain"]);

/** Whether the text is a JSON object with a `"type"` key: a description, whatever the fence says. */
function looksLikeDescription(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.hasOwn(value, "type");
  } catch {
    return false;
  }
}

/**
 * The fences that must be valid descriptions (CPSE-REQ-046): every json fence, and any fence with
 * no language, or a ts, js or text one, whose content is a JSON object with a `"type"` key, so an
 * unlabelled description cannot dodge the check (code review CR-002 on TICKET-008).
 */
export function descriptionFences(page: string, name = "page"): Fence[] {
  return fences(page, name).filter(({ lang, text }) => DESCRIPTION_LANGS.has(lang) || (OTHER_LANGS.has(lang) && looksLikeDescription(text)));
}

/** The documentation pages: every .md and .mdx file under docs/, by path. */
export const pages: string[] = readdirSync("docs", { recursive: true, encoding: "utf8" })
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => `docs/${file}`)
  .sort();

/** A page's text. */
export const read = (page: string): string => readFileSync(page, "utf8");
