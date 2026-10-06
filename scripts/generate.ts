// Writes the generated files from the graph-type definitions (AD-003, GSV-REQ-015): the
// description types, the published schema and vocabulary (copied to dist/ by the build), the tool
// schema, and the fixture types for the type-level test. The list is `generatedFiles()`. CI fails
// when a committed file differs from a fresh run (`pnpm generate`).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatedFiles } from "./generated-files";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const [path, content] of Object.entries(generatedFiles())) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`wrote ${path}`);
}
