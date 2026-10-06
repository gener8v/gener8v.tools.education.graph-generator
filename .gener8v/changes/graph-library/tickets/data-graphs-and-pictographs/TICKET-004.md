# TICKET-004: Published image set

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Create the named pictograph image set as small in-house vector drawings with a manifest of names, descriptions and licenses, expose the names to the vocabulary and schema, and add a CI license check.
**Priority:** Must
**Value:** A curriculum developer or a model can pick a pictograph image by name from a published list, and every image is safe to redistribute.

**Requirements Covered:**
- DGP-REQ-033: Image set with unique names and plain-English descriptions
- DGP-REQ-034: Only images licensed compatibly with the package license
- DGP-REQ-035: Image names listed in the vocabulary and the published schema
- DGP-NFR-005: Every image has a recorded compatible license — verified by a CI check that fails on an image without a manifest license entry

**Prior Art:**
- Read: `.gener8v/technical-design/system-design.md` — AD-012 (in-house inline SVG drawings as Scene nodes, at most 20, own module each), AD-008 (no ids), AD-011 (presentation attributes only)
- Read: `.gener8v/constraints/prd.md` — CC-001 (license compatibility, exported files carry the material), CC-003 (no runtime fetching), CC-004 (no trademarked characters or logos)
- Read: `.gener8v/dependencies/dependency-map.md` — EXT-001, RD-002 (image set is a content task), RES-009 (names become public contract)
- Read: `src/layout/scene.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002; the SceneNode type images are stored as

**Acceptance Criteria:**
- [ ] At least five images exist (for example apple, star, book, ball, person), each in its own module `src/images/<name>.ts` as `{ name, description, license, author, viewBox, nodes }` with nodes using only Scene primitives and presentation attributes
- [ ] Image names are unique, lower-case kebab-case; `src/images/manifest.ts` lists every image with name, description, license and author; the set has at most 20 images
- [ ] Every image is drawn in-house and licensed under the package license (MIT); no image depicts a trademarked character, logo or brand
- [ ] No image references an external URL, raster data, font or element id
- [ ] `getImageNames()` exposes the list so the schema generator (graph-library/graph-specification-and-vocabulary/TICKET-005) emits it as the `unitImage` enum and the vocabulary lists each name with its description
- [ ] DGP-NFR-005: `scripts/check-image-licenses.ts` fails when any file in `src/images/` lacks a manifest entry or has a license not in the allowed list (MIT, CC0-1.0); it runs in CI via `pnpm check:images`

**Output:**
- `src/images/<name>.ts` — one module per image (initial set)
- `src/images/manifest.ts` — `imageManifest: ImageManifestEntry[]`
- `src/images/index.ts` — `images: Record<ImageName, ImageAsset>`, `getImageNames()`, `ImageName` type
- `scripts/check-image-licenses.ts` and a `check:images` script in package.json, wired into `.github/workflows/ci.yml`
- `tests/images/images.test.ts` — uniqueness, naming, ≤ 20 images, only Scene primitives, no ids/URLs
- `tests/images/license-check.test.ts` — the check fails on a fixture image without a manifest entry

**Constraints:**
- prd/CC-001, prd/CC-004: redistributable, unbranded images only
- prd/CC-003: images bundled, never fetched
- prd/TC-007: each image its own side-effect-free module

**Known Hazards:**
- Who supplies the images is still open (DGP OQ-001, OQ-002; EXT-001) — do NOT pull images from icon packs or the web; draw simple shapes in-house under MIT, record provenance per image, and flag in the delivery record that the final set needs Product Owner sign-off
- Image names become part of the public contract once released (RES-009) — choose plain, durable names and avoid renaming later
- The pictograph type must include every image because names arrive at runtime (AD-012) — keep each drawing to a handful of paths so the pictograph stays within the 25 kB budget (CPSE-NFR-002, TR-004)
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-003 (GSV TICKET-005 DEL-008): the schema generator does NOT read the manifest. Expose `getImageNames()` and each image's description, and DGP TICKET-005's pictograph definition builds its `unitImage` enum (`values` and `valueDescriptions`) from them. Read this ticket's criterion "so the schema generator emits it" as "so the pictograph definition, which the generator reads, carries it".

**Depends On:** None
**Blocks:** TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessor: graph-library/component-packaging-and-source-export/TICKET-002 (Scene types). Coordinate with graph-library/graph-specification-and-vocabulary/TICKET-005 so the generator reads `getImageNames()` rather than duplicating the list.
