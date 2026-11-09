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
and npm enforces this through the package's publishing access setting (see
[Repository and npm settings](#repository-and-npm-settings)).

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

Publishing is on while the repository variable `NPM_PUBLISH_ENABLED` is `true`. Set it to `false`
to stop all publishing. A manual run of the workflow is a dry run and never publishes.

## Repository and npm settings

These settings tie publishing to reviewed code on `main`. They are GitHub and npm settings, not
files in the repository, so a change to them does not show up in a pull request. The repository
has one maintainer, and this is the configuration.

1. **The repository is public.** npm provenance needs a public repository.
2. **`main` is protected.** A branch ruleset for `main`:
   - Requires a pull request, with 0 approvals.
   - Requires the 9 CI checks to pass.
   - Blocks force pushes and deletion.
   - Lets repository admins bypass it only by merging a pull request.
3. **Version tags are protected.** A tag ruleset on `refs/tags/v*` lets only repository admins
   create tags (the bypass list), and tags cannot be updated or deleted. A tag cannot move after
   the checks ran.
4. **The `npm` environment** (Settings, Environments):
   - The maintainer is the required reviewer, and "Prevent self-review" is off.
   - Only the tag rule `v*` may deploy.
   - It holds no secrets.
5. **npm trusts the release workflow.** The package's trusted publisher (its Settings, Trusted
   Publisher, GitHub Actions) is organization `gener8v`, repository
   `gener8v.tools.education.graph-generator`, workflow filename `release.yml`, environment name
   `npm`, with `npm publish` allowed.
6. **npm refuses tokens.** The package's publishing access is "Require two-factor authentication
   and disallow tokens". Trusted publishing still works, and no npm token can publish, leaked or
   not.

With a second maintainer, require one approval on `main` and turn on "Prevent self-review" for the
`npm` environment.

### If the trusted publisher must be added again

npm does not check a trusted publisher's values when you save it, so a typo shows up only as a
failed publish. A new trusted publisher also expires if it does not publish within 2 days. So add
it again only when a release is ready, with exactly the values in step 5, and allow `npm publish`:
a trusted publisher created after 2026-09-03 allows only `npm stage publish` unless you choose
more. A failed publish publishes nothing; fix the values and re-run the job on the same tag.

### How the first version was published

npm adds a trusted publisher only to a package that already exists, so 0.1.0 could not use
trusted publishing. The release workflow published it from the `v0.1.0` tag, with provenance,
using a one-off granular token kept as the `npm` environment secret `NPM_BOOTSTRAP_TOKEN`. The
secret was then deleted and the token revoked. 0.1.1 was the first version published by trusted
publishing.

The publish step still reads `NPM_BOOTSTRAP_TOKEN` if the secret exists, for a package that does
not exist yet. This package never needs it again. Do not add the secret: while it is set, the
workflow publishes with the token instead of trusted publishing.

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
