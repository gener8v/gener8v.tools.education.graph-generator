# Contributing

Thank you for helping. This package is maintained by a small team, so automated checks do most
of the reviewing: please run them before you open a pull request.

## Reporting issues

Open an issue at https://github.com/gener8v/gener8v.tools.education.graph-generator/issues.
For a graph that draws wrongly or a description that is rejected unexpectedly, include the JSON
description, what you expected, and what you saw (a screenshot or the reported issue list).

## Proposing changes

1. Open an issue first for anything larger than a small fix, so the approach can be agreed.
2. Fork the repository and create a branch.
3. Make the change with tests.
4. Run `pnpm changeset` and describe the change. Start the summary with one category:
   `Added:`, `Changed:`, `Deprecated:`, `Removed:` or `Fixed:`.
5. Open a pull request. CI runs every check on Node.js 22 and 24 with React 18 and 19.

The JSON description, the vocabulary, the issue codes, the tool definition and the component
inputs are the package's public contract. A change that makes a previously valid description
invalid, or draws it with a different meaning, is a breaking change.

## Running the checks locally

You need Node.js 22 or later and pnpm 10.

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Further checks that CI runs:

```sh
pnpm check:dist       # the built output makes no network access (after pnpm build)
pnpm publint          # package metadata
pnpm attw             # type resolution of the packed package
pnpm size             # bundle size budgets
pnpm check:deps       # runtime dependencies are justified (below)
pnpm check:changesets # changesets carry a changelog category
```

## Code rules the linter enforces

- Code under `src/core`, `src/tool`, `src/export` and `src/layout` must not import React or
  React DOM, or use browser globals. These parts run in Node.js without a browser.
- Nothing under `src/` may make network requests (`fetch`, `XMLHttpRequest`, `WebSocket`,
  `navigator.sendBeacon`). The package sends no data anywhere.

## Runtime dependency notes

The package has no runtime dependencies besides its React peer dependency. Adding one needs a
row in this table explaining why it is worth its size and license; CI fails otherwise. Its
license must be compatible with MIT.

| Package | Justification |
|---------|---------------|
