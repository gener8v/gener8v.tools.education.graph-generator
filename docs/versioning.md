# Versioning and releases

This package follows [semantic versioning](https://semver.org). This page covers the public
contract, how versions change while the package is `0.x`, and how releases are made.

## The public contract

These five things are the contract. Changing any of them can break code that uses the package.

- **The description.** The JSON description of a graph, and what each valid description draws.
- **The vocabulary.** The terms, their definitions and the values they accept.
- **The issue codes.** The `code` of each issue the validator reports.
- **The tool definition.** `graphTool`, its schema and the result of `handleGraphToolCall`.
- **The component inputs.** The props of `Graph` and the per-type components.

Rendered pixels are not part of the contract. A description can look a little different from one
version to the next, but its meaning stays the same.

## What changes the version

A change is breaking if a valid description is refused afterwards, or is drawn with a different
meaning. Removing or renaming a term, issue code or prop is also breaking.

| Change | Before `1.0.0` | From `1.0.0` |
|--------|----------------|--------------|
| A breaking change | minor (`0.2.0` to `0.3.0`) | major |
| A new graph type, term or option | minor | minor |
| A fix that breaks no valid description | patch | patch |

Semantic versioning allows breaking changes in a minor release while the major version is `0`, and
this package uses that rule until `1.0.0`. Version `1.0.0` will mark the description as stable.
We will not publish it early just to get out from under the rule. From then on, a change that invalidates a valid description or changes
its meaning ships only in a new major version.

### Worked example: the text limits

Titles, labels and units have length limits (listed on the documentation site's vocabulary page).
Say a release added those limits to a package that had none. Text over the limit becomes an
issue, so a description that used to be valid is refused. That is a breaking change.

While the package is `0.x`, it ships in a minor release. Its changeset starts with `Changed:`, so
the changelog lists it under "Changed". From `1.0.0` the same change needs a major release.

## Writing a changeset

Run `pnpm changeset` in every pull request that changes published behavior. Pick the bump from the
table above. Start the summary with `Added:`, `Changed:`, `Deprecated:`, `Removed:` or `Fixed:`.
`CHANGELOG.md` groups each release under these headings.

## How a release is made

Only the release workflow (`.github/workflows/release.yml`) publishes. Nobody publishes by hand,
and npm enforces this through the package's publishing access setting (see the Engineer steps
below).

1. A push to `main` opens or updates the version pull request. It bumps the version, groups the
   changelog and refreshes `src/generated/version.ts`.
2. A maintainer reviews and merges that pull request.
3. A maintainer pushes the tag `v<version>` on the merged version commit on `main`, for example
   `v0.3.0`. The tag must match the version in `package.json`. The workflow stops if the tagged
   commit is not on `main`.
4. The workflow runs every CI check, including the install and browser checks, in a job that
   cannot publish.
5. If they pass, the publish job waits for the required reviewer to approve the `npm` environment.
   It then builds the package, checks the built files and publishes them with provenance. It uses
   npm trusted publishing, so the repository stores no npm token.
6. Another job, which cannot publish, checks that the registry has the provenance attestation for
   that version. The attestation must name this repository, `.github/workflows/release.yml`, the
   tag and the tagged commit. The job fails if the attestation is missing or names anything else.
7. A last job installs the version just published from npm into an empty project with React. It
   checks the registry signatures, runs the `graph-generator export` command and imports every
   entry point. If npm does not serve the new version yet, it keeps trying for 10 minutes. If any
   check fails, the run fails. The version stays published, so fix forward with a new version or
   deprecate it. To make the same check on your own machine, check out the version's tag and run
   `pnpm test:published <version>`. It uses the public registry and ignores your npm settings. It
   runs the published package's code as you, so check a release you suspect in a throwaway
   environment.

Publishing is off until the repository variable `NPM_PUBLISH_ENABLED` is `true`. A manual run of
the workflow is a dry run and never publishes.

## Engineer steps before the first release

These settings tie publishing to reviewed code on `main`. They are GitHub and npm settings, not
files in the repository. Do them in this order. The repository has one maintainer, and the
settings below are what is configured today.

1. **Make the repository public.** npm provenance needs a public repository.
2. **Protect `main`.** Add a branch ruleset for `main` that:
   - Requires a pull request, with 0 approvals.
   - Requires the 9 CI checks to pass.
   - Blocks force pushes and deletion.
   - Lets repository admins bypass it only by merging a pull request.
3. **Protect the version tags.** Add a tag ruleset on `refs/tags/v*`. Only repository admins can
   create tags (the bypass list), and tags cannot be updated or deleted. A tag cannot move after
   the checks ran.
4. **Create the `npm` environment** (Settings, Environments):
   - Add the maintainer as the required reviewer, and leave "Prevent self-review" off.
   - Under deployment branches and tags, allow only the tag rule `v*`.
5. **Publish the first version** (below).
6. **Add the trusted publisher on npm** (the package's Settings, Trusted Publisher, GitHub Actions):
   organization `gener8v`, repository `gener8v.tools.education.graph-generator`, workflow
   filename `release.yml`, environment name `npm`. Under allowed actions, allow `npm publish`.
   A trusted publisher created after 2026-09-03 allows only `npm stage publish` unless you choose
   more. A new trusted publisher expires if it does not publish within 2 days. Add it when the
   next release is ready, or add it again if it expires.
7. **Disallow tokens.** In the package's Settings, Publishing access, select "Require two-factor
   authentication and disallow tokens". Trusted publishing still works, and no npm token can
   publish, leaked or not.

With a second maintainer, require one approval on `main` and turn on "Prevent self-review" for the
`npm` environment.

### The first version

npm can only add a trusted publisher to a package that already exists, so the first version cannot
use trusted publishing. The release workflow still publishes it, from a tag, with provenance.
Before you start, check https://docs.npmjs.com/trusted-publishers. If npm now allows a first
publish through trusted publishing, use that and skip the token.

1. On npm, create a granular access token with read and write access and the shortest expiry.
   Limit it to `@gener8v/graph-generator` if npm lets you. If it does not, because the package
   does not exist yet, limit it to the `@gener8v` scope.
2. Store it as the secret `NPM_BOOTSTRAP_TOKEN` of the `npm` environment, not of the repository.
   Only the publish step reads it, and only if it is there.
3. Set `NPM_PUBLISH_ENABLED` to `true`, then release as above.
4. As soon as the publish job ends, revoke the token on npm and delete the secret.
5. Continue with Engineer steps 6 and 7.

## What the provenance check proves

The attestation links the published files to one workflow run in this public repository, at one
commit. It proves CI built the package from public source. It does not prove the code has no bugs,
and it does not cover the packages this one depends on.

To check a version yourself, install it and run `npm audit signatures`. To see which repository,
workflow, tag and commit built it, run
`npm view "@gener8v/graph-generator@<version>" dist.attestations` and open the attestation's `url`.

## Fixing a bad release

Never unpublish a version. Other projects may depend on it, and removing it breaks their installs.

- Fix the bug in a new version.
- Deprecate the bad version with `npm deprecate "@gener8v/graph-generator@<version>" "<message naming the fixed version>"`.

A deprecated version can still be installed. Its users see the message when they install it.
