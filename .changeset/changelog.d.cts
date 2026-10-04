// Types for the Changesets changelog formatter in changelog.cjs.
export function getReleaseLine(changeset: { summary: string }, type: string, options: unknown): Promise<string>;
export function getDependencyReleaseLine(
  changesets: unknown[],
  dependenciesUpdated: Array<{ name: string; newVersion: string }>,
  options: unknown,
): Promise<string>;
