# Versioning and releases

This package follows [semantic versioning](https://semver.org). This page says what the public
contract is, how version numbers change while the package is `0.x`, and how a release is made.

## The public contract

These five things are the contract. A change to any of them can break code that uses the package.

- **The description.** The unified JSON description of a graph, and what each valid description draws.
- **The vocabulary.** The terms, their definitions and the values they accept.
- **The issue codes.** The `code` of each issue the validator reports.
- **The tool definition.** `graphTool`, its schema and the result of `handleGraphToolCall`.
- **The component inputs.** The props of `Graph` and of the per-type components.

Rendered pixels are not part of the contract. The same description can look a little different
from one version to the next. Its meaning does not change.

## What changes the version

A change is breaking when a description that was valid is now refused, or is drawn with a
different meaning. The same holds for a removed or renamed term, issue code or prop.

| Change | Before `1.0.0` | From `1.0.0` |
|--------|----------------|--------------|
| A breaking change | minor (`0.2.0` to `0.3.0`) | major |
| A new graph type, term or option | minor | minor |
| A fix that breaks no valid description | patch | patch |

Semantic versioning allows breaking changes in a minor release while the major version is `0`.
This package uses that rule until `1.0.0`. Version `1.0.0` declares the description stable. We
do not publish `1.0.0` to satisfy the rule early. After it, a change that invalidates or changes
the meaning of a valid description ships only in a new major version.

### Worked example: the text limits

A title, label or unit longer than its text limit is now reported as an issue (GSV-REQ-052,
GSV-REQ-053; the limits are on the documentation site's vocabulary page). Before, the package
accepted it. A description that was valid is now refused, so this is a breaking change.

While the package is `0.x`, it ships in a minor release. Its changeset starts with `Changed:`, so
the changelog lists it under "Changed". From `1.0.0` the same change needs a major release.

## Writing a changeset

Run `pnpm changeset` in every pull request that changes published behavior. Choose the bump from
the table above. Start the summary with `Added:`, `Changed:`, `Deprecated:`, `Removed:` or
`Fixed:`. `CHANGELOG.md` groups each release under these headings.

## How a release is made

Only the release workflow (`.github/workflows/release.yml`) publishes. Nobody publishes by hand.

1. A push to `main` opens or updates the version pull request. It bumps the version, groups
   the changelog and refreshes `src/generated/version.ts`.
2. A maintainer reviews and merges that pull request.
3. A maintainer pushes the tag `v<version>`, for example `v0.3.0`. The tag must match the
   version in `package.json`.
4. The workflow runs every check, including the install and browser checks, in a job that
   cannot publish.
5. If they pass, a second job builds the package and publishes it with provenance. It uses npm
   trusted publishing, so no npm token is stored in the repository.
6. The job then checks that the registry holds the provenance attestation for that version. It
   fails if the attestation is missing.

Publishing is switched off until the repository variable `NPM_PUBLISH_ENABLED` is `true`. A manual
run of the workflow does a dry run and never publishes.

## What the provenance check proves

The attestation links the published files to one workflow run in this public repository, at one
commit. It proves the package was built by CI from public source. It does not prove the code
is free of defects. It does not cover the packages this one depends on.

To check a version yourself, install it and run `npm audit signatures`.

## Fixing a bad release

Never unpublish a version. Others may depend on it, and a removed version breaks their installs.

- Fix the defect in a new version.
- Deprecate the bad version with `npm deprecate "@gener8v/graph-generator@<version>" "<message naming the fixed version>"`.

A deprecated version stays installable. Its users see the message when they install it.
