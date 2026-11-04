// Changelog formatter for Changesets. Each changeset summary starts with a category
// ("Added:", "Changed:", ...), enforced by scripts/check-changesets.ts; the category is written
// in bold at the start of the line. The categories come from scripts/changelog-categories.json,
// the one list that check-changesets.ts and group-changelog.ts also read.
// @spec CPSE-REQ-041
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a CommonJS file reads JSON with require
const CATEGORIES = require("../scripts/changelog-categories.json");
const CATEGORY = new RegExp(`^(${CATEGORIES.join("|")}):\\s*`);

async function getReleaseLine(changeset) {
  const [first = "", ...rest] = changeset.summary.trim().split("\n");
  const match = CATEGORY.exec(first);
  const line = match ? `**${match[1]}:** ${first.slice(match[0].length)}` : first;
  const more = rest.map((l) => `  ${l}`).join("\n");
  return `- ${line}${more ? `\n${more}` : ""}`;
}

async function getDependencyReleaseLine(_changesets, dependenciesUpdated) {
  if (dependenciesUpdated.length === 0) return "";
  return dependenciesUpdated
    .map((dep) => `- **Changed:** updated dependency \`${dep.name}\` to ${dep.newVersion}`)
    .join("\n");
}

module.exports = { getReleaseLine, getDependencyReleaseLine };
