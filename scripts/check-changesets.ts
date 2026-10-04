import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CATEGORIES = ["Added", "Changed", "Deprecated", "Removed", "Fixed"] as const;

/** The summary of a changeset file: everything after its front matter. */
export function changesetSummary(text: string): string {
  const match = /^---\n[\s\S]*?\n---\n?/.exec(text);
  return (match ? text.slice(match[0].length) : text).trim();
}

/**
 * A changeset summary must open with a changelog category, e.g. "Added: number lines with arrows",
 * so CHANGELOG.md records added, changed, deprecated and removed behavior (CPSE-REQ-041).
 * Returns an error message, or null when the summary is acceptable.
 */
// @spec CPSE-REQ-041
export function checkChangesetSummary(text: string): string | null {
  const summary = changesetSummary(text);
  const category = /^(\w+):\s+\S/.exec(summary)?.[1];
  if (category && (CATEGORIES as readonly string[]).includes(category)) return null;
  return `Changeset summary must start with one of ${CATEGORIES.map((c) => `"${c}:"`).join(", ")} followed by a description.`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = ".changeset";
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  let failed = false;
  for (const file of files) {
    const error = checkChangesetSummary(readFileSync(join(dir, file), "utf8"));
    if (error) {
      console.error(`${join(dir, file)}: ${error}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`Changesets checked: ${files.length}.`);
}
