# Changesets

Run `pnpm changeset` for every pull request that changes published behavior. Start the summary
with one category — `Added:`, `Changed:`, `Deprecated:`, `Removed:` or `Fixed:` — so the
changelog records what changed. CI rejects a summary without one (`pnpm check:changesets`).

While the package is `0.x`, a change that breaks a previously valid description is a **minor**
bump; from `1.0.0` it is a **major** bump.
