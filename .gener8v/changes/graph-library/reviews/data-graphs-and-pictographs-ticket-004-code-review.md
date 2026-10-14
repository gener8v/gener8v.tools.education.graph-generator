# TICKET-004: Published image set — Code Review

## Summary

I reviewed the delivery of `graph-library/data-graphs-and-pictographs/TICKET-004` (delivery commit `915a472`, branch `ticket/dgp-004`). I checked it against:
- the ticket and its Known Hazards, including the one carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-003;
- the Data Graphs & Pictographs specification (DGP-REQ-033..035, DGP-NFR-005, and the four `## @spec Coverage` rows this delivery added);
- `constraints/prd.md`, `technical-design/system-design.md` (AD-002, AD-007, AD-008, AD-011, AD-012, the Image set component and the `ImageAsset` data model) and `dependencies/dependency-map.md` (EXT-001, RD-002, RES-009).

What holds:
- Eight images, each its own module, each a few Scene primitives with presentation attributes only. Every number goes through `fmt()`, and `checkScene` passes on each.
- Names are unique and kebab-case, the set is under 20, and every image is MIT, by `gener8v`, with recorded provenance.
- `getImageNames()` and `imageDescriptions()` expose the list for DGP TICKET-005's `unitImage` enum, as the carried hazard requires.
- `pnpm check:images` runs in CI and fails on an unlisted top-level `.ts` image or a disallowed license.
- Every Verification Run command reproduces. `pnpm generate` leaves every tracked file unchanged.
- I rendered the eight drawings myself. Each reads as its name, and none resembles a character, logo or brand. Product Owner sign-off is still pending, as the record flags (EXT-001).

Extra checks beyond the record's commands, all outside the repository or read-only:
- Probes of `check:images` on a scratch copy of `src/`, with an unlisted image whose license is `CC-BY-NC-4.0`.
- An ESLint `--stdin` probe of a React import and a `window` read under `src/images/`.
- An esbuild bundle of `getImageNames()` alone.
- The CLI's exit code on a crash.
- A contact-sheet render of the eight images.

There are two Issues:
- **CR-001.** `check:images` reads only `*.ts` files directly in `src/images/`. An unlisted image with a disallowed license passes (exit 0) when its file is `.tsx` or `.mts`, or sits in a subdirectory. AC 6 says "any file in `src/images/`". The CLI test also cannot tell a detected problem from a crash.
- **CR-002.** DGP-REQ-035 is half-delivered by design: this ticket exposes the names, and DGP TICKET-005 is to publish them. But no ticket that follows lists DGP-REQ-035 as covered. Nothing in the pipeline makes the publishing half carry `@spec DGP-REQ-035`, join the coverage row, or be tested against the generated schema and vocabulary. Today neither lists any image name.

There are three Observations:
- **CR-003.** `src/images/` is outside ESLint's React and browser-global boundary rule. The core pictograph definition will import it (carried CR-003).
- **CR-004.** The technical design is now out of date on the image set in four places: its dependencies, the `ImageAsset` fields, AD-012's manifest wording, and the schema generator's input. Once DGP TICKET-005 lands, `getImageNames()` brings every drawing and `src/layout/kit/format.ts` into `./core`, `./tool` and `.`.
- **CR-005.** The DGP-REQ-033 coverage row lists the image modules as a brace pattern, not root-relative paths. The record says "1 to 7 shapes", but the flower has 8, exactly the test's bound.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-14)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-004-delivery.md`
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
- `tests/images/images.test.ts`
- `tests/images/license-check.test.ts`
- `tests/fixtures/images/listed.ts`, `tests/fixtures/images/stray.ts`, `tests/fixtures/images/manifest.ts`
- `.gener8v/specifications/data-graphs-and-pictographs.md` (`## @spec Coverage`)
- Read for context, unchanged here: `src/layout/scene.ts`, `src/layout/kit/check.ts`, `src/layout/kit/format.ts`, `src/core/definitions/index.ts`, `scripts/generate.ts`, `eslint.config.js`, `tests/package/boundaries.test.ts`, `tests/package/node-entry.test.ts`, `.size-limit.json`, `tsconfig.json`, `vitest.config.ts`, `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-005.md`, `.gener8v/changes/graph-library/reviews/graph-specification-and-vocabulary-ticket-005-code-review.md` (CR-003)

**Findings:** 5
**Critical:** 0 | **Issues:** 2 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| At least five images exist (for example apple, star, book, ball, person), each in its own module `src/images/<name>.ts` as `{ name, description, license, author, viewBox, nodes }` with nodes using only Scene primitives and presentation attributes | Yes | There are eight modules, `src/images/apple.ts` … `src/images/tree.ts`, all five example names included. Each exports `const <name>: ImageAsset<"<name>">` with `name`, `description`, `...IN_HOUSE` (`license`, `author`, plus `provenance`, DEL-003), `viewBox: IMAGE_VIEW_BOX`, and `nodes` built by `shape()` (`src/images/draw.ts:15-17`). The nodes are `path`, `circle`, `rect`, `ellipse` and `polygon` only. Their attributes are geometry plus `fill`, `stroke`, `stroke-width`, `stroke-linecap` and `stroke-linejoin`. `checkScene` returns no problem for any image (`tests/images/images.test.ts:79-85`), and the count test is `:27-32`. Node counts run from 1 to 8 (see CR-005 on the record's "1 to 7") |
| Image names are unique, lower-case kebab-case; `src/images/manifest.ts` lists every image with name, description, license and author; the set has at most 20 images | Yes | `imageAssets` is at `src/images/manifest.ts:19`. `imageManifest` (`:23-25`) gives `name`, `description`, `license`, `author` and `provenance` per image, read from the modules (DEL-002). Tests: uniqueness and `KEBAB_CASE` at `tests/images/images.test.ts:34-38`, the manifest facts at `:44-57`, at most 20 at `:27-32`. "Lists every image" rests on `pnpm check:images`, which fails on an unimported top-level `.ts` image (scratch probe: exit 1). For other file shapes see CR-001 |
| Every image is drawn in-house and licensed under the package license (MIT); no image depicts a trademarked character, logo or brand | Yes | `IN_HOUSE` (`src/images/draw.ts:5-9`): MIT, `gener8v`, "Drawn in-house for this package from basic shapes, 2026-10-14." The test is `tests/images/images.test.ts:68-75`. The brand part is a content judgement. I rendered the eight to a contact sheet (scratch, Quick Look): generic objects from circles, rects, ellipses, polygons and short paths, with no character, mascot, logo or brand mark (the apple is whole, with a stem and leaf). The record's Notes flag the Product Owner sign-off that Known Hazard 1 asks for (EXT-001, DGP OQ-001, OQ-002) |
| No image references an external URL, raster data, font or element id | Yes | The Scene attribute set is closed and has no `id`, `href`, `class` or `style` (`src/layout/scene.ts:52-92`). `checkScene` rejects `url(` (`src/layout/kit/check.ts:6`, `:26`). The test at `tests/images/images.test.ts:87-97` checks for no `text` node, no `id`/`href`/`xlink:href`/`class`/`style` attribute, and no `url(`, `data:`, `http(s):` or `//` in any value. No module writes a `font-*` attribute (read) |
| `getImageNames()` exposes the list so the schema generator (GSV TICKET-005) emits it as the `unitImage` enum and the vocabulary lists each name with its description | Yes (read as the carried Known Hazard requires: "so the pictograph definition, which the generator reads, carries it") | `getImageNames()` is at `src/images/index.ts:22-24` and `imageDescriptions()` at `:28-30`. A stand-in pictograph builds `unitImage` from them. Through `buildSchema` and `buildVocabulary` the names appear as the schema enum and as the vocabulary's `values` and `valueDescriptions` (`tests/images/images.test.ts:105-137`). The published `src/generated/schema.json` and `vocabulary.json` do not list the names yet, because no pictograph is registered (CR-002) |
| DGP-NFR-005: `scripts/check-image-licenses.ts` fails when any file in `src/images/` lacks a manifest entry or has a license not in the allowed list (MIT, CC0-1.0); it runs in CI via `pnpm check:images` | Partial | `checkImageLicenses` (`scripts/check-image-licenses.ts:32-58`) reports an image with no entry, a disallowed license in a file or the register, an entry with no file, a misnamed image, and a license that differs from its entry. The CLI (`:77-87`) exits 1 on any problem, `check:images` is in `package.json`, and CI runs it (`.github/workflows/ci.yml:95-96`, not executed here, as recorded). Tests: `tests/images/license-check.test.ts:15-61`. Re-run `pnpm check:images`: exit 0. **But** `readImageFiles` reads only `*.ts` files directly in the directory (`scripts/check-image-licenses.ts:66-68`). An unlisted image with license `CC-BY-NC-4.0` passes (exit 0) as `src/images/cat.tsx`, `src/images/cat.mts` or `src/images/animals/cat.ts`. Only `src/images/cat.ts` fails (CR-001) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-033 | Image set with unique names and plain-English descriptions | `src/images/types.ts:ImageAsset`; one `export const` per module in `src/images/apple.ts` … `src/images/tree.ts`; `src/images/manifest.ts:imageAssets`; `src/images/index.ts:images`, `imageDescriptions`; tests `tests/images/images.test.ts:27-64` | Yes |
| DGP-REQ-034 | Only images licensed compatibly with the package license | `src/images/types.ts:ALLOWED_IMAGE_LICENSES`, `ImageLicense`, `ImageAsset.license` (a type error outside MIT / CC0-1.0); `src/images/draw.ts:IN_HOUSE`; `src/images/manifest.ts:imageManifest`; `scripts/check-image-licenses.ts:checkImageLicenses` | Yes |
| DGP-REQ-035 | Image names listed in the vocabulary and the published schema | `src/images/index.ts:getImageNames`, `imageDescriptions`; the stand-in test `tests/images/images.test.ts:105-137`. The published schema and vocabulary do not list the names until DGP TICKET-005 registers the pictograph, and no ticket that follows lists DGP-REQ-035 | Partial (CR-002) |
| DGP-NFR-005 | Every image has a recorded compatible license: a CI check fails on an image file with no manifest license entry | `pnpm check:images` (`scripts/check-image-licenses.ts`) in CI (`.github/workflows/ci.yml:95-96`); `tests/images/license-check.test.ts`. Re-run: exit 0, "Images: 8, every license recorded and allowed (MIT, CC0-1.0)." | Partial (CR-001): the check is blind to image modules that are not top-level `.ts` files |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-001 | Bundled assets carry a redistributable license compatible with MIT | Yes | Every image is MIT with author and provenance. The allowed list is MIT and CC0-1.0 (`src/images/types.ts:9`), enforced by type and by `check:images` (see CR-001 for its blind spot). The duty to carry each embedded image's license notice into exported source (CC-001 × TC-009) belongs to graph-library/component-packaging-and-source-export/TICKET-005, whose Constraints cite prd/CC-001. Each `ImageAsset` holds `license`, `author` and `provenance` for it |
| prd/CC-003 | No data collected or transmitted; rules out remote image loading | Yes | The drawings are inline Scene nodes with no URL, `href` or `data:` value (test `tests/images/images.test.ts:87-97`). The network lint block covers `src/**` (`eslint.config.js:103-111`), `src/images/` included |
| prd/CC-004 | No trademarked characters, logos or brand imagery | Yes (content judgement; Product Owner sign-off pending) | Eight generic objects drawn from basic shapes, inspected on a contact sheet. The record's Notes carry the sign-off request (EXT-001) |
| prd/TC-007 | Side-effect-free ES modules, per-type tree-shaking | Yes | One module per image, declaring only constants, with `"sideEffects": false`. Nothing imports the images yet, so `pnpm size` is unchanged. A consequence for DGP TICKET-005 is noted in CR-004: in a scratch esbuild bundle, importing `getImageNames()` alone brings every drawing (3,966 B minified, 1,664 B gzip, against 4,073 B and 1,688 B for the whole set) |
| prd/TC-005 | Validation and other non-rendering code load no React or browser global | Yes | No image module imports React or reads a browser global. The modules import only `src/layout/kit/format.ts` and Scene types. ESLint's boundary rule does not cover `src/images/` (CR-003) |
| prd/TC-002 | Rounded coordinates only | Yes | Every number passes through `fmt()` (`shape()`, `fmtPoints`). The `d` strings use whole numbers. `checkScene` passes on all eight |
| prd/TC-009 | Exported source embeds any pictograph image it uses | N/A | Export is CPSE TICKET-005. The images are plain Scene nodes, which the exporter's printer can inline |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Framework-neutral Scene of SVG primitives | Yes | `ImageAsset.nodes: readonly SceneNode[]` (`src/images/types.ts:33`). Each node is a `ShapeNode` built by `shape()` |
| AD-007 | One rounding function for every emitted number | Yes | `shape()` passes each number through `fmt()` (`src/images/draw.ts:16`). The star and fish points use `fmtPoints`, and the flower's ring centers go through `fmt()`. `checkScene` finds no unrounded number |
| AD-008 | No element ids or `url(#…)` references | Yes | There is no `id` in the closed attribute set and no `url(` (test). `IMAGE_VIEW_BOX` is ready for the nested `<svg>` crop in DGP TICKET-005 |
| AD-011 | Inline presentation attributes only | Yes | `fill`, `stroke`, `stroke-width`, `stroke-linecap` and `stroke-linejoin` are written as attributes, with no `class` or `style`. The colors are the artwork's own, not the series palette, which AD-011 governs for graph elements |
| AD-012 | In-house inline SVG drawings, one module each in `src/images/<name>.ts`, name/description/license in `src/images/manifest.ts`, at most 20 | Yes | Eight in-house MIT drawings in a 100 × 100 space, one module each. `manifest.ts` exports the register `imageManifest`, built from the modules (DEL-002) rather than written out in the file, so AD-012's wording "recorded in `src/images/manifest.ts`" now means "registered through". See CR-004 |
| Component Design: Image set (`src/images/`) | Interfaces `images: Record<ImageName, ImageAsset>`, `imageManifest`; Dependencies: none | Partial | The interfaces match (`src/images/index.ts:8`, `:12-14`, `:5`). The modules depend at runtime on `src/layout/kit/format.ts` (`fmt`, `fmtPoints`: `src/images/draw.ts:1`, `src/images/fish.ts:1`, `src/images/star.ts:1`) and on the Scene types, against the design's "Dependencies: none" (`.gener8v/technical-design/system-design.md:285`). AD-007 and AD-012 require exactly this, so the code is right and the design text is stale (CR-004) |
| Data Model: `ImageAsset` | Key Fields `name`, `description`, `license`, `author`, `viewBox`, `nodes` | Yes (one field added) | `provenance` was added by DEL-003, which records it as Ticket Impact. The design's data model is not amended (CR-004) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-033 | `@spec DGP-REQ-033` | `src/images/types.ts:ImageAsset` (line 20); `src/images/apple.ts:apple` (4), `src/images/ball.ts:ball` (4), `src/images/book.ts:book` (4), `src/images/fish.ts:fish` (5), `src/images/flower.ts:flower` (4), `src/images/person.ts:person` (4), `src/images/star.ts:star` (5), `src/images/tree.ts:tree` (12); `src/images/manifest.ts:imageAssets` (18); `src/images/index.ts:images` (11), `imageDescriptions` (27) | Yes |
| DGP-REQ-034 | `@spec DGP-REQ-034` | `src/images/types.ts:ALLOWED_IMAGE_LICENSES` (8), `ImageAsset` (20); `src/images/manifest.ts:imageAssets` (18), `imageManifest` (22); `scripts/check-image-licenses.ts:checkImageLicenses` (31) | Yes |
| DGP-REQ-035 | `@spec DGP-REQ-035` | `src/images/index.ts:getImageNames` (21), `imageDescriptions` (27) | Yes, for the half delivered here (CR-002) |
| DGP-NFR-005 | `@spec DGP-NFR-005` | `src/images/manifest.ts:imageManifest` (22); `scripts/check-image-licenses.ts:checkImageLicenses` (31) | Yes |

**Coverage:** 4 of 4 requirements annotated. Each annotation sits on the line directly above its declaration, after any JSDoc.
**Missing:** None in this delivery's code. The publishing half of DGP-REQ-035 (the pictograph definition's `unitImage`) has no owner obliged to annotate it (CR-002).
**Specification table:** Yes. The four rows match the annotations and the record's `@spec Annotations` table location for location. The DGP-REQ-033 row writes the eight modules as the brace pattern `src/images/{apple,ball,book,fish,flower,person,star,tree}.ts`, without symbols (CR-005).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 | Yes. It rewrote the 5 generated files with identical content. `git status --short` afterwards shows only `.gener8v/runs.jsonl` |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes. Covers the `ImageName` `expectTypeOf` assertion, since `tests` is in `tsconfig.json` `include` |
| `pnpm test` | 1, then 0 | Yes (record: 1, 1, 0). Run 1: 867 of 868 passed. The only failure was `tests/layout/circle.test.ts` › "keeps the Scene small and the run short for caller-sized text…" at 2,005 ms against its 2,000 ms bound, the known flake. That file alone: 29 of 29 passed. Run 2: 32 files, 868 tests, all passed. `tests/images/images.test.ts` 11 and `tests/images/license-check.test.ts` 5, as recorded |
| `pnpm bench` | 0 | Yes. GSV-NFR-001 circle p95 0.0206 ms |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes. 7 built files, no network APIs or modules |
| `pnpm check:deps` | 0 | Yes. 0 runtime dependencies |
| `pnpm check:images` | 0 | Yes. "Images: 8, every license recorded and allowed (MIT, CC0-1.0)." |
| `pnpm size` | 0 | Yes. `.` 15.34 kB, `./core` 12.41 kB, `./circle` 15.27 kB, identical to the record |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| Mutation checks (removing the no-entry check, the allow-list, the entry-without-file check) | not re-run (each edits source) | Yes, by reading. Each removal drops a message that `tests/images/license-check.test.ts:24-27` or `:31-34` asserts with `toEqual` on the whole list |
| Visual check | reproduced (scratch contact sheet, Quick Look) | Yes. Each drawing reads as its name |

*The working tree was unchanged after every command and probe (`git status --short`: only `.gener8v/runs.jsonl`, which the hooks write).*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Eight common classroom objects with plain, durable names (RES-009, Known Hazard 2), well under AD-012's cap of 20. The user chose them with the plan. The final set still needs Product Owner sign-off (EXT-001), and the record says so |
| DEL-002 | Reasonable | Each fact is written once, so a description or license cannot drift between two copies, and the check still fails on a top-level `.ts` image that `manifest.ts` does not import. Consequences: `manifest.ts` as a source file holds imports, not licenses, so the readable register exists only at runtime and in the modules. The "license differs from its entry" branch cannot fire for the real set (recorded as a deviation). AD-012's wording is not amended (CR-004) |
| DEL-003 | Reasonable | `provenance` answers Known Hazard 1 and RD-002's mitigation ("record provenance per image"). The `ImageName` union gives DGP TICKET-005 an exact `unitImage` type. `check:images` does not require `author` or `provenance` to be non-empty. The test pins them only for the current in-house set (`tests/images/images.test.ts:72-73`). The design's data model is not amended (CR-004) |

*Deviations from the plan:*
- *`src/images/draw.ts` added:* listed in `NON_IMAGE_FILES`, so the check skips it. It keeps the modules short and routes numbers through `fmt()`. It is also where the image set's runtime dependency on `src/layout/kit/format.ts` comes from (CR-004).
- *`tests/fixtures/images/` added:* needed for the no-entry and command-line cases.
- *The unreachable license-mismatch check kept:* harmless, and it guards a hand-edited register.

*None of these affects traceability.*

## Findings

### CR-001: `check:images` passes an unlisted image with a disallowed license when its file is not a top-level `.ts` file

**Severity:** Issue
**Location:** `scripts/check-image-licenses.ts:65-75` (`readImageFiles`: `readdirSync(dir).filter((file) => file.endsWith(".ts") && !NON_IMAGE_FILES.has(file))`); `tests/images/license-check.test.ts:50-61` (the command-line test asserts the exit status only)
**Traces To:**
- DGP-NFR-005 ("a CI check that fails when an image file has no license entry in the image-set manifest").
- Acceptance criterion 6 ("fails when **any file** in `src/images/` lacks a manifest entry or has a license not in the allowed list").
- DGP-REQ-034; prd/CC-001; AD-012 (images live at `src/images/<name>.ts`).
**Description:** The check sees only regular `.ts` files directly in `src/images/`. Everything else in the directory is skipped without a word. I ran the repository's `tsx` on a scratch copy of `src/` and `scripts/`, adding one unlisted image, `cat`, with `license: "CC-BY-NC-4.0"`:
- as `src/images/cat.ts`: exit 1, both the license and the missing entry reported (correct);
- as `src/images/cat.tsx`: exit 0, "Images: 8, every license recorded and allowed";
- as `src/images/cat.mts`: exit 0;
- as `src/images/animals/cat.ts`: exit 0;
- as a stray `src/images/logo.svg` holding an external `href`: exit 0.

Separately, the command-line test expects exit 1 on the fixture directory. A crash also exits 1: run on a directory with no `manifest.ts`, the CLI throws and exits 1. So the test would pass even if the check never ran. The function-level tests (`:22-48`) do pin the messages.
**Impact:** The check exists to catch an image that bypasses the register, and these are the shapes such an image can take: a `.tsx` or `.mts` module, or a subfolder once the set grows toward 20. A module imported directly, for example by the pictograph layout, ships in the bundle with an unrecorded or non-redistributable license while CI stays green. That is the failure DGP-NFR-005 and CC-001 exist to prevent. AC 6 as written ("any file") is not met.
**Recommendation:**
- In `readImageFiles`, list entries with `readdirSync(dir, { withFileTypes: true })`. Report every entry that is neither in `NON_IMAGE_FILES` nor a regular file named `<kebab-name>.ts`. That covers directories and `.tsx`, `.mts`, `.js`, `.svg` and other files. A message such as "src/images/<entry>: not an image module; each image is src/images/<name>.ts (AD-012)" will do. Route it through `checkImageLicenses`, or a small `checkImageDir`, so the CLI exits 1.
- Add unit tests: a `.tsx` image and a subdirectory each fail.
- In the command-line test, assert that stderr names `stray.ts` and "has no entry", not only the exit status.
**Status:** Resolved
**Resolution:** `readImageFiles` now returns every other entry in the directory (`others`): any file that is not one of `NON_IMAGE_FILES` or a `<kebab-name>.ts` (`IMAGE_FILE`), and every subfolder; `checkImageLicenses` reports each, unloaded. Entries are sorted in code-unit order. New `runImageCheck(dir)` is what the command line runs; tests: a temporary directory with `cat.tsx`, `cat.mts`, `cat.svg`, `Cat.ts` and `animals/cat.ts` (all reported), and the fixture run naming `stray.ts` exactly. The planned command-line spawn test was replaced by the in-process `runImageCheck` test (spawning added load to the suite); `pnpm exec tsx scripts/check-image-licenses.ts tests/fixtures/images` exits 1 and `pnpm check:images` exits 0, run by hand. Approved by the user, 2026-10-14.

---

### CR-002: DGP-REQ-035 is half-delivered, and the publishing half has no owner, annotation or test over the published files

**Severity:** Issue
**Location:** `src/images/index.ts:21-30` (`getImageNames`, `imageDescriptions`: the half delivered here); `tests/images/images.test.ts:105-137` (stand-in definition only); `src/generated/schema.json`, `src/generated/vocabulary.json`, `src/generated/tool-schema.json` (no `unitImage`, no image name); `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-005.md` (Requirements Covered: no DGP-REQ-035); `.gener8v/specifications/data-graphs-and-pictographs.md:162` (DGP-REQ-035 row lists only `src/images/index.ts`)
**Traces To:** DGP-REQ-035 ("list the published image names in the vocabulary and the published schema"); acceptance criterion 5 as amended by the carried Known Hazard (graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-003, GSV TICKET-005 DEL-008); Code Review step 5 (coverage is binary)
**Description:** Under the carried hazard, this ticket only exposes the names and descriptions. DGP TICKET-005's pictograph definition is what puts them into the schema and vocabulary. The code here does that part correctly, and the stand-in test proves the route works. But the requirement itself is not yet met: `grep` finds no `unitImage` or image name in any generated file or in `dist/`. And the second half is not owned:
- DGP TICKET-005's Requirements Covered does not list DGP-REQ-035. Its Known Hazard only mentions it in passing ("… and the vocabulary (DGP-REQ-035)").
- No other ticket in the change lists DGP-REQ-035.
- So nothing obliges the pictograph definition's `unitImage` to carry `@spec DGP-REQ-035`, or to be added to the coverage row.
- Nothing obliges a test that the generated `schema.json`, `tool-schema.json` and `vocabulary.json` list every `getImageNames()` value with its description.

This delivery record, meanwhile, lists DGP-REQ-035 as covered.
**Impact:**
- Once TICKET-005 lands, `grep -rn "@spec.*DGP-REQ-035"` and the coverage row still point only at two accessor functions that publish nothing.
- A pictograph that hard-codes, or forgets, `valueDescriptions` would pass every test that names DGP-REQ-035.
- The requirement's real evidence, the published files, is never checked.
**Recommendation:**
- In resolution, defer to graph-library/data-graphs-and-pictographs/TICKET-005 and append this Known Hazard: "DGP-REQ-035 is completed here: annotate the pictograph definition's `unitImage` property `@spec DGP-REQ-035`; add `src/core/definitions/pictograph.ts` to the DGP-REQ-035 `@spec Coverage` row; test that `src/generated/schema.json`, `src/generated/tool-schema.json` and `src/generated/vocabulary.json` list every `getImageNames()` value, and the vocabulary each `imageDescriptions()` entry."
- Under Post-Review Amendments in this record, note DGP-REQ-035 as "exposed here; published by DGP TICKET-005".
**Status:** Deferred → TICKET-005
**Resolution:** Known Hazard appended to `data-graphs-and-pictographs/TICKET-005.md`: `@spec DGP-REQ-035` on `unitImage`, its coverage row, and a test that the generated schema, tool schema and vocabulary list every name and description. The spec's DGP-REQ-035 coverage row now says "exposed here; published … by DGP TICKET-005". Approved by the user, 2026-10-14.

---

### CR-003: `src/images/` is outside the React and browser-global boundary lint, though the core definition will import it

**Severity:** Observation
**Location:** `eslint.config.js:20` (`NON_RENDERING_DIRS = ["core", "tool", "export", "layout"]`) and the boundary block at `:112-126`; `tests/package/boundaries.test.ts:12` (same directory list)
**Traces To:** prd/TC-005; AD-001 (Consequences: "a lint rule enforces this"); CPSE-REQ-006; the carried Known Hazard (GSV TICKET-005 CR-003: the pictograph definition in `src/core/definitions/` builds `unitImage` from `getImageNames()`)
**Description:** Through `--stdin`, so nothing was written, I linted `import { createElement } from "react"; … window.innerWidth`:
- as `src/images/probe.ts`: exit 0, no error;
- as `src/layout/probe.ts`: exit 1, `no-restricted-imports` and `no-restricted-globals`.

`src/images/` gets only the network block, which covers `src/**`. Once DGP TICKET-005 imports `src/images/index.ts` from `src/core/definitions/`, the image modules become part of `./core` and `./tool`, which must load no React or browser global. A runtime guard exists: `tests/package/node-entry.test.ts:48` imports the built `./core` with a hook that blocks React. It would catch a React import, but not a browser global read inside a function. No image module does either today.
**Impact:** A later image or helper that reaches for React, or reads `document` lazily, passes lint and reaches the validator's entry points. The rule AD-001 relies on has a gap exactly where non-rendering code now begins.
**Recommendation:** Add `"images"` to `NON_RENDERING_DIRS` in `eslint.config.js`, and to the directory list in `tests/package/boundaries.test.ts`. This is a configuration and test change only. Otherwise, append it to DGP TICKET-005's Known Hazards, since that ticket makes core import the images.
**Status:** Resolved
**Resolution:** `"images"` added to `NON_RENDERING_DIRS` in `eslint.config.js` and to the directory list in `tests/package/boundaries.test.ts` (React imports and `window`/`document` now rejected in `src/images/`). Approved by the user, 2026-10-14.

---

### CR-004: The technical design no longer describes the image set as delivered and as DGP TICKET-005 will use it

**Severity:** Observation
**Location:**
- In `.gener8v/technical-design/system-design.md`:
  - `:285`: Image set, "Dependencies: none".
  - `:393`: `ImageAsset` Key Fields, no `provenance`.
  - `:162`: AD-012, "name, description and license recorded in `src/images/manifest.ts`".
  - `:257`: Schema generator, "Dependencies: … Image set manifest".
  - `:223`: Definitions, "Dependencies: none".
- In the code: `src/images/draw.ts:1`, `src/images/fish.ts:1`, `src/images/star.ts:1` (runtime imports of `src/layout/kit/format.ts`).
**Traces To:**
- AD-012, the Component Design for the Image set, Definitions and Schema generator, and the `ImageAsset` Data Model.
- DEL-002 and DEL-003, and GSV TICKET-005 DEL-008 (carried CR-003).
- TR-004 and CPSE-NFR-002.
- DGP TICKET-001 DEL-004 ("core must not depend on layout code").
**Description:** The code is right, but the design is now wrong in four places:
- **Image set dependencies.** The modules import `fmt` and `fmtPoints` from `src/layout/kit/format.ts` and the Scene types from `src/layout/scene.ts`. AD-007 and AD-012 require that, so "Dependencies: none" is stale.
- **`ImageAsset`.** It has `provenance` (DEL-003), which the data model lacks.
- **The manifest.** It is built from the modules (DEL-002), not written in `manifest.ts`.
- **The schema generator.** It no longer reads the manifest (DEL-008). The Definitions component will depend on the Image set instead.

Two consequences land in DGP TICKET-005 and are not in its Known Hazards:
- **The drawings ride along.** In a scratch esbuild bundle, importing `getImageNames()` alone pulls in every drawing: 3,966 B minified and 1,664 B gzip, against 4,073 B and 1,688 B for the whole set. So `./core`, `./tool` and `.` will carry all the drawings once the pictograph definition is registered, not only `./pictograph`. The record's Notes say to measure "the pictograph bundle".
- **Core will reach layout.** `src/core/definitions/pictograph.ts` → `src/images/index.ts` → `src/images/draw.ts` → `src/layout/kit/format.ts` would be the first runtime import from core into `src/layout/`. No core module imports layout today, which is what DGP TICKET-001 DEL-004 set out to keep.
**Impact:** A later reader of the design expects a dependency-free image set and a generator that reads the manifest. The ticket that wires images into core is not warned that it adds about 1.7 kB gzip to the non-rendering entries and a core → layout edge. All of this fits the budgets today: `./core` is 12.41 kB of 25 kB.
**Recommendation:**
- Amend the technical design through the Technical Design skill:
  - the Image set depends on the Scene types and `src/layout/kit/format.ts`;
  - Definitions depend on the Image set, for the pictograph;
  - the Schema generator reads definitions only;
  - `ImageAsset` gains `provenance`;
  - AD-012's register is built from the image modules.
- In resolution, append to DGP TICKET-005's Known Hazards: "importing `getImageNames()` brings every drawing and `src/layout/kit/format.ts` into `./core`, `./tool` and `.`. Measure those entries with `pnpm size` as well as `./pictograph`, and record whether the core → layout import is accepted (DGP TICKET-001 DEL-004)."
**Status:** Deferred → TICKET-005
**Resolution:** Known Hazard on `data-graphs-and-pictographs/TICKET-005.md`: measure `./core`, `./tool`, `.` and the pictograph entry with `pnpm size`; decide (as a DEL) whether core may import the layout kit's `fmt`, or move `fmt` and `Rounded` to core. The design drift (AD-012's manifest and provenance, what the generator reads, the images' dependency on the layout kit) joins the queued `system-design.md` amendments for the next Technical Design pass. Approved by the user, 2026-10-14.

---

### CR-005: The DGP-REQ-033 coverage row lists the modules as a brace pattern, and the record understates the largest drawing

**Severity:** Observation
**Location:** `.gener8v/specifications/data-graphs-and-pictographs.md:160` (`src/images/{apple,ball,book,fish,flower,person,star,tree}.ts`); delivery record `## Delivery Summary`, Files Produced ("one image each, 1 to 7 shapes"); `src/images/flower.ts:10-36` (8 nodes); `tests/images/images.test.ts:100` (bound: at most 8 nodes per image)
**Traces To:** `.gener8v/CONVENTIONS.md` §8 (every code path in every artifact is root-relative, including `@spec Coverage` locations); Code Review step 8; Known Hazard 3 ("keep each drawing to a handful of paths")
**Description:**
- **The coverage row.** It is the only one in the project written as a shell brace pattern, and it names no symbols. Every other row is root-relative `path`:symbol. A reader or tool that follows coverage locations cannot open `src/images/{apple,…}.ts`, and each new image means editing the brace list by hand.
- **The shape count.** The record says each image has 1 to 7 shapes. The flower has 8 (stem, leaf, five petals, center), exactly the test's per-image bound.
**Impact:** Minor. Traceability by `grep` or path is slightly harder. The record suggests the size test has headroom that the flower does not have.
**Recommendation:**
- In the DGP-REQ-033 row, write one root-relative entry per module, `` `src/images/apple.ts`:apple; `src/images/ball.ts`:ball; … `src/images/tree.ts`:tree ``.
- Under Post-Review Amendments, correct "1 to 7 shapes" to "1 to 8 shapes (the flower has 8, at the test's bound)".
**Status:** Resolved
**Resolution:** The DGP-REQ-033 coverage row lists each image module as its own `path`:symbol; the record's shape count is corrected to "1 to 8 shapes" (the flower has 8) under Post-Review Amendments. Approved by the user, 2026-10-14.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Every other directory entry reported; `runImageCheck`; tests for other extensions, case and folders | `scripts/check-image-licenses.ts`, `tests/images/license-check.test.ts` |
| CR-002 | Defer → TICKET-005 | Known Hazard; coverage row notes where DGP-REQ-035 is published | DGP `TICKET-005.md`, `.gener8v/specifications/data-graphs-and-pictographs.md` |
| CR-003 | Approve | `src/images/` in the non-rendering lint boundary and its test | `eslint.config.js`, `tests/package/boundaries.test.ts` |
| CR-004 | Defer → TICKET-005 | Known Hazard on bundle sizes and the core → layout import; design drift queued for Technical Design | DGP `TICKET-005.md` |
| CR-005 | Approve | Coverage row per module; shape count corrected | `.gener8v/specifications/data-graphs-and-pictographs.md`, delivery record |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 open (3 Resolved, 2 Deferred → TICKET-005)
**Notes:**
- CR-001, CR-003 and CR-005 are fixed. CR-002 (publishing DGP-REQ-035) and CR-004 (bundle size and the core → layout import) belong to the pictograph and are Known Hazards on DGP TICKET-005. The design drift joins the queued `system-design.md` amendments.
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (32 files, 872 tests) exits 0 on three consecutive runs, after the user-approved trivial fix to the circle's flaky timing assertion (commit `b48d1a4`, recorded under GSS TICKET-002's amendments).
- Product Owner sign-off on the image set is still pending (EXT-001).
