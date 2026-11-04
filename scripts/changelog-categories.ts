import { readFileSync } from "node:fs";

/**
 * The changelog categories, in the order CHANGELOG.md groups them (CPSE-REQ-041). The list lives in
 * changelog-categories.json so that .changeset/changelog.cjs, which cannot import TypeScript, reads
 * the same one; check-changesets.ts and group-changelog.ts import it from here.
 */
export const CATEGORIES = JSON.parse(readFileSync(new URL("./changelog-categories.json", import.meta.url), "utf8")) as readonly string[];
