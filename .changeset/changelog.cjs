// Changelog formatter for Changesets. Each changeset summary starts with a category
// ("Added:", "Changed:", "Deprecated:", "Removed:", "Fixed:"), enforced by
// scripts/check-changesets.ts; the category is written in bold at the start of the line.
// @spec CPSE-REQ-041
const CATEGORY = /^(Added|Changed|Deprecated|Removed|Fixed):\s*/;

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
