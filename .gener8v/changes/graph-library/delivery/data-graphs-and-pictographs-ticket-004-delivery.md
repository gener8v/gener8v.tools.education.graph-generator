# TICKET-004: Published image set — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-004
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-033: Image set with unique names and plain-English descriptions
- DGP-REQ-034: Only images licensed compatibly with the package license
- DGP-REQ-035: Image names listed in the vocabulary and the published schema
- DGP-NFR-005: Every image has a recorded compatible license — verified by a CI check that fails on an image without a manifest license entry

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| AD-008, AD-011, AD-012 | present | `.gener8v/technical-design/system-design.md` | ✅ |
| prd/CC-001, CC-003, CC-004, TC-007 | present | `.gener8v/constraints/prd.md` | ✅ |
| EXT-001, RD-002, RES-009 | present | `.gener8v/dependencies/dependency-map.md` | ✅ |
| Scene node types (CPSE TICKET-002) | `src/layout/scene.ts` | present: node kinds `line`…`svg`; a closed attribute set (`REACT_PROP`) with no `id`, `href`, `class`, `style`; `checkScene` (`src/layout/kit/check.ts`) rejects unrounded numbers and `url(…)` | ✅ |
| Package license | MIT | `package.json` `"license": "MIT"`, `LICENSE` present | ✅ |
| Side-effect-free modules (TC-007) | `sideEffects: false` | `package.json` `"sideEffects": false` | ✅ |
| CI workflow and a script pattern to follow | `.github/workflows/ci.yml`, `scripts/*.ts` run with `tsx` | present; `check:deps` is the pattern (pure function + `tsx` entry) | ✅ |
| `src/images/` | absent (this ticket creates it) | absent | ✅ |
| Schema generator reads the image list (AC 5) | generator reads `getImageNames()` | the generator reads only definitions (GSV TICKET-005 DEL-008, carried CR-003): the pictograph definition (DGP TICKET-005) builds its `unitImage` enum from `getImageNames()` and the descriptions | ⚠️ Read as carried CR-003 says; proven here with a stand-in definition |
| Image supplier (DGP OQ-001, OQ-002; EXT-001) | open | open | ⚠️ Drawn in-house under MIT; the final set needs Product Owner sign-off (flagged in Notes) |
| Carried: GSV TICKET-005 CR-003 (generator does not read the manifest) | addressed here | — | 🔁 Carried |

**Resolved from ground truth (not escalated):** The schema generator needs no change: an `enum` property with `values` and `valueDescriptions` is already published as a JSON Schema `enum` and listed with each value's description in the vocabulary (`src/core/schema.ts` `termUse`), so exposing the names and descriptions is enough for DGP TICKET-005.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-14

Decisions taken with the plan: the first set is eight images — apple, ball, book, fish, flower, person, star, tree (DEL-001); the manifest is built from the image modules it imports, so each fact is written once (DEL-002).

### Planned Files

- `src/images/types.ts`: `ImageAsset` (`name`, `description`, `license`, `author`, `provenance`, `viewBox` — a 100 × 100 space — and `nodes`, Scene primitives only), `ImageLicense` (`"MIT" | "CC0-1.0"`), `ALLOWED_IMAGE_LICENSES`.
- `src/images/<name>.ts` (eight modules): one side-effect-free module per image — a handful of filled shapes drawn here from basic geometry, every number through `fmt()`; license `MIT`, author `gener8v`, provenance "drawn in-house for this package from basic shapes, 2026-10-14". No text, ids, URLs, raster data or brands.
- `src/images/manifest.ts`: `imageManifest` — name, description, license, author and provenance per image, built from the image modules it imports.
- `src/images/index.ts`: `images: Record<ImageName, ImageAsset>`, the `ImageName` union, `getImageNames()` (manifest order), `imageDescriptions()` (name → description, for DGP TICKET-005's `unitImage` `values` and `valueDescriptions`).
- `scripts/check-image-licenses.ts`: pure `checkImageLicenses(files, manifest)` reporting a file in `src/images/` with no manifest entry, a manifest entry with no file, a license outside MIT / CC0-1.0, a module whose license differs from its entry; a `tsx` entry that lists the directory and exits 1 on any problem.
- `package.json`: `check:images`. `.github/workflows/ci.yml`: an "Image licenses are recorded" step.
- `tests/images/images.test.ts`: unique lower-case kebab-case names; 5 to 20 images; only Scene kinds and attributes, passing `checkScene`; no text nodes, `url(`, `data:` or `id`; a stand-in pictograph definition whose `unitImage` enum is built from `getImageNames()` / `imageDescriptions()` puts each name in the published schema's enum and each description in the vocabulary.
- `tests/images/license-check.test.ts`: the check fails on a fixture image without a manifest entry, with a disallowed license, and with a mismatched license; passes on the real set.

### How Acceptance Criteria Will Be Met

- At least five images, each its own module with `{ name, description, license, author, viewBox, nodes }`, Scene primitives and presentation attributes only: eight modules — `tests/images/images.test.ts`
- Unique lower-case kebab-case names; manifest lists every image; at most 20: `manifest.ts` — `tests/images/images.test.ts`, `pnpm check:images`
- Drawn in-house under MIT, no trademarked character, logo or brand: provenance and license on each module and manifest entry — `tests/images/images.test.ts` (license and provenance); brand-freeness is a content judgement, flagged for Product Owner sign-off
- No external URL, raster data, font or element id: closed Scene attribute set, `checkScene`, no text nodes — `tests/images/images.test.ts`
- `getImageNames()` exposes the list for the schema and vocabulary (through the pictograph definition, carried CR-003): `tests/images/images.test.ts` with a stand-in definition and `buildSchema` / `buildVocabulary`
- DGP-NFR-005: `pnpm check:images` fails on a file without a manifest entry or a disallowed license, and runs in CI — `tests/images/license-check.test.ts`, `pnpm check:images`, the CI step

## Progress

- [x] `src/images/types.ts`
- [x] `src/images/draw.ts` — drawing helpers (not in the plan; see Deviations)
- [x] `src/images/apple.ts`, `ball.ts`, `book.ts`, `fish.ts`, `flower.ts`, `person.ts`, `star.ts`, `tree.ts`
- [x] `src/images/manifest.ts`
- [x] `src/images/index.ts`
- [x] `scripts/check-image-licenses.ts`
- [x] `package.json` — `check:images`
- [x] `.github/workflows/ci.yml` — image license step
- [x] `tests/images/images.test.ts`
- [x] `tests/images/license-check.test.ts` (with `tests/fixtures/images/`)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/images/types.ts`: `ImageAsset<Name>`, `ImageManifestEntry`, `ImageLicense`, `ALLOWED_IMAGE_LICENSES` (MIT, CC0-1.0), `IMAGE_VIEW_BOX` ("0 0 100 100")
- `src/images/draw.ts`: `IN_HOUSE` (license MIT, author gener8v, provenance), `shape()` (every number through `fmt()`), `ring()` (points around a center, for the star and the flower)
- `src/images/apple.ts`, `ball.ts`, `book.ts`, `fish.ts`, `flower.ts`, `person.ts`, `star.ts`, `tree.ts`: one image each, 1 to 7 shapes, drawn in-house from basic shapes
- `src/images/manifest.ts`: `imageAssets` (the eight, in order) and `imageManifest` (the license register, built from them)
- `src/images/index.ts`: `images` (null prototype, frozen), `ImageName` union, `getImageNames()`, `imageDescriptions()`, re-exports
- `scripts/check-image-licenses.ts`: `checkImageLicenses(files, register)`, `readImageFiles(dir)`, `NON_IMAGE_FILES`; `tsx` entry exiting 1 on any problem (optional directory argument)
- `package.json`: `check:images`; `.github/workflows/ci.yml`: "Image licenses are recorded" step
- `tests/images/images.test.ts` (11 tests), `tests/images/license-check.test.ts` (5 tests), `tests/fixtures/images/` (`listed.ts`, `stray.ts`, `manifest.ts`)

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | generated files unchanged (no type reads the images yet) |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | includes the `ImageName` union type test |
| `pnpm test` | 1, 1, 0 | 32 files, 868 tests; runs 1 and 2 failed only `tests/layout/circle.test.ts` › "keeps the Scene small and the run short…" on its 2,000 ms bound (2,054 ms; the load flake recorded since DGP TICKET-001), run 3 all passed |
| `pnpm bench` | 0 | — |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | "Images: 8, every license recorded and allowed (MIT, CC0-1.0)." |
| `pnpm size` | 0 | unchanged: `.` 15.34 kB, `./core` 12.41 kB, `./circle` 15.27 kB (no entry imports the images yet) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation checks (scratchpad backups, restored) | — | removing the no-entry check, the license allow-list, or the entry-without-file check each fails `tests/images/license-check.test.ts` |
| Visual check | — | the eight drawings rendered to a contact sheet (scratchpad, via Quick Look) and inspected: each reads as its name |

## Acceptance Criteria Verification

- [x] At least five images, each in its own module `src/images/<name>.ts` as `{ name, description, license, author, viewBox, nodes }` with Scene primitives and presentation attributes only — eight modules; `tests/images/images.test.ts` › "has between 5 and 20 images…", "use only Scene primitives and presentation attributes, every number through fmt()" (`checkScene` on each)
- [x] Names unique, lower-case kebab-case; `manifest.ts` lists every image with name, description, license and author; at most 20 — `tests/images/images.test.ts` › "names each image once…", "describes each image…and the manifest repeats the image's own facts"; `pnpm check:images` (exit 0)
- [x] Every image drawn in-house and licensed MIT — `tests/images/images.test.ts` › "are drawn in-house and released under the package license". **No trademarked character, logo or brand** is a content judgement no test can make: the eight are generic objects drawn from basic shapes (inspected visually); Product Owner sign-off on the set is pending (EXT-001, see Notes)
- [x] No external URL, raster data, font or element id — `tests/images/images.test.ts` › "hold no text, element id, external URL or raster data"; the Scene attribute set has no `id`/`href`/`class`/`style` (`checkScene`)
- [x] `getImageNames()` exposes the list, and the schema and vocabulary carry it through the pictograph definition (carried GSV TICKET-005 CR-003) — `tests/images/images.test.ts` › "publishes every name as an allowed unitImage value in the schema", "lists every name with its description in the vocabulary" (stand-in pictograph, `buildSchema` / `buildVocabulary`)
- [x] DGP-NFR-005: `scripts/check-image-licenses.ts` fails when a file in `src/images/` lacks a manifest entry or has a license outside MIT / CC0-1.0, and runs in CI via `pnpm check:images` — `tests/images/license-check.test.ts` (fixture image without an entry; disallowed license; command line exits 1 on the fixture directory, 0 on the published set); CI step added to `.github/workflows/ci.yml` (runs on the next push; not executed here)

## Decisions Made

### DEL-001: The first set is eight images

**Context:** The ticket asks for at least five (for example apple, star, book, ball, person); AD-012 caps the set at 20; names become a public contract (RES-009).
**Decision:** apple, ball, book, fish, flower, person, star, tree — common classroom pictograph units, each a few filled shapes in a 100 × 100 space. Chosen by the user with the plan.
**Rationale:** Enough choice for typical pictographs, plain durable names, room left under the cap; adding images later is not a breaking change.
**Ticket Impact:** None.

### DEL-002: The manifest is built from the image modules

**Context:** The ticket asks for a manifest listing name, description, license and author, and a CI check that fails on an image without an entry.
**Decision:** `manifest.ts` imports each image module (`imageAssets`) and builds `imageManifest` from the images' own fields, so each fact is written once. The check fails on any file in `src/images/` the manifest does not import (besides `NON_IMAGE_FILES`), a disallowed license, an entry without a file, a misnamed image, or a license that differs from its entry. Chosen by the user with the plan.
**Rationale:** No description or license can drift between two copies; the check still catches the failure DGP-NFR-005 names — an image shipped without a recorded license.
**Ticket Impact:** None.

### DEL-003: Images record provenance, and their names are a typed union

**Context:** The ticket's Known Hazards ask for provenance per image; DGP TICKET-005 needs the names for an enum.
**Decision:** `ImageAsset` gains `provenance` (also in the register), and is generic over its name, so `ImageName` is the union of the eight names.
**Rationale:** The register says where each drawing came from; the pictograph can type `unitImage` exactly.
**Ticket Impact:** `ImageAsset` has one field more than the ticket's `{ name, description, license, author, viewBox, nodes }`.

## Deviations from Plan

- `src/images/draw.ts` added: `IN_HOUSE`, `shape()` and `ring()` keep each image module short and route every number through `fmt()`. It is listed in `NON_IMAGE_FILES`, so the license check skips it.
- `tests/fixtures/images/` added for the license check's failing case and the command-line exit test.
- The planned "module whose license differs from its manifest entry" check stays, although a manifest built from the modules cannot differ today; it guards a hand-edited register.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-033 | `src/images/types.ts`:ImageAsset; `src/images/<name>.ts`:each image; `src/images/manifest.ts`:imageAssets; `src/images/index.ts`:images, imageDescriptions | `@spec DGP-REQ-033` (with 034 / 035 where listed) |
| DGP-REQ-034 | `src/images/types.ts`:ALLOWED_IMAGE_LICENSES, ImageAsset; `src/images/manifest.ts`:imageAssets, imageManifest; `scripts/check-image-licenses.ts`:checkImageLicenses | `@spec DGP-REQ-034` |
| DGP-REQ-035 | `src/images/index.ts`:getImageNames, imageDescriptions | `@spec DGP-REQ-035` |
| DGP-NFR-005 | `src/images/manifest.ts`:imageManifest; `scripts/check-image-licenses.ts`:checkImageLicenses | `@spec DGP-NFR-005` |

## Notes

- **Product Owner sign-off needed (EXT-001, DGP OQ-001, OQ-002):** the eight images were drawn in-house from basic shapes and released under MIT. Whether this is the published set, and whether consumers may supply their own images, is still the Product Owner's decision. Names are a public contract once released (RES-009).
- **For DGP TICKET-005:**
  - Build the pictograph's `unitImage` enum as `{ kind: "enum", values: getImageNames(), valueDescriptions: imageDescriptions() }` (`tests/images/images.test.ts` shows it publishes correctly).
  - Look images up in `images`, which has a null prototype, so a name such as `constructor` finds nothing.
  - Place copies of `image.nodes` in a nested `svg` with `viewBox` `IMAGE_VIEW_BOX`; a partial image clips with the nested svg's width (AD-008).
  - The images add about 3–4 kB before gzip to the pictograph bundle; measure with `pnpm size` once the entry exists (TR-004).
- **Contrast:** the drawings use dark, saturated fills. The flower's yellow center (`#f9a825`) and the book's label (`#e1bee7`) are details on a darker shape, not the shape's outline against the background.
- **Flaky test (outside this ticket):** `tests/layout/circle.test.ts`' 2,000 ms timing bound now fails one to two full runs in three. CI will hit it. A trivial fix (a larger bound, or counting work instead of time) waits on the user's decision.
- **Tooling:** the plugin's PreToolUse hook again reported "no delivery is In Progress" while this record said `**Status:** In Progress`; this is the known first-4,000-characters limitation.

## Post-Review Amendments

### Code review — `graph-library/data-graphs-and-pictographs-ticket-004-code-review` (2026-10-14, Approved with Notes)

- **CR-001** — `scripts/check-image-licenses.ts`:
  - `readImageFiles` returns `{ files, others }`. `others` is every directory entry that is neither one of `NON_IMAGE_FILES` nor a `<kebab-name>.ts` file (`IMAGE_FILE`), plus every subfolder.
  - `checkImageLicenses(files, register, others)` reports each one. Entries are sorted in code-unit order.
  - New `runImageCheck(dir)`, which the command line wraps.
  - Tests in `tests/images/license-check.test.ts` use a temporary directory holding `.tsx`, `.mts`, `.svg`, `Cat.ts` and `animals/` (all reported). The fixture run names `stray.ts`.
  - The command-line spawn test is replaced by the in-process `runImageCheck` test. By hand, the command line exits 1 on `tests/fixtures/images` and 0 on `src/images`.
- **CR-003** — `eslint.config.js` `NON_RENDERING_DIRS` and `tests/package/boundaries.test.ts` now include `images`.
- **CR-005** — the DGP-REQ-033 coverage row lists one `path`:symbol per image module. Correction to Files Produced: each image has **1 to 8 shapes** (the flower has 8), not 1 to 7.
- **CR-002, CR-004** — deferred to DGP TICKET-005 (Known Hazards appended). DGP-REQ-035 is exposed here and published in the schema and vocabulary by DGP TICKET-005's pictograph definition. The spec's coverage row says so.
- **Trivial test fix alongside (user-approved):** `tests/layout/circle.test.ts`'s flaky 2,000 ms assertion is removed (commit `b48d1a4`, recorded under GSS TICKET-002's amendments). This delivery's earlier `pnpm test` exits of 1 were that test alone.
- **Re-verification:**
  - `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` all exit 0.
  - `pnpm test` (32 files, 872 tests) exits 0 on three consecutive runs.
  - Reverting the CR-001 entry filter fails its test.

### Quality review — `graph-library/data-graphs-and-pictographs-ticket-004-quality-review` (2026-10-14, Approved)

- **QR-005, QR-002** — each image module now states `license: "MIT"`, `author` and its own `provenance`; `IN_HOUSE` is gone. Images are built with `defineImage()` (`src/images/types.ts`), which deep-freezes them; `imageAssets` and `imageManifest` are frozen.
- **QR-006** — every drawing helper and table builder is marked `@__NO_SIDE_EFFECTS__`:
  - drawing helpers: `shape`, `ring`, and new `points` and `circlesAround` (`src/images/draw.ts`); `defineImage`; `tree.ts`'s `leaves`;
  - table builders: `registerOf` in `manifest.ts` and `byName` in `index.ts`.

  Importing only a constant bundles 71 B instead of 4.8 kB. `tests/images/bundle.test.ts` pins it.
- **QR-004** — `getImageNames()` returns `readonly [ImageName, ...ImageName[]]`.
- **QR-001** — tests for bounds, for `ring()`, and a drawing snapshot (`tests/images/__snapshots__/images.test.ts.snap`).
- **QR-007, QR-008, QR-009** — `scripts/check-image-licenses.ts`:
  - `main(args)` runs in-process, and the command line sets `process.exitCode` from it;
  - messages name the directory that was checked;
  - a missing or malformed register is reported as a problem instead of crashing;
  - success prints the register.

  The tests now create their temporary directories in `beforeAll`.
- **QR-003** — `CONTRIBUTING.md`: `check:images`, the lint boundary, and "Adding a pictograph image".
- **DGP TICKET-005** — Known Hazard correction appended: what bundles the drawings, and that `getImageNames()` needs no cast.
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (881 tests) exits 0 on three runs. The drawing snapshot is unchanged by the refactor.

### Security review — `graph-library/data-graphs-and-pictographs-ticket-004-security-review` (2026-10-14, Approved, 0 accepted risks)

- **SEC-001** — `tests/images/images.test.ts` checks every image attribute value against an allowlist. `src/layout/kit/check.ts` (`checkScene`) rejects a backslash in any string value, with a test in `tests/layout/kit/check.test.ts`; also recorded under CPSE TICKET-002's amendments.
- **SEC-002** — a new `eslint.config.js` block lets an image module import only `./draw` and `./types`, with tests in `tests/package/boundaries.test.ts`. `CONTRIBUTING.md` now gives one consistent licensing rule.
- **SEC-004** — `IMAGE_LICENSE_NOTICES` is in `src/images/types.ts` and re-exported from the index. The MIT notice is a folded string literal kept identical to `LICENSE` by a test, so it is dropped from bundles that don't use it. Known Hazard added to CPSE TICKET-005.
- **SEC-003** — deferred to DGP TICKET-005 (Known Hazard).
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (890 tests) exits 0 on three runs, and the drawing snapshot is unchanged.

