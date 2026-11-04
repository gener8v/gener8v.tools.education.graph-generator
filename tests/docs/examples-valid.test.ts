import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { formatIssue, validate } from "../../src/core/index";

// CPSE-REQ-046: every documented example is valid. The examples the site shows (examples/*.json,
// one story each) and every ```json block in the documentation pages are descriptions, and each one
// must pass `validate`; the counter-examples in examples/invalid/ must fail it (graph-library CPSE
// TICKET-008). JSON on a page that is not a description, such as a tool call's input, is written in
// a ```ts or ```text block.

const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const jsonFiles = (dir: string) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `${dir}/${entry.name}`)
    .sort();

/** Every issue as a line of text, for a failure message. */
const why = (input: unknown) => {
  const result = validate(input);
  return result.valid ? "" : result.issues.map(formatIssue).join("\n");
};

/** The text of every ```json block in a page, indented or not, with the line it starts on. */
function jsonBlocks(page: string): Array<{ line: number; text: string }> {
  const blocks: Array<{ line: number; text: string }> = [];
  for (const match of page.matchAll(/^[ \t]*```json[ \t]*\n([\s\S]*?)^[ \t]*```[ \t]*$/gm)) {
    blocks.push({ line: page.slice(0, match.index).split("\n").length, text: match[1]! });
  }
  return blocks;
}

const examples = jsonFiles("examples");
const invalid = jsonFiles("examples/invalid");
const pages = readdirSync("docs", { recursive: true, encoding: "utf8" })
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => `docs/${file}`)
  .sort();

// @spec CPSE-REQ-046
describe("documented examples (CPSE-REQ-046)", () => {
  it("has an example of every graph type", () => {
    const types = new Set(examples.map((file) => (json(file) as { type?: unknown }).type));
    expect(GRAPH_TYPES.filter((type) => !types.has(type))).toEqual([]);
  });

  for (const file of examples) {
    it(`${file} is valid`, () => {
      expect(why(json(file)), file).toBe("");
    });
  }

  it("has counter-examples", () => {
    expect(invalid.length).toBeGreaterThan(0);
  });

  for (const file of invalid) {
    it(`${file} is not valid`, () => {
      expect(validate(json(file)).valid, file).toBe(false);
    });
  }

  it("finds JSON examples in the documentation pages", () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.flatMap((page) => jsonBlocks(readFileSync(page, "utf8"))).length).toBeGreaterThan(0);
  });

  for (const page of pages) {
    it(`every json block in ${page} is a valid description`, () => {
      for (const { line, text } of jsonBlocks(readFileSync(page, "utf8"))) {
        const where = `${page}:${line}`;
        let description: unknown;
        expect(() => (description = JSON.parse(text)), `${where} is not JSON`).not.toThrow();
        expect(why(description), where).toBe("");
      }
    });
  }

  it("reads every json block, indented or not", () => {
    const page = "Text\n\n```json\n{ \"type\": \"square\" }\n```\n\n```ts\nconst a = 1;\n```\n\n- item\n\n  ```json  \n  {}\n  ```   \n";
    expect(jsonBlocks(page)).toEqual([
      { line: 3, text: '{ "type": "square" }\n' },
      { line: 13, text: "  {}\n" },
    ]);
  });
});
