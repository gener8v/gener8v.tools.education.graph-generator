import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { formatIssue, validate } from "../../src/core/index";
import { descriptionFences, pages, read } from "./pages";

// CPSE-REQ-046: every documented example is valid. The examples the site shows (examples/*.json,
// one story each) and every ```json block in the documentation pages are descriptions, and each one
// must pass `validate`; the counter-examples in examples/invalid/ must fail it (graph-library CPSE
// TICKET-008). So is a block with no language, or a ts, js or text one, whose content is a JSON
// object with a "type" key: a description cannot dodge the check by going unlabelled. JSON on a
// page that is not a description, such as a tool call's input, has no "type" key at its top level
// (the tool's input is wrapped: {"graph": ...}).

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

const examples = jsonFiles("examples");
const invalid = jsonFiles("examples/invalid");

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
    expect(pages.flatMap((page) => descriptionFences(read(page), page)).length).toBeGreaterThan(0);
  });

  for (const page of pages) {
    it(`every description block in ${page} is a valid description`, () => {
      for (const { where, text } of descriptionFences(read(page), page)) {
        let description: unknown;
        expect(() => (description = JSON.parse(text)), `${where} is not JSON`).not.toThrow();
        expect(why(description), where).toBe("");
      }
    });
  }

  it("reads every json block, indented or not", () => {
    const page = "Text\n\n```json\n{ \"type\": \"square\" }\n```\n\n```ts\nconst a = 1;\n```\n\n- item\n\n  ```json  \n  {}\n  ```   \n\n~~~json\n{}\n~~~\n";
    expect(descriptionFences(page).map(({ line, text }) => ({ line, text }))).toEqual([
      { line: 3, text: '{ "type": "square" }\n' },
      { line: 13, text: "  {}\n" },
      { line: 17, text: "{}\n" },
    ]);
  });

  it("also reads a block with no language, or a ts, js or text one, that is a JSON object with a type", () => {
    const description = '{ "type": "circle", "radius": -3 }';
    const page = [
      `\`\`\`\n${description}\n\`\`\``,
      `\`\`\`ts\n${description}\n\`\`\``,
      `\`\`\`js\n${description}\n\`\`\``,
      `\`\`\`text\n${description}\n\`\`\``,
      // Not descriptions: no "type" key, not JSON, a list, another language.
      '```text\n{ "graph": { "type": "circle" } }\n```',
      "```ts\nconst a = { type: 1 };\n```",
      `\`\`\`text\n[${description}]\n\`\`\``,
      `\`\`\`sh\n${description}\n\`\`\``,
    ].join("\n\n");
    const found = descriptionFences(page);
    expect(found.map(({ lang }) => lang)).toEqual(["", "ts", "js", "text"]);
    for (const { text } of found) expect(validate(JSON.parse(text)).valid).toBe(false);
  });
});
