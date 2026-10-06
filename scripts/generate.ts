// Writes the generated files from the graph-type definitions (AD-003, GSV-REQ-015):
//   src/generated/description.ts  — GraphDescription and one interface per graph type
//   src/generated/schema.json     — the published JSON Schema (copied to dist/schema.json)
//   src/generated/tool-schema.json — the strict tool-profile schema
//   src/generated/vocabulary.json — the published vocabulary (copied to dist/vocabulary.json)
// and tests/fixtures/generated/description.ts from the test-only fixture types, so the type-level
// test has types to check examples against. CI fails when a committed file differs from a fresh
// run (`pnpm generate`).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { definitions } from "../src/core/definitions/index";
import { buildDescriptionTypes, buildSchema, buildToolSchema, buildVocabulary } from "../src/core/schema";
import { fixtureRegistry } from "../tests/fixtures/definitions/index";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function write(path: string, content: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`wrote ${path}`);
}

write("src/generated/description.ts", buildDescriptionTypes(definitions));
write("src/generated/schema.json", json(buildSchema(definitions)));
write("src/generated/tool-schema.json", json(buildToolSchema(definitions)));
write("src/generated/vocabulary.json", json(buildVocabulary(definitions)));
write("tests/fixtures/generated/description.ts", buildDescriptionTypes(fixtureRegistry));
