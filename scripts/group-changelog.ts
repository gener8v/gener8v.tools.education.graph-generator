import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "./changelog-categories";

/**
 * Changesets groups CHANGELOG.md entries by version bump ("### Minor Changes"). Each entry is
 * labelled with its category (`- **Added:** ...`, see .changeset/changelog.cjs), so this regroups
 * the newest release under one heading per category, in the order of CATEGORIES, and leaves every
 * older release untouched (CPSE-REQ-041, CPSE TICKET-001 CR-003). Empty groups are left out and
 * entries keep their order. Running it again changes nothing.
 */
// @spec CPSE-REQ-041
export function groupNewestSection(changelog: string): string {
  const lines = changelog.split("\n");
  const at = (index: number): string => lines[index] ?? "";
  const start = lines.findIndex((line) => /^## /.test(line));
  if (start === -1) return changelog;
  const next = lines.findIndex((line, index) => index > start && /^## /.test(line));
  const end = next === -1 ? lines.length : next;

  const entries: string[][] = [];
  for (let i = start + 1; i < end; i++) {
    const line = at(i);
    if (line.trim() === "" || /^### /.test(line)) continue;
    if (/^- /.test(line)) {
      const entry = [line];
      // An entry goes on while lines are indented, also across an empty line.
      while (i + 1 < end && (/^\s+\S/.test(at(i + 1)) || (at(i + 1).trim() === "" && i + 2 < end && /^\s+\S/.test(at(i + 2))))) entry.push(at(++i));
      entries.push(entry);
    } else {
      throw new Error(`${at(start)}: cannot regroup, this line is not a changelog entry: ${line}`);
    }
  }

  const groups = new Map<string, string[][]>(CATEGORIES.map((category) => [category, []]));
  for (const entry of entries) {
    const category = /^- \*\*(\w+):\*\*/.exec(entry[0] ?? "")?.[1];
    const group = category === undefined ? undefined : groups.get(category);
    if (!group) throw new Error(`${at(start)}: cannot regroup, this entry has no category (${CATEGORIES.join(", ")}): ${entry[0]}`);
    group.push(entry);
  }

  const section = [at(start)];
  for (const [category, grouped] of groups) {
    if (grouped.length === 0) continue;
    section.push("", `### ${category}`, "", ...grouped.flat());
  }
  section.push("");
  return [...lines.slice(0, start), ...section, ...lines.slice(end)].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = "CHANGELOG.md";
  if (!existsSync(file)) {
    console.log(`${file} does not exist yet; nothing to group.`);
  } else {
    const before = readFileSync(file, "utf8");
    const after = groupNewestSection(before);
    if (after !== before) writeFileSync(file, after);
    console.log(`${file}: newest release grouped by category.`);
  }
}
