# Contributing

Thanks for helping. A small team maintains this package, and automated checks do most of the
reviewing. Please run them before you open a pull request.

## Reporting issues

Open an issue at https://github.com/gener8v/gener8v.tools.education.graph-generator/issues.
If a graph draws wrong or a description is rejected when it should not be, include the JSON
description, what you expected and what you saw (a screenshot or the list of issues).

## Proposing changes

1. For anything bigger than a small fix, open an issue first to agree on the approach.
2. Fork the repository and create a branch.
3. Make the change, with tests.
4. Run `pnpm changeset` and describe the change. Start the summary with one category:
   `Added:`, `Changed:`, `Deprecated:`, `Removed:` or `Fixed:`.
5. Open a pull request. CI runs every check on Node.js 22 and 24 with React 18 and 19.

The public contract is the JSON description, the vocabulary, the issue codes, the tool definition
and the component inputs. A change is breaking if it makes a valid description invalid or draws it
with a different meaning.

## Releasing

Only the release workflow publishes, from a version tag on `main`. Never publish by hand.
Maintainers: [docs/versioning.md](docs/versioning.md) has the versioning policy and the release
steps.

The repository and npm settings that protect publishing are described in
[docs/versioning.md](docs/versioning.md#repository-and-npm-settings):

1. The repository is public.
2. A ruleset protects `main`: pull request and CI checks required, no force pushes, no deletion.
3. A tag ruleset on `refs/tags/v*`: only admins create tags, and tags cannot be updated or deleted.
4. The `npm` environment: a required reviewer, only `v*` tags may deploy, and no secrets.
5. A trusted publisher on npm for the workflow `release.yml` and the environment `npm`, allowed to
   run `npm publish`. Releases authenticate with it alone; no npm token is stored anywhere.
6. The package's publishing access is "Require two-factor authentication and disallow tokens".

## Running the checks locally

You need Node.js 22 or later and pnpm 10.

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI also runs these:

```sh
pnpm check:dist       # the built output makes no network access (after pnpm build)
pnpm publint          # package metadata
pnpm attw             # type resolution of the packed package
pnpm size             # bundle size budgets
pnpm check:deps       # runtime dependencies are justified (below)
pnpm check:images     # every pictograph image has an allowed, recorded license (below)
pnpm check:changesets # changesets carry a changelog category
```

The browser and install checks run in their own CI jobs:

```sh
pnpm exec playwright install chromium webkit   # once: the browsers the browser checks use
pnpm test:e2e         # every example hydrates in Chromium and WebKit, and Node.js, Chromium and
                      # WebKit render the examples and generated descriptions to the same markup
pnpm test:smoke       # packs the package, installs it into fresh React 18 and React 19 projects
                      # from the npm registry, and renders every example
```

`pnpm test:smoke` builds first. Set `GRAPH_GENERATOR_PREBUILT=1` to use an existing `dist/`.

## Code rules the linter enforces

- Code under `src/core`, `src/tool`, `src/export`, `src/layout` and `src/images` runs in Node.js
  without a browser. It must not import React or React DOM, or use browser globals.
- Nothing under `src/` may make network requests (`fetch`, `XMLHttpRequest`, `WebSocket`,
  `navigator.sendBeacon`). The package sends no data anywhere.

## Adding a pictograph image

Each pictograph image is either drawn for this package or is public-domain (CC0) material with a
named source. Never take one from an icon pack or the web without a license that allows it. No
image may show a trademarked character, logo or brand, whatever its license. A public-domain
dedication does not clear a trademark.

1. Draw it in its own file, `src/images/<name>.ts`, with a lower-case kebab-case name
   (`paper-plane`). Once released, the name is part of the description format, so pick a plain
   one that will last.
2. Export it with `defineImage({ name, description, license, author, provenance, viewBox:
   IMAGE_VIEW_BOX, nodes })`:
   - Draw in the 100 × 100 space with a few shapes (at most 8), built with `shape()`.
   - Use presentation attributes only, and no text.
   - Use the license `MIT` for your own work, or `CC0-1.0` for public-domain material.
   - In the provenance, say where the drawing came from: "drawn in-house…", or the source and
     author of CC0 material.
   - Import only `./draw` and `./types`, so the whole drawing is in the file. The linter enforces
     this.
3. Import it in `src/images/manifest.ts` and add it to `imageAssets`. The set holds at most 20
   images.
4. Run `pnpm test -u` once to record the drawing in the snapshot. Review the diff, then run
   `pnpm check:images`.

## Runtime dependency notes

The package has no runtime dependencies besides its React peer dependency. To add one, add a row
to this table that explains why it is worth its size and license. CI fails without it. The license
must be compatible with MIT.

| Package | Justification |
|---------|---------------|
