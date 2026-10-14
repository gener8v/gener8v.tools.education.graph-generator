# TICKET-004: Published image set — Quality Review

## Summary

I reviewed the published image set at HEAD (`86de29d`). That is delivery commit `915a472` plus the code-review fixes for CR-001, CR-003 and CR-005. Commit `b48d1a4`, between the two, changes only the circle's test.

The production code is small, well organized and readable. The license check is its strongest part: all ten mutations of its logic fail a test. Lint, typecheck, the full suite (32 files, 872 tests) and `pnpm check:images` all pass.

The findings concern what the tests leave unpinned in the drawings themselves, image data that is only partly frozen, and the edges around the check: its command line, its messages, and the contributor guide. There are 9 findings: 0 Critical, 1 Concern and 8 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-14)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-004-delivery.md` (DEL-001..003, Post-Review Amendments CR-001, CR-003, CR-005)
**Code review read first:** `.gener8v/changes/graph-library/reviews/data-graphs-and-pictographs-ticket-004-code-review.md`. Its five findings are not raised again. CR-001, CR-003 and CR-005 are resolved; CR-002 and CR-004 are deferred to DGP TICKET-005. Two findings here touch the Known Hazards those deferrals added to TICKET-005:
- QR-004: the hazard's recipe for `unitImage` does not compile as written.
- QR-006: the hazard's statement that "importing anything from `src/images/index.ts` brings in all eight drawings" holds for the names but not for the constants.

**Files Reviewed:**
- `src/images/types.ts`
- `src/images/draw.ts`
- `src/images/apple.ts`
- `src/images/ball.ts`
- `src/images/book.ts`
- `src/images/fish.ts`
- `src/images/flower.ts`
- `src/images/person.ts`
- `src/images/star.ts`
- `src/images/tree.ts`
- `src/images/manifest.ts`
- `src/images/index.ts`
- `scripts/check-image-licenses.ts`
- `package.json` (`check:images`)
- `.github/workflows/ci.yml` ("Image licenses are recorded")
- `eslint.config.js` (`NON_RENDERING_DIRS`)
- `tests/images/images.test.ts`
- `tests/images/license-check.test.ts`
- `tests/fixtures/images/listed.ts`, `tests/fixtures/images/stray.ts`, `tests/fixtures/images/manifest.ts`
- `tests/package/boundaries.test.ts` (the `images` entry)
- Read for pattern consistency, unchanged here:
  - `scripts/check-dependencies.ts` and `tests/package/checks.test.ts` (the script pattern);
  - `src/layout/kit/format.ts`, `src/layout/kit/check.ts`, `src/layout/scene.ts`, `src/layout/registry.ts`;
  - `src/core/definitions/types.ts`, `src/core/definitions/index.ts`, `src/core/style.ts`, `src/core/issues.ts`;
  - `tests/package/node-entry.test.ts` (temporary-directory pattern), `tests/setup/build.ts`, `vitest.config.ts`, `tsconfig.json`;
  - `CONTRIBUTING.md`;
  - `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-004.md` and `TICKET-005.md` (Known Hazards).

**Findings:** 9
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 8

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **The structure is clear:**
  - one side-effect-free module per image;
  - `types.ts` for the contract and `draw.ts` for the drawing helpers;
  - `manifest.ts` for the list and the license register;
  - `index.ts` for the lookups.
- **Each fact is written once.** The register is built from the image modules (DEL-002), and `ImageName` is derived from the `as const` list (DEL-003), so neither the register nor the type can drift from the images.
- **The script follows `scripts/check-dependencies.ts`:** a pure exported rule (`checkImageLicenses`) and a `tsx` entry guarded by `process.argv[1]`. Reading the directory (`readImageFiles`) and running the whole check (`runImageCheck`) are separate from the rule, so the rule is tested without touching the file system.
- **Dependency direction.** The images import `fmt`/`fmtPoints` from the layout kit and the Scene types. The resulting core → layout edge is deferred to DGP TICKET-005 (code review CR-004) and is not raised again.
- **Weak spots:**
  - the license and provenance for every image sit in the geometry helpers (`IN_HOUSE` in `draw.ts`, QR-005);
  - the shared tables are only partly frozen (QR-002);
  - they are not marked pure for the bundler (QR-006).
- **Performance: nothing to flag.** Loading the set makes a few dozen `fmt()` calls. `getImageNames()` and `imageDescriptions()` build a fresh list on each call, and a definition calls them once.

### Readability

**Rating:** Strong
**Notes:**
- **Each image module reads as a drawing:** a name, a one-sentence description, and a few shapes with literal coordinates in a 100-unit space. `tree.ts`'s `leaves` helper and the flower's `ring(…).map` cut repetition without hiding the geometry.
- **Doc comments say why** and cite the decision behind each rule (AD-007, AD-012, EXT-001, code review CR-001), in the codebase's style.
- **`checkImageLicenses` (`scripts/check-image-licenses.ts:36-71`) is easy to follow.** Its doc lists the problems in the order the code checks them, and every message says what to do.
- **Hand-written `d` strings are a documented deviation, not a finding.** The modules write `d` strings by hand rather than through the kit's `pathData()`. `pathData()` is at `src/layout/kit/format.ts:34`, and `src/layout/scene.ts:97-98` describes `d` values as built with it. The deviation is deliberate and stated (`src/images/draw.ts:11-14`). It keeps the art legible, and `checkScene` in the test catches an unrounded number inside a string.
- **Also not findings:**
  - `src/images/index.ts:13` is dense, but it mirrors the registries.
  - The test's `KEBAB_CASE` (`tests/images/images.test.ts:19`) restates the script's `IMAGE_FILE` (`scripts/check-image-licenses.ts:10`). A test stating the naming rule independently is reasonable, and the check enforces it anyway, since an image's name must equal its kebab-case file name.

### Error Handling

**Rating:** Adequate
**Notes:**
- **The check fails closed and collects problems rather than throwing:**
  - any other directory entry is reported without being loaded (CR-001);
  - so are a file with no image and an image not named after its file;
  - an image with no register entry, and a register entry with no file;
  - a disallowed license, in a file or in the register;
  - and a license that differs from its entry.

  Each problem gets one message.
- **The library side fails loudly:**
  - Every drawing number passes through `fmt()`, which throws `RangeError` on a non-finite or exponent-sized value. A bad drawing would therefore break its module's import, which any test catches.
  - `images` has a null prototype, so a `unitImage` such as `constructor` finds nothing (tested).
- **Gaps:**
  - The register is read through an unchecked cast. A `manifest.ts` without `imageManifest` crashes inside the rule with a `TypeError` (QR-008).
  - Files in `NON_IMAGE_FILES` are never loaded, so an image exported from `draw.ts` or `index.ts` would be invisible to the check. Today none of the four exports anything image-shaped (an object with `name`, `license` and `nodes`), and a test could assert that. Noted, not a finding.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD (`86de29d`):**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 32 files, 872 tests passed (5.12 s) |
| `pnpm check:images` | 0 | "Images: 8, every license recorded and allowed (MIT, CC0-1.0)." |
| `pnpm exec tsx scripts/check-image-licenses.ts tests/fixtures/images` | 1 | `src/images/stray.ts: the image "stray" has no entry in src/images/manifest.ts.` (expected failure; see QR-008 on the path) |
| `pnpm exec vitest run tests/images tests/package/boundaries.test.ts --reporter=verbose` | 0 | 3 files, 123 tests. `images.test.ts` 11, `license-check.test.ts` 6, and the three `src/images` boundary cases (React import, `react-dom/server`, `window`/`document`) |

- `pnpm test`'s global setup (`tests/setup/build.ts`) ran `pnpm build`, which rewrote the gitignored `dist/`.
- `git status --short` after every command and probe showed only `.gener8v/runs.jsonl`, which the hooks write.
- `pnpm generate` writes source, so it was not run. The code review re-ran it, together with `bench`, `size`, `publint`, `attw` and `audit`, at the fixes.

**What the tests cover well:**
- Every acceptance criterion has a test whose name describes it.
- The tests check behaviour, not internals:
  - the published set through `images`, `getImageNames()` and `imageManifest`;
  - the drawings through `checkScene`;
  - the schema and vocabulary through `buildSchema` and `buildVocabulary` on a stand-in pictograph;
  - the license check through its own rule, a fixture directory and a temporary directory of wrong-shaped entries.
- **The license check's logic is fully pinned.** Each of ten mutations (C1–C10 below) fails at least one test, because the tests compare the whole problem list with `toEqual`.
- The null-prototype lookup, the closed `ImageName` union (`expectTypeOf`), the 5–20 count and the size budget are pinned.

**Gaps, measured with mutations and probes:**
- **Harness.**
  - Mutations ran on a copy of `src/`, `scripts/`, `tests/images/` and `tests/fixtures/images/` in the session scratchpad.
  - The copy was run with the repository's own Vitest by absolute path and a scratch config that aliases `vitest`. Each file was restored from the repository after its run.
  - The probes import the repository's source read-only from scratch scripts.
- **QR-001.** Six changes to the art pass all 17 image tests. They are M1, M2, M4, M5, M13 and M14: drawing outside the 100 × 100 box, `ring()` rotated or its radii swapped, white petals, and a four-pointed "five-pointed" star.
- **QR-002.** The freeze state is pinned at the top level only (M12).
- **QR-007.** The command line around `runImageCheck` is untested (M7, M11).
- **QR-009.** A filtered run leaves the CR-001 test's temporary directory behind.
- **Also unpinned (not findings):**
  - the success count (M9);
  - the `nodes` key in `isImage` (M10);
  - the code-unit sort (M8). It survives here because APFS lists entries in order, but a file system with another order would fail the `others` assertion.

**Mutation results:**

| Mutation (on the copy) | Result |
|---|---|
| M1: the ball's radius 42 → 60, so it spans −10 to 110 (`src/images/ball.ts:14`) | survives: QR-001 |
| M2: the apple's left side moved to x −30 (`src/images/apple.ts:12`) | survives: QR-001 |
| M3: `shape()` without `fmt()` (`src/images/draw.ts:16`) | caught (1 test), only through the flower's non-integer ring centres |
| M4: `ring()` starts at 3 o'clock, not straight up (`src/images/draw.ts:25`) | survives: QR-001. Star and flower rotated |
| M5: `ring()` inner and outer radii swapped (`src/images/draw.ts:24`) | survives: QR-001 |
| M6: `images` built on `{}` instead of a null prototype (`src/images/index.ts:13`) | caught (1 test) |
| M7: `process.exit(1)` removed (`scripts/check-image-licenses.ts:113`) | survives: QR-007 |
| M8: code-unit sort removed (`scripts/check-image-licenses.ts:84`) | survives on APFS (minor) |
| M9: `imageCount` hard-coded to 8 (`scripts/check-image-licenses.ts:106`) | survives (minor) |
| M10: `isImage` no longer requires `nodes` (`scripts/check-image-licenses.ts:75`) | survives (harmless) |
| M11: default directory `src` instead of `src/images` (`scripts/check-image-licenses.ts:110`) | survives: QR-007 (CI would then fail loudly) |
| M12: register entries not frozen (`src/images/manifest.ts:24`) | survives: QR-002 |
| M13: the flower's petals white (`src/images/flower.ts:27`) | survives: QR-001 |
| M14: the star drawn with four points (`src/images/star.ts:13`) | survives: QR-001. Contradicts its published description |
| C1: no "has no entry" problem (`scripts/check-image-licenses.ts:60`) | caught (2 tests) |
| C2: file license not checked against the allow-list (`:56`) | caught (1 test) |
| C3: register license not checked against the allow-list (`:67`) | caught (1 test) |
| C4: no "has no image file" problem (`:68`) | caught (1 test) |
| C5: no license-mismatch problem (`:61`) | caught (1 test) |
| C6: no misnamed-image problem (`:55`) | caught (1 test) |
| C7: no "exports no image" problem (`:51`) | caught (1 test) |
| C8: `others` ignored (`:44`) | caught (1 test) |
| C9: any `.ts` file loaded, not only `IMAGE_FILE` names (`:89`) | caught (1 test) |
| C10: subfolders skipped instead of reported (`:89`) | caught (1 test) |

**Probes (scratch, read-only on the repository):**
- **Bounds.** Every drawing is inside its box today, counting stroke width and Bézier control points:

  | Image | x | y |
  |---|---|---|
  | apple | 8–92 | 6–96 |
  | ball | 6.5–93.5 | 6.5–93.5 |
  | book | 14–86 | 10–90 |
  | fish | 10–94 | 20–70 |
  | flower | 23.7–80 | 7–94 |
  | person | 26–74 | 8–94 |
  | star | 5.3–94.8 | 7–92.2 |
  | tree | 14–86 | 10–94 |

- **Freeze state.** See QR-002.
- **Bundles** (repository esbuild): see QR-006.
- **Type check** of the TICKET-005 recipe: see QR-004.
- **Temporary directory and crash paths:** see QR-009 and QR-008.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **The library side adds no logging, which is right.** This is a library with no runtime network and no telemetry by design (`.gener8v/context.md`), and nothing under `src/` logs.
- **The check reports in the shape of `check:deps`:**
  - one line per problem on stderr;
  - a one-line summary on stdout;
  - exit 1 on any problem.

  The CI step is named for what it proves ("Image licenses are recorded"). Every message names the file and says what to do.
- **Gaps (QR-008):**
  - The messages always say `src/images/`, whichever directory was checked.
  - A register exported under another name fails with a `TypeError` at a line inside the check.
  - On success the command prints only a count. DEL-002 makes the register exist only at runtime, so a CI log is the natural place to show it, and today none does.
- **The exit code is untested (QR-007).** It is what makes the check a gate.

## Findings

### QR-001: The drawings and `ring()` are unpinned: six changes to the art, including drawing outside the 100 × 100 box, pass the whole suite

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests: `tests/images/images.test.ts:78-103` (the "image drawings" block).
- Code: `src/images/draw.ts:19-29` (`ring()`), `src/images/types.ts:13-14` (`IMAGE_VIEW_BOX`) and `:30-31` (`viewBox`, "the image's own coordinate space").

**Description:** What the tests assert about the drawings:
- each passes `checkScene`: numbers through `fmt()`, the closed attribute set, no `url(`;
- no text node, id, `href`, `class`, `style`, URL or `data:`;
- at most 8 nodes each, and under 8,000 characters for the whole set.

They never assert where a drawing sits or what it draws. On a scratch copy, each of these passes all 17 image tests (table under Test Coverage):
- the ball's radius changed from 42 to 60, so it spans −10 to 110 (M1); the apple's left side moved to x −30 (M2);
- `ring()` starting at 3 o'clock instead of straight up (M4), or with its inner and outer radii swapped (M5). Both silently redraw the star and the flower;
- the flower's petals white (M13);
- a four-pointed star (M14), whose published description still reads "A five-pointed golden star."

`ring()` has a documented contract, "starting straight up, alternating `outer` and `inner` radii" (`src/images/draw.ts:19`), and no direct test. A `shape()` that skips `fmt()` (M3) is caught, but only because the flower's ring centres happen not to be whole numbers.

Today every drawing is inside its box. The closest to an edge is the star, at 5.3 units, counting stroke width and Bézier control points (probe table under Test Coverage).

**Impact:**
- The pictograph places each image in a nested `svg`, which clips (AD-008; delivery record Notes). A drawing that leaves its 100 × 100 box loses that part in every pictograph, and no test fails.
- The set is meant to grow toward 20 images (AD-012), each a hand-written literal on the shared `shape()` and `ring()`. Changing `ring()` for a new image would redraw the star and the flower without any test noticing.
- The only check of the art is the delivery's manual contact sheet. The descriptions are published in the vocabulary, so a drawing that drifts from its description misleads every model and author who reads it.

**Recommendation:** In `tests/images/images.test.ts`:
- **Add a bounds test:** each image's extent lies within 0–100. Take it from circle, ellipse and rect attributes, polygon points, and path coordinate pairs (a Bézier lies inside its control points), plus half the stroke width. The 20-line probe used for this review is a starting point.
- **Test `ring()` directly:**
  - the first point is at (cx, cy − outer);
  - it returns `count` points without `inner`, and `2 × count` with it;
  - the distances from the centre alternate between `outer` and `inner`.
- **Pin each drawing's nodes with a snapshot,** either `toMatchFileSnapshot` per image or one inline snapshot. Any change to a drawing, or to `shape()` and `ring()`, then becomes a diff a reviewer approves. The codebase already pins public lists this way (`tests/core/issues.test.ts:58`, `tests/core/definitions.test.ts:201`).

**Status:** Resolved
**Resolution:** Resolved — `tests/images/images.test.ts` adds a bounds test (every shape inside 0–100), two `ring()` tests (start straight up, even spacing, alternating radii, ten points for a five-pointed star) and a file snapshot of each drawing (`tests/images/__snapshots__/images.test.ts.snap`). Re-running the reviewer's art mutations (four-pointed star, ball outside the box, rotated `ring()`, white petals) now fails tests. Approved by the user, 2026-10-14.

---

### QR-002: The image data is only partly frozen, unlike the codebase's other shared tables

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/images/index.ts:12-14` (`images`, frozen one level deep).
- `src/images/manifest.ts:19` (`imageAssets`) and `:23-25` (`imageManifest`: entries frozen, the array not).
- `src/images/draw.ts:15-17` (`shape()` returns mutable nodes).
- Each image module's asset, for example `src/images/apple.ts:5-27`.
- `tests/images/images.test.ts:63` (asserts `Object.isFrozen(images)` only).

**Description:** A scratch probe of the loaded modules found:
- **Frozen:** `images` (its own keys) and each `imageManifest` entry.
- **Not frozen:** `imageAssets`, the `imageManifest` array, every asset, its `nodes`, each node, and each node's `attrs`.

After `images.apple.nodes.push(…)`, `images.apple.license = "CC-BY-NC-4.0"` and `imageManifest.push(…)` (through casts):
- the apple has 4 nodes and license CC-BY-NC-4.0;
- the register still says MIT for it;
- the register lists 9 images.

Mutation M12 (register entries not frozen) passes the suite.

The codebase's pattern for shared published data is to freeze it all the way down, "so … no module can change the vocabulary at runtime" (`defineProperties`, `src/core/definitions/types.ts:158-163`). `seriesStyles` freezes both the list and each entry (`src/core/style.ts:89-99`).
**Impact:**
- These tables are module singletons, shared by every render in a long-lived server process.
- DGP TICKET-005 will place `image.nodes` into Scenes. The delivery record's Notes ask it to place copies, so safety depends on the next implementer remembering, not on the data.
- `readonly` types stop typed code only. A cast or a JavaScript caller can change a drawing, or a recorded license, for every later pictograph.
- The test's `Object.isFrozen(images)` reads as a guarantee that the data does not have.

**Recommendation:**
- Freeze each image where it is defined:
  - have `shape()` freeze the node, its `attrs` and each pair;
  - freeze each asset and its `nodes`, for example with a small `defineImage()` beside `shape()`;
  - freeze `imageAssets` and the `imageManifest` array.
- Extend the test to assert frozenness all the way down: every asset, `nodes`, node, `attrs` and pair, and both lists.
- DGP TICKET-005 can then place the nodes without copying them.

**Status:** Resolved
**Resolution:** Resolved — `defineImage()` (`src/images/types.ts`) deep-freezes each image, nodes and attribute pairs included; `imageAssets` and `imageManifest` are frozen. A test walks the list and the register for anything unfrozen, and checks that changing apple's license throws. Approved by the user, 2026-10-14.

---

### QR-003: `CONTRIBUTING.md` now misstates the CI checks and the lint scope, and says nothing about adding an image

**Category:** Patterns
**Severity:** Suggestion
**Location:** `CONTRIBUTING.md:35-43` (the list "Further checks that CI runs"), `CONTRIBUTING.md:45-50` ("Code rules the linter enforces"), and the missing guidance on images; `.github/workflows/ci.yml:95-96`; `eslint.config.js:20`.
**Description:**
- **The checks list is incomplete.** `pnpm check:images` runs in CI but is missing from the list, which names every other CI check, `check:deps` included.
- **The lint scope is out of date.** The linter section names `src/core`, `src/tool`, `src/export` and `src/layout` as the directories that must not import React or use browser globals. Code review CR-003 added `src/images` to that rule.
- **The rules for adding an image are not written down in one place.** They are spread across doc comments, the check's messages and the tests:
  - a lower-case kebab-case name, equal to the file name;
  - an import in `manifest.ts`;
  - a license of MIT or CC0-1.0, with author and provenance;
  - a 100 × 100 space and at most 8 shapes;
  - at most 20 images.
- **No check can confirm that a recorded license is true.** The check confirms that it is MIT or CC0-1.0; only the contributor and the reviewer can confirm it is honest. The dependency notes say "Its license must be compatible with MIT". Images, the package's other license surface, have no such statement.

**Impact:**
- `CONTRIBUTING.md` is a contributor's map of what CI enforces, and two of its statements are now wrong.
- An image is the likeliest outside contribution, for example a teacher's own pictograph. A third-party drawing recorded as MIT is exactly what prd/CC-001 and RD-002 guard against, and no check can catch it.

**Recommendation:**
- Add `pnpm check:images  # every image's license is recorded and allowed` to the checks list, and `src/images` to the linter section.
- Add a short "Adding a pictograph image" section covering:
  - the drawing must be your own work, or CC0 with its source recorded as provenance;
  - the file and naming rules, and the import in `manifest.ts`;
  - the 100 × 100 space and the shape budget;
  - names are a public contract once released (RES-009).

**Status:** Resolved
**Resolution:** Resolved — `CONTRIBUTING.md` lists `pnpm check:images`, names `src/images` in the lint boundary, and has an "Adding a pictograph image" section: your own work (MIT) or CC0, kebab-case names, `defineImage`, the 100 × 100 space, at most 8 shapes, the manifest import, and reviewing the snapshot. Approved by the user, 2026-10-14.

---

### QR-004: `getImageNames()` returns a plain array, so the documented recipe for DGP TICKET-005 does not compile

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/images/index.ts:22-24` (`getImageNames`).
- `tests/images/images.test.ts:117` (`getImageNames() as [ImageName, ...ImageName[]]`).
- `src/core/issues.ts:87` (`Terms`, the type of `EnumValue.values`) and `:90` (`asTerms`).
- The recipe for the pictograph's `unitImage`, which appears twice:
  - in the delivery record's Notes ("For DGP TICKET-005");
  - in the CR-002 Known Hazard in `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-005.md`.

**Description:**
- An enum's `values` must be `Terms`, a non-empty tuple. `getImageNames()` returns `ImageName[]`.
- The recipe in both places builds `unitImage` as `{ kind: "enum", values: getImageNames(), valueDescriptions: imageDescriptions() }`. I type-checked that against the repository's source in a scratch file, and it fails: `TS2322: Type '("apple" | "ball" | … | "tree")[]' is not assignable to type 'Terms'. Source provides no match for required element at position 0 in target.`
- The test gets past the error with a cast. The cast would also hide an empty list, which is what `asTerms` exists to catch.

**Impact:** Small. Every consumer has to add a cast or call `asTerms`, and the test models the cast for DGP TICKET-005 to copy. The list is non-empty because of the `as const` tuple `imageAssets`, so `getImageNames()` is the one place that can state it.
**Recommendation:**
- Have `getImageNames()` return `readonly [ImageName, ...ImageName[]]`. That needs one cast inside it, justified by the `as const` tuple, or a check that throws on an empty list.
- Drop the test's cast.
- The recipe in the Notes and the Known Hazard then compiles as written.

**Status:** Resolved
**Resolution:** Resolved — `getImageNames()` returns `readonly [ImageName, ...ImageName[]]`, so `values: getImageNames()` compiles as an enum's `Terms`; the test's cast is gone. Known Hazard correction appended to DGP TICKET-005. Approved by the user, 2026-10-14.

---

### QR-005: `IN_HOUSE` fixes one provenance and date for every image that spreads it, and keeps each module's license out of view

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/images/draw.ts:4-9` (`IN_HOUSE`); the `...IN_HOUSE` spread in each image module, for example `src/images/apple.ts:8`; `tests/images/images.test.ts:68-75`.
**Description:**
- DEL-003 and the ticket's first Known Hazard ask for provenance per image. `IN_HOUSE` holds one sentence with one date, "Drawn in-house for this package from basic shapes, 2026-10-14.", and all eight images spread it.
- The constant's name invites reuse by any later in-house drawing, which would then record a date it was not drawn on. The test also steers a ninth image to `...IN_HOUSE`, since it requires every image's provenance to start "Drawn in-house for this package".
- Nowhere in source is "apple — MIT — gener8v" written down:
  - each module shows `...IN_HOUSE`;
  - `manifest.ts` holds only imports (DEL-002);
  - the license and author are written in `draw.ts`, the geometry helpers.
- The ticket describes each module as `{ name, description, license, author, viewBox, nodes }`. Yet an auditor reading `src/images/apple.ts` has to follow an import to learn its license.

**Impact:**
- Once a second batch of images is drawn, the register that DGP-NFR-005 and prd/CC-001 rely on will record wrong provenance dates.
- The per-file record the ticket describes is one hop away from every file.

**Recommendation:** Write `license`, `author` and `provenance` in each image module: three lines each, 24 in all. Each file then describes itself and carries its own date, and `draw.ts` holds only drawing helpers. If the shared constant stays, name it for its batch, for example `FIRST_SET_2026_10_14`, and move it out of `draw.ts`.
**Status:** Resolved
**Resolution:** Resolved — each image module states `license: "MIT"`, `author` and its own `provenance`; `IN_HOUSE` is removed, and `draw.ts` holds drawing helpers only. Approved by the user, 2026-10-14.

---

### QR-006: The module-level tables are not marked pure, so importing any constant from `src/images/index.ts` bundles every drawing

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/images/index.ts:12-14` (`images`) and `src/images/manifest.ts:23-25` (`imageManifest`). The pattern is at `src/core/definitions/index.ts:15-23` and `src/layout/registry.ts:27-34`.
**Description:**
- Both tables are built by top-level calls that are not marked `/* @__PURE__ */`: `Object.freeze(Object.assign(…))` and `imageAssets.map(…)`.
- A bundler must keep such a call wherever its module is loaded. Each call reads `imageAssets`, which holds every drawing.
- I bundled scratch entry files with the repository's esbuild (`--bundle --minify`, with `"sideEffects": false` as in `package.json`). I bundled once against the source as delivered, and once against a copy with the two tables marked:

| Entry imports, from `src/images/index.ts` | As delivered | With the two tables marked pure |
|---|---|---|
| `IMAGE_VIEW_BOX` only | 3,927 B min, 1,665 B gzip (all eight drawings) | 79 B min, 119 B gzip |
| `getImageNames` and `imageDescriptions` | 4,058 B min, 1,699 B gzip | 3,822 B min, 1,642 B gzip |

The codebase marks exactly these table constructions (GSS TICKET-002 DEL-002). DGP TICKET-001's quality review (QR-008) made the same fix for the `categories` constant.

**Impact:**
- The bytes are few, but the marks decide what a module pays when it needs only the allowed licenses or the viewBox. The source exporter's license notices (prd/CC-001 with TC-009) are one such module.
- The CR-004 Known Hazard on DGP TICKET-005 says "importing anything from `src/images/index.ts` brings in all eight drawings". That is true of the names, which live on the drawings (CR-004). For the constants, it is true only because of these two statements.

**Recommendation:**
- Mark both tables as the registries are marked: `/* @__PURE__ */` on `Object.freeze`, `Object.assign`, `Object.create`, `Object.fromEntries` and `imageAssets.map`. If QR-002 adds freezing calls, mark those too.
- Re-measure with `pnpm size` once DGP TICKET-005 adds the pictograph entry.
- Narrow the Known Hazard's wording in resolution.

**Status:** Resolved
**Resolution:** Resolved — the reviewer's suggested pure marks were not enough on their own: the drawing calls and the `.map()` building each table kept everything. `shape`, `ring`, `points`, `circlesAround`, `defineImage`, `registerOf`, `byName` and `leaves` are marked `@__NO_SIDE_EFFECTS__`, and each table is built through one of them. Importing only `IMAGE_VIEW_BOX` now bundles 71 B (was 4,812 B); using `images` keeps all eight. `tests/images/bundle.test.ts` pins both. TICKET-005's hazard wording corrected. Approved by the user, 2026-10-14.

---

### QR-007: The command line is untested: removing its `process.exit(1)` passes the suite

**Category:** Testing
**Severity:** Suggestion
**Location:** `scripts/check-image-licenses.ts:109-116` (the entry); `tests/images/license-check.test.ts:75-81`, whose comment at `:76-77` explains why the command is not spawned.
**Description:**
- `runImageCheck` is tested in process. The eight lines around it are not: the default directory, the printed problems, the exit code and the summary.
- On a scratch copy, removing `process.exit(1)` (M7) passes all 17 image tests. So does changing the default directory to `src` (M11).
- The test's comment gives the reason for not spawning the command: it "loaded the machine enough to slow other timing-bound tests". Commit `b48d1a4` removed the circle's time bound, but other wall-clock bounds remain:
  - `tests/core/validate-structure.test.ts:185`, `:386` and `:538`;
  - `tests/core/categories.test.ts:328`;
  - `tests/layout/kit/text.test.ts:112`.

  That reason still holds for spawning. It does not stop the command's logic from being tested in process.
- The entry of `scripts/check-dependencies.ts` (`:66-75`) is untested too, so this delivery follows the codebase. It is raised because this exit code is the whole of the CI gate behind DGP-NFR-005.

**Impact:** If a refactor lost the exit, CI would print every problem in its log and still pass.
**Recommendation:**
- Move the entry's body into `main(args: readonly string[], out = console): Promise<number>`, which returns the exit code. The entry becomes `process.exitCode = await main(process.argv.slice(2))`.
- Test `main` in process:
  - `["tests/fixtures/images"]` returns 1 and writes the `stray.ts` line to `out.error`;
  - `[]` (the default directory) returns 0 and writes the summary.
- The same shape would let `scripts/check-dependencies.ts` be tested as well.

**Status:** Resolved
**Resolution:** Resolved — `main(args): Promise<number>` is the command line (the entry sets `process.exitCode`); a test runs it in-process on the fixture (returns 1, the problem on stderr) and with no argument (returns 0, the register on stdout). Approved by the user, 2026-10-14.

---

### QR-008: The check names `src/images/` whatever directory it checked, and a register without `imageManifest` fails with a `TypeError`

**Category:** Observability
**Severity:** Suggestion
**Location:** In `scripts/check-image-licenses.ts`:
- the messages at `:45`, `:51`, `:55`, `:57`, `:60`, `:62`, `:67` and `:68`;
- the cast at `:104` (`as { imageManifest: RegisterEntry[] }`).

In `tests/images/license-check.test.ts`, the assertions at `:28-29` and `:79`, which expect the `src/images/` prefix on fixture runs.

**Description:**
- **Every message starts `src/images/`, whatever directory was checked.** The command takes an optional directory. `pnpm exec tsx scripts/check-image-licenses.ts tests/fixtures/images` prints `src/images/stray.ts: the image "stray" has no entry in src/images/manifest.ts.` The file it means is `tests/fixtures/images/stray.ts`. The tests assert the wrong path.
- **The register is read through an unchecked cast.** I made a scratch directory whose `manifest.ts` exports `imageRegister` instead of `imageManifest`. The command exits 1 with `TypeError: Cannot read properties of undefined (reading 'map')` at `scripts/check-image-licenses.ts:47`, a line inside the rule rather than in the manifest.
  - In the repository, `pnpm typecheck` would fail first, because `src/images/index.ts` re-exports `imageManifest`.
  - So the result is a confusing message, not a missed failure.
- **On success, the command prints only a count.** DEL-002 means the register exists only at runtime, and no file or log shows it in readable form.

**Impact:** Small, because the published check always runs on `src/images/`. Still, these messages are what someone reads in a failed CI log, and they should name the file to open.
**Recommendation:**
- Have `runImageCheck` pass the checked directory, relative to the working directory, into `checkImageLicenses` as the message prefix, with `src/images` as the default. Update the two assertions.
- Check that `imageManifest` is an array before using it. If it is not, report `manifest.ts: exports no imageManifest list`.
- Optionally, print one line per image on success (name, license, author), so every CI log carries the readable register.

**Status:** Resolved
**Resolution:** Resolved — messages name the directory actually checked (`checkImageLicenses(…, dir)`, `runImageCheck(dir, label)`); a missing `manifest.ts` or one without an `imageManifest` list is reported as a problem, not a crash (tests for both); success prints the register's names. Approved by the user, 2026-10-14.

---

### QR-009: The CR-001 test writes its temporary directory while tests are collected, so a filtered run leaves it behind

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/images/license-check.test.ts:53-63`: `mkdtempSync` and the writes sit in the `describe` body, with `afterAll` at `:55`. The pattern is at `tests/package/node-entry.test.ts:32-45`.
**Description:**
- The temporary directory and its six entries are created when Vitest collects the file, not in a hook. A run that skips this suite does not run its `afterAll`, so nothing removes them.
- I checked this with `TMPDIR` pointed at the scratchpad:
  - `vitest run -t "passes on the published set"` (2 passed, 15 skipped) left `image-check-307Utk` behind;
  - full runs cleaned up.
- `tests/package/node-entry.test.ts` creates its temporary directory in `beforeAll` and removes it in `afterAll`.

**Impact:** Small:
- filtered runs and watch-mode runs leave stray directories in the OS temp folder;
- the file-system writes happen at collection time, before any test runs, even when no test in this file is selected.

**Recommendation:** Move `mkdtempSync` and the writes into a `beforeAll` inside the inner `describe`, with `dir` declared outside it, as in `tests/package/node-entry.test.ts`.
**Status:** Resolved
**Resolution:** Resolved — the temporary directories are created in `beforeAll` and removed in `afterAll`. Approved by the user, 2026-10-14.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Bounds, `ring()` and drawing-snapshot tests | `tests/images/images.test.ts`, `tests/images/__snapshots__/images.test.ts.snap` |
| QR-002 | Fix | `defineImage` deep-freezes; arrays frozen; test | `src/images/types.ts`, image modules, `src/images/manifest.ts`, `tests/images/images.test.ts` |
| QR-003 | Fix | CONTRIBUTING: check, lint boundary, how to add an image | `CONTRIBUTING.md` |
| QR-004 | Fix | Non-empty tuple from `getImageNames()`; cast dropped | `src/images/index.ts`, `tests/images/images.test.ts`, DGP `TICKET-005.md` |
| QR-005 | Fix | License, author, provenance written in each module | `src/images/*.ts`, `src/images/draw.ts` |
| QR-006 | Fix (extended) | Side-effect-free helpers build every table; bundle test | `src/images/draw.ts`, `types.ts`, `manifest.ts`, `index.ts`, `tree.ts`, `flower.ts`, `fish.ts`, `star.ts`, `tests/images/bundle.test.ts` |
| QR-007 | Fix | In-process `main(args)`; tests | `scripts/check-image-licenses.ts`, `tests/images/license-check.test.ts` |
| QR-008 | Fix | Messages name the checked directory; register validated | `scripts/check-image-licenses.ts`, `tests/images/license-check.test.ts` |
| QR-009 | Fix | Temporary directories in `beforeAll` | `tests/images/license-check.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 9 Resolved)
**Notes:** All nine findings fixed and re-verified. `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0; `pnpm test` (881 tests) exits 0 on three consecutive runs. The reviewer's art mutations now fail tests. QR-006 needed more than the suggested pure marks; it is now pinned by a bundle test.
