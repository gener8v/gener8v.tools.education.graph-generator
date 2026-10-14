# TICKET-004: Published image set — Security Review

## Summary

This review covers the delivery of `graph-library/data-graphs-and-pictographs/TICKET-004` at HEAD of branch `ticket/dgp-004` (`1ccfd87`). That is delivery commit `915a472`, the code-review resolution `86de29d` and the quality-review resolution `1ccfd87`. Commit `b48d1a4` changes only `tests/layout/circle.test.ts`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-14.

The delivery has no live attack surface today. No entry point imports `src/images/`, and the built `dist/` contains no image. The eight drawings are generic objects drawn from basic shapes, and they meet the CC-001, CC-003 and CC-004 constraints as delivered. The findings are about the checks that keep it that way, and about what DGP TICKET-005 and CPSE TICKET-005 will build on these images:
- **SEC-001 (Low):** the "no URL, no element id" checks look for literal substrings. A CSS-escaped `\75 rl(#g)` passes both checks, `SceneSvg` prints it unchanged, and Chrome and WebKit both paint with the page element whose id is `g`.
- **SEC-002 (Low):** every automated check reads only the license and provenance an image module declares about itself. A module can import its drawing from another file or from a devDependency, which tsup inlines into `dist/`, and every check still passes. The contributor guide offers CC0 "public-domain material" but CC0 does not clear trademarks, and the guide contradicts itself on this.
- **SEC-003 (Low):** one pictograph unit costs up to 9 Scene nodes and 568 bytes of markup. DGP TICKET-005's Known Hazards say "do not invent a cap". A valid 106-byte description can therefore ask for 10^9 units, which would exhaust the heap of a Node.js server once the pictograph ships.
- **SEC-004 (Informational):** exported files will copy these MIT-licensed drawings into consumers' files. The image data has no copyright notice, and CPSE TICKET-005's criterion asks only that the header "names their license".

Four findings: 0 Critical, 0 High, 0 Medium, 3 Low, 1 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-14)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-004-delivery.md` (DEL-001..003, Notes, Post-Review Amendments from the code and quality reviews)

**Files Reviewed:**
- `src/images/types.ts`
- `src/images/draw.ts`
- `src/images/apple.ts`, `src/images/ball.ts`, `src/images/book.ts`, `src/images/fish.ts`, `src/images/flower.ts`, `src/images/person.ts`, `src/images/star.ts`, `src/images/tree.ts`
- `src/images/manifest.ts`
- `src/images/index.ts`
- `scripts/check-image-licenses.ts`
- `package.json` (`check:images`)
- `.github/workflows/ci.yml` ("Image licenses are recorded")
- `eslint.config.js` (`NON_RENDERING_DIRS`)
- `CONTRIBUTING.md` ("Adding a pictograph image")
- `tests/images/images.test.ts`, `tests/images/license-check.test.ts`, `tests/images/bundle.test.ts`
- `tests/images/__snapshots__/images.test.ts.snap`
- `tests/fixtures/images/listed.ts`, `tests/fixtures/images/stray.ts`, `tests/fixtures/images/manifest.ts`
- `tests/package/boundaries.test.ts` (the `images` entry), `tests/layout/circle.test.ts` (`b48d1a4`, test only)

Context read:
- the ticket with its Constraints and Known Hazards, and the Known Hazards on DGP TICKET-005 (including those the code and quality reviews of this ticket appended) and on CPSE TICKET-005 (source export);
- the delivery record, with its Decisions, Notes and both Post-Review Amendments;
- `.gener8v/constraints/prd.md`; there is no `constraints/data-graphs-and-pictographs.md`;
- `.gener8v/technical-design/system-design.md`: AD-007, AD-008, AD-011, AD-012, AD-013, AD-016;
- `.gener8v/context.md`, `.gener8v/CONVENTIONS.md`, the DGP specification (DGP-REQ-023..035, DGP-NFR-005, OQ-001..004, Edge Cases) and the dependency map (EXT-001, RD-002, RES-009);
- the earlier security reviews in this change, especially DGP TICKET-001, GSS TICKET-002, GSV TICKET-004 and CPSE TICKET-001 and 002, whose threat model this review follows. Items those reviews resolved, accepted or deferred are not raised again. SEC-001 and SEC-002 below explain how they relate to CPSE TICKET-002 SEC-002 and CPSE TICKET-001 SEC-002.

Code this delivery depends on, read unchanged:
- `src/layout/scene.ts`, `src/layout/kit/check.ts` (`checkScene`) and `src/layout/kit/format.ts` (`fmt`, `fmtPoints`);
- `src/react/SceneSvg.tsx`;
- `src/core/definitions/types.ts` (`defineProperties`, `withoutPrototype`) and `src/core/schema.ts` (`valueDescriptions`);
- `scripts/check-dist.ts`, `scripts/check-dependencies.ts` and `tsup.config.ts`.

**Review environment note:**
- **How I probed:** probe scripts lived in the session scratchpad (`…/scratchpad/dgp4-sec/`). They imported the repository's `src/` and `scripts/` and its installed `tsx`, `react`, `react-dom`, `eslint` and `tsup` by absolute path, and ran under `node --import <repo>/node_modules/tsx/dist/esm/index.mjs` with `TMPDIR` set to the scratchpad. Every image directory, package and file a probe needed was created in the scratchpad, never in the repository. The probes:
  - rendered the eight images to a contact sheet and inspected it;
  - measured the markup cost of each image as a pictograph unit;
  - ran `checkScene`, the image test's pattern and `SceneSvg` on escaped values;
  - rendered an escaped `url(` in headless Chrome 155.0.8059.79 and in macOS Quick Look (WebKit);
  - ran the license check on an image that imports its drawing, and on a symlinked image;
  - linted a virtual `src/images/logo.ts` with the repository's ESLint configuration;
  - ran tsup on a scratch package with a devDependency.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0).
- **Commands run in the repository** (read-only apart from the git-ignored `dist/`, which the test setup rebuilds):

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm check:images` | 0 | "Images: 8 (apple, ball, book, fish, flower, person, star, tree), every license recorded and allowed (MIT, CC0-1.0)." |
| `pnpm test` (with `TMPDIR` set to the scratchpad) | 0 | 33 files, 881 tests passed |

- **Tree check:** `git status --short` showed only the hook-written `.gener8v/runs.jsonl` before and after the probes and command runs.

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 3 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:** none is public. No entry in `tsup.config.ts` reaches `src/images/`, and no file outside it imports from it. After the test setup's build, `dist/` contains none of `Drawn in-house`, `imageManifest` or `getImageNames`. `#c62828` appears in `dist/` only as the named color `red`, which predates this delivery. The code is reached by the tests and by `pnpm check:images` only. Reachability today and later:
- **DGP TICKET-005:** the pictograph will build its `unitImage` enum from `getImageNames()` and `imageDescriptions()`. It will look up the caller's validated name in `images` and place that image's nodes in its Scene.
- **CPSE TICKET-005:** source export will print the same nodes into consumers' `.tsx` files.

**Caller-controlled values:** none in this delivery. The image data is static, written by the package. The future caller value is `unitImage`, a name that DGP TICKET-005 validates against the enum.

**What is handled well:**
- **Lookup by a caller's name:** `images` (`src/images/index.ts:12-18`) has a null prototype and is frozen. The test (`tests/images/images.test.ts:62-67`) finds nothing for `constructor`, `toString`, `__proto__` or `Apple`. `imageDescriptions()` returns an ordinary object, which inherits from `Object.prototype`. When it becomes an enum's `valueDescriptions`, `defineProperties` copies it onto a null prototype (`src/core/definitions/types.ts:148-156`). `src/core/schema.ts:239` copies own keys only. No code looks a caller's value up in it.
- **Immutability:** `defineImage` deep-freezes each image, down to every node, its attrs and each attribute pair. `imageAssets`, `imageManifest`, `images` and `ALLOWED_IMAGE_LICENSES` are frozen too. The test walks every level, and assigning to `apple.license` throws.
- **Drawing contract:**
  - every image passes `checkScene`;
  - attribute names come from the closed `REACT_PROP` set;
  - no image has a text node, `id`, `href`, `class` or `style`;
  - every number goes through `fmt()`;
  - each image has at most 8 nodes, and every shape lies inside the 100 × 100 space;
  - the snapshot pins every drawing.
- **The license check fails closed:**
  - any entry that is not a `<kebab-name>.ts` file is reported and never loaded: other extensions, upper-case names, subfolders. A symlinked `logo.ts` was reported as "not an image module", and the register entry for it as having no file (probe).
  - a missing or malformed register is reported.
  - an image module that throws on import rejects `main`, and the top-level `await` then exits non-zero (read, not probed).
- **The check runs code:** it loads every `<kebab-name>.ts` module in the directory it is given with dynamic `import()`. `pnpm test` already runs the same code, so a pull request gains nothing new. CI runs with `permissions: contents: read` and `persist-credentials: false`. The check prints file and image names unescaped to stdout and stderr. A pull request's author already controls CI output through the tests, so this is not a finding.

**Gaps:**
- **SEC-001:** the image checks reject `url(` as a literal substring. A CSS escape spells it another way.
- **SEC-003:** this set determines the cost of each pictograph unit. DGP TICKET-005's Known Hazards forbid a cap on the number of units.

**Not applicable:** SQL, NoSQL, command and template injection. Path traversal does not apply either: the only path is the developer's own command-line argument to `check:images`.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code and a development script, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. `author` is the organization (`gener8v`, as in `LICENSE`), and `provenance` is a sentence and a date. The library logs, stores and sends nothing. The script prints image names and problem messages only.
- **Secret scan:** I scanned the lines added by `git diff 02df5cc..HEAD`, outside `.gener8v/`. The patterns:
  - API keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs and network APIs;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `process.env`, `child_process`, `spawn` and `require(`.

  Three lines matched, all harmless: two comments that use the word "spawning", and the Vitest documentation URL in the snapshot header.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Manifest:** `package.json` gains only the `check:images` script. No dependency, export, `files` entry or override changed, and `pnpm-lock.yaml` is unchanged.
- **CI:** one step was added. The workflow keeps `permissions: contents: read`, `persist-credentials: false` and SHA-pinned actions.
- **Lint:** `src/images` joins `NON_RENDERING_DIRS`, so the network and React-boundary rules apply to it, and `tests/package/boundaries.test.ts` covers it. Nothing restricts what an image module may import (SEC-002).
- **Contributor guide:** the new "Adding a pictograph image" section contradicts itself on outside material (SEC-002).
- **Secrets and defaults:** none.
- **Cryptography:** not applicable.
- **Logging and monitoring:** not applicable. The library logs nothing (AD-014). The script writes problems to stderr and the register to stdout.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-14 15:31 UTC in the repository against the HEAD lockfile (`1ccfd87`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| TICKET-004: do not take images from icon packs or the web; draw simple shapes in-house under MIT; record provenance per image; flag that the set needs Product Owner sign-off | Honoured: each module states its own license, author and provenance; every drawing imports only `./draw` and `./types`; sign-off is flagged in the delivery record's Notes and in `src/images/manifest.ts`. The checks cannot tell an in-house drawing from an imported one (SEC-002) |
| TICKET-004: keep each drawing to a handful of paths (TR-004) | Honoured: at most 8 shapes (the flower), pinned by `tests/images/images.test.ts:102-105`. The cost per unit matters for DGP TICKET-005 (SEC-003) |
| CPSE TICKET-002 SEC-002 (resolution: `checkScene` reports `url(` in every value; every layout test runs it) | Honoured: `tests/images/images.test.ts:82-88` runs `checkScene` on every image, and `:90-100` adds a pattern for `data:`, `http(s):` and `//`. Both are substring checks, and a CSS escape passes them (SEC-001) |
| GSS TICKET-002 SEC-001: no argument spreads of caller-sized arrays | Not engaged: the only spread (`...circlesAround(…)` in `src/images/flower.ts:24`) spreads 5 package-defined nodes into an array literal, not into function arguments |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. The ticket names prd/CC-001, CC-003, CC-004 and TC-007.

| Constraint | Result |
|---|---|
| prd/CC-001 (license compatibility; exported files carry the material) | Met for the package: every image is MIT, in-house, by the same holder as `LICENSE`; `pnpm check:images` passes. The notice exported files will need is open (SEC-004); the control has a gap (SEC-002) |
| prd/CC-002 (WCAG 2.1 AA, non-text contrast) | Met for the shapes that carry each image against white: apple 5.62:1, ball 5.75:1, book cover 9.39:1, fish body 3.08:1 and tail 3.79:1, flower petals 4.95:1, person 9.65:1, star outline 6.23:1, tree 5.13:1 and 7.61:1. Lower-contrast parts (book pages 1.32:1, label 1.65:1, flower center 1.97:1) are details inside a darker shape, as the delivery record's Notes say |
| prd/CC-003 (no runtime fetching or data collection) | Met: drawings are inline Scene nodes; no URL, `data:` or network API; lint covers `src/images`; no image is in `dist/` yet. The control has a gap (SEC-001) |
| prd/CC-004 (no trademarked characters, logos or brands) | Met on inspection: I rendered the eight drawings to a contact sheet and looked at it. They show a whole red apple with stem and leaf, a striped ball, a book, a fish, a flower, a figure, a star and a tree. There is no text, mascot or logo. The Product Owner's sign-off on the set is still pending (EXT-001, DGP OQ-002), as the delivery record says. The control has a gap (SEC-002) |
| prd/TC-007 (side-effect-free modules) | Met: `tests/images/bundle.test.ts` shows that importing a constant bundles no drawing |
| prd/TC-009 (exported source embeds images) | Not yet applicable (CPSE TICKET-005); see SEC-004 |
| AD-008 / prd/TC-003 (no ids, no references) | Met by every delivered image; the control has a gap (SEC-001) |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The image set's "no URL, no element id" checks look for literal substrings, so a CSS-escaped `url(` passes both and binds to an element on the page in Chrome and WebKit

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-184 (incomplete list of disallowed inputs).
**Location:**
- `tests/images/images.test.ts:90-100`: the per-value pattern at line 96 is `/url\(|data:|https?:|\/\//i`.
- `src/layout/kit/check.ts:6`: `REFERENCE = /url\s*\(/i`. For `fill` and `stroke` it is the only check (`:58-60`).
- `src/images/draw.ts:12-15`: `shape()` passes any string value through.
- `src/layout/scene.ts:101`: `AttrValue` is `string | Rounded`.

**Description:**
The ticket's criterion "No image references an external URL, raster data, font or element id" is checked twice: by the pattern in the image test and by `checkScene`. Both look for literal substrings. Browsers parse SVG presentation attribute values as CSS, and CSS decodes escapes while it reads them: `\75 rl(` is read as `url(` (CSS Syntax Level 3, §4.3.4, "Consume an ident-like token"). CPSE TICKET-002 SEC-002 pointed out this escape for Scenes in general and was resolved with `checkScene`'s substring check. I do not raise that again. The difference here is that the images are a closed set of static values, which an exact allowlist can describe at almost no cost, and the image test is this ticket's own control for that criterion.

Probe: one image built with `defineImage` and `shape()`, with each `fill` below:

| `fill` value | `checkScene` problems | Image test rejects | Printed by `SceneSvg` |
|---|---|---|---|
| `url(#consumer-gradient)` | 1 | yes | — |
| `\75 rl(#consumer-gradient)` | 0 | no | `fill="\75 rl(#consumer-gradient)"` |
| `\75 rl(\2f\2f tracker.example\2f p.svg#paint)` | 0 | no | verbatim |

Browser check: the test file was an SVG with a green `linearGradient id="g"` and three circles, filled with `url(#g)`, `\75 rl(#g)` and `not-a-color`. Headless Chrome 155 and macOS Quick Look (WebKit) both painted the escaped circle green, the same as the plain `url(#g)`. Both painted the invalid one black.

No delivered image has such a value: every `fill` and `stroke` in the snapshot is `#rrggbb` or `none`. The gap is in the control.

**Attack Scenario:**
- **Attacker:** an outside contributor. Maintainers rely on the automated checks (prd/OC-001).
- **Steps:**
  1. The contributor opens a pull request that adds an image, or that gives `ball.ts` "subtle shading", with `["fill", "\\75 rl(#hero-gradient)"]`. In source it reads as an odd escape, not as a reference.
  2. They run `pnpm test -u`, as `CONTRIBUTING.md:69` directs. Lint, typecheck, the tests, `check:images` and `check:dist` all pass.
  3. The pull request is merged. DGP TICKET-005 then draws the image in every pictograph that uses it, and CPSE TICKET-005 copies it into exported files.
- **Result:**
  - the image's paint binds to whatever element on the consumer's page has that id, so the host page can repaint it. That is the cross-instance id problem that AD-008 removes.
  - the remote form (`\75 rl(\2f\2f host\2f x.svg#p)`) is printed into every page that shows the image. Chromium and WebKit do not fetch external paint servers, and Gecko fetches same-origin ones only, so no request to the contributor's host is expected. The broken part is the control's guarantee.

**Impact:** an image can break AD-008, prd/TC-003 and this ticket's no-URL, no-id criterion while every check passes. Exported files would carry the value into consumers' repositories.
**Recommendation:**
1. In `tests/images/images.test.ts`, replace the substring pattern with an allowlist per attribute, applied to every value in every image. For example:
   - `fill`, `stroke`: `/^(#[0-9a-f]{6}|none)$/`;
   - `d`: `/^[MLHVCSQTAZ0-9 .-]+$/` (the set uses absolute commands only);
   - `points`: pairs of plain numbers, `x,y` separated by single spaces;
   - numeric attributes: `typeof value === "number"` (already passed through `fmt()`);
   - `stroke-linecap`, `stroke-linejoin`: their keyword lists;
   - any other attribute: fail, so that a new attribute needs a deliberate rule.
2. As a cheaper fix that covers more, have `checkScene` report a backslash in any attribute value. No Scene value needs one, so this closes the escape route for every layout too. `src/layout/kit/check.ts` belongs to CPSE, so this needs the user's approval or a ticket.
3. Optionally narrow `shape()`'s value type for `fill` and `stroke` to `` `#${string}` | "none" ``.

**Compliance Impact:** weakens the controls for prd/CC-003 and for prd/TC-003 (through AD-008). Neither is violated: no delivered image has such a value.
**Status:** Resolved
**Resolution:** `tests/images/images.test.ts` checks every image attribute against an allowlist (colors `#rrggbb` or `none`, numbers only through `fmt()`, `d` and `points` only digits, separators and path letters, two keyword sets). `checkScene` (`src/layout/kit/check.ts`), which every layout test runs, now rejects a backslash in any string value, with a test (recorded under CPSE TICKET-002's amendments). An escaped `\75 rl(#g)` in an image fails three tests. Approved by the user, 2026-10-14.

---

### SEC-002: The license and provenance checks read only what an image module declares; its drawing can come from any import, including a devDependency that tsup inlines into `dist/`

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures. Also CWE-1357 (reliance on insufficiently trustworthy component).
**Location:**
- `scripts/check-image-licenses.ts:54-66`: the check compares each image's `name` and `license` with the register, and nothing else. `isImage` (`:76-77`) recognizes an image by its `name`, `license` and `nodes` keys.
- `tests/images/images.test.ts:71-78`: the test checks the declared `license`, `author` and `provenance` strings.
- `eslint.config.js:20`, `:112-126`: `src/images` gets the network and React rules, but nothing restricts its imports.
- `tsup.config.ts:23`: only React is external, so every other package import is inlined.
- `CONTRIBUTING.md:55`, `:65-66`, `:69`.
- `src/images/types.ts:9`: `ALLOWED_IMAGE_LICENSES` includes `CC0-1.0`.

**Description:**
The check does what DGP-NFR-005 asks: every image file is registered, and every declared license is on the allowed list. But every fact that the check and the tests read is something the module says about itself. Nothing ties the drawing to the file:
- **Probe 1:** a scratch image directory with a `manifest.ts` and a `logo.ts`. `logo.ts` imports its path data from `../vendor/brand-icons.ts` and declares `CC0-1.0` and "Drawn in-house…". `main([dir])` printed "Images: 1 (logo), every license recorded and allowed" and returned 0.
- **Probe 2:** ESLint with the repository's configuration on a virtual `src/images/logo.ts` that imports from `esbuild` (a devDependency) and `../core/style` reported no messages.
- **Probe 3:** the repository's tsup run on a scratch package with a devDependency `fake-brand-icons` inlined the package's string into `dist/entry.js`.
- **Related earlier finding:** CPSE TICKET-001 SEC-002 found this inlining route. Its resolution is `check:dist`, which scans for network APIs only, so nothing checks the license of inlined code. I do not raise it again; it matters here because images are where third-party artwork is most likely to be imported.
- **The contributor guide contradicts itself:**
  - line 55 says images are "never taken from icon packs or the web";
  - line 65 offers `CC0-1.0` "for public-domain material";
  - CC0 1.0 §4(a) waives no trademark rights, and a widely used CC0 icon set, Simple Icons, consists of brand logos;
  - meanwhile `tests/images/images.test.ts:74` fails any image that is not MIT, so a contributor bringing CC0 material must either declare MIT or edit the test.
- **What a reviewer sees:** the only reviewable form of a drawing is its path data in `tests/images/__snapshots__/images.test.ts.snap`, which a reader cannot picture. Step 4 of the guide regenerates it with `pnpm test -u`.

**Attack Scenario:**
- **Attacker:** an outside contributor, careless or deliberate.
- **Steps:**
  1. The contributor opens a pull request that adds `src/images/rocket.ts`. Its `nodes` use path data from an icon set, either imported from a devDependency added in the same pull request or pasted in. The module declares `license: "MIT"`, `author: "gener8v"` and the provenance "Drawn in-house…".
  2. They run `pnpm test -u` as the guide directs. Lint, typecheck, the tests, `check:images`, `check:deps` and `check:dist` all pass.
  3. A maintainer who relies on the checks (prd/OC-001) merges it, and tsup inlines the icon into the build.
- **Result:** the package ships, under an "MIT, drawn in-house" register entry, artwork that is attribution-licensed (for example CC BY 4.0) or is a brand mark. Exported files (CPSE TICKET-005) then copy it into consumers' worksheets.

**Impact:** violations of prd/CC-001 and prd/CC-004 that no check reports. Under prd/OC-003 a released version cannot be removed, only fixed forward or deprecated, so the artwork stays in that version. The package invites takedown requests (CC-004's rationale).
**Recommendation:**
1. **Keep each drawing in its own file.** Add an ESLint `no-restricted-imports` rule for `src/images/*.ts`, except `index.ts` and `manifest.ts`, that allows only `./draw` and `./types`. That closes both the import route and the inlining route for images.
2. **Show the drawing as a picture.** Have `pnpm generate` write a contact sheet from `images`, for example `src/generated/images.svg`. CI's "Generated files are up to date" step then forces it into every pull request that changes a drawing, and GitHub shows SVG changes as images.
3. **Fix the guide:**
   - reconcile `CONTRIBUTING.md:55` with `:65`;
   - for CC0 material, require the source URL and retrieval date in `provenance`, and state that CC0 does not clear trademarks;
   - either make the test accept CC0 only with such a provenance, or keep the test MIT-only and drop the CC0 line from the guide;
   - state that a new image needs the Product Owner's sign-off (prd/CC-004, EXT-001).
4. **Optionally, close the general route** that CPSE TICKET-001 SEC-002 left open: a post-build check that every input in esbuild's metafile lies under `src/`.

**Compliance Impact:** weakens the controls for prd/CC-001 and prd/CC-004, and the intent of DGP-NFR-005. Neither constraint is violated: all eight drawings are written in their own files, import only `./draw` and `./types`, and look generic when rendered.
**Status:** Resolved
**Resolution:** An ESLint block lets an image module (`src/images/*.ts` except `draw`, `types`, `manifest`, `index`) import only `./draw` and `./types`, so a whole drawing is in its file under the license it states. Tests in `tests/package/boundaries.test.ts` reject a layout import, another image, a package and a fixture, and allow the helpers. `CONTRIBUTING.md` now says the same thing everywhere: own work under MIT, or CC0 material with its source and author in the provenance; never a character, logo or brand, CC0 or not; imports limited to `./draw` and `./types`. No contact sheet: the drawing snapshot shows any change for review. Approved by the user, 2026-10-14.

---

### SEC-003: One pictograph unit costs up to 9 Scene nodes and 568 bytes of markup, and DGP TICKET-005's Known Hazards forbid a cap, so a 106-byte description can ask for 10^9 units

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-770 (allocation of resources without limits) and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/images/flower.ts:12-31`: 8 shapes, the largest image.
- `tests/images/images.test.ts:102-105`: at most 8 nodes per image, and under 8,000 characters for the whole set.
- `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-005.md:64`: "Very large counts are drawn in full; capping is an Open Question (DGP OQ-004) — do not invent a cap".
- `src/core/value-scale.ts:14`: `VALUE_LIMIT` (1,000,000,000), the bound DGP TICKET-005 is told to put on data values.

**Description:**
No code in this delivery is vulnerable: the images have a fixed size, and the test bounds it. But this delivery sets the cost of each unit, which the pictograph multiplies.
- **Probe:** a stand-in pictograph Scene of N copies of one image, each in a nested `svg` as the delivery record's Notes direct, rendered with `SceneSvg` and `renderToStaticMarkup`.
  - Markup per unit: flower 568 bytes, apple 383, book 350, fish 308, tree 299, ball 292, star 276, person 218.
  - 1,000 flowers: 0.57 MB of markup in 99 ms.
  - 10,000 flowers: 5.7 MB in 274 ms.
  - 100,000 flowers: 57 MB in 3.1 s, with 2.1 GB of heap in use after the render.
- **How many units a description can ask for:**
  - the unit count is value ÷ unitValue per category (DGP-REQ-026);
  - data values are bounded at ±1e9, and `unitValue` must only be positive;
  - so `{"type":"pictograph","categories":[{"name":"a"}],"values":[1000000000],"unitImage":"flower","unitValue":1}` (106 bytes) asks for 10^9 units, and more categories multiply that;
  - the validator's limits (`DESCRIPTION_VALUE_LIMIT`, 10,000 values, and `maxItems`) bound the description's size, not the count.
- **DGP TICKET-005's hazard makes this the instructed behavior:** it says "do not invent a cap". The specification's edge case speaks only of "hundreds of images".
- **Layout work then grows with a value's magnitude:** GSV TICKET-004 SEC-004 forbids that for checks, and DGP TICKET-001 SEC-001 showed it can block a process.

**Attack Scenario:**
- **Attacker:** anyone whose description reaches a server that renders pictographs. That includes a user of a worksheet-authoring application, and text that steers a model calling `generate_graph`: the tool handler validates the description, and the application renders it.
- **Steps:**
  1. The attacker submits the 106-byte description above, which is valid under the hazards as written.
  2. The application calls `createGraph`, or renders `<Graph>` on the server.
  3. The layout builds 10^9 nested `svg` nodes.
- **Result:**
  - extrapolating from 2.1 GB at 10^5 units, the Node.js heap runs out long before rendering.
  - V8 then aborts the process. No `try`, `internal_error` or fallback runs, so every user of that server loses service, and repeated submissions keep it down.
  - in a browser, the tab hangs.
- **Assumption:** DGP TICKET-005 is built as its hazards now say. That ticket's own security review rates the issue once the code exists.

**Impact:** availability. Once DGP TICKET-005 ships, a valid 106-byte description can crash a server process.
**Recommendation:** Defer to DGP TICKET-005 with a Known Hazard, and put OQ-004 to the Product Owner as a security bound, not a choice of presentation:
1. **Count before drawing.** Replace "do not invent a cap" with a rule:
   - compute the total image count arithmetically (Σ ⌈valueᵢ ÷ unitValue⌉) in a domain check, before any layout;
   - report a count above a limit as `too_large`, and state the limit in the property descriptions;
   - the Product Owner chooses the number under OQ-004 (the specification's edge case says "hundreds"; for example 1,000 per graph).
2. **Record the cost per unit:** at most 9 nodes and about 570 bytes of markup (the flower). Keep the 8-node bound in `tests/images/images.test.ts` so the cost stays known as images are added.
3. **Test it:** the trigger description returns `too_large` at once and never reaches the layout, and the largest allowed count renders within a stated number of nodes.
4. **Record the lookup rule as a hazard too:** the delivery record's Notes give it, but the ticket does not yet. Look images up only in `images`, which has a null prototype, and only after the enum check; never test membership with `in` or by reading `imageDescriptions()`.

**Compliance Impact:** None.
**Status:** Deferred → TICKET-005
**Resolution:** Known Hazard appended to `data-graphs-and-pictographs/TICKET-005.md`, replacing its "do not invent a cap": count units arithmetically in a domain check, report `too_large` above a limit the Product Owner sets under DGP OQ-004 (a provisional limit recorded as a DEL until then), and test it. Approved by the user, 2026-10-14.

---

### SEC-004: Exported files will embed MIT-licensed drawings, but neither the image data nor CPSE TICKET-005's criterion supplies the notice MIT requires

**Severity:** Informational
**Category:** Dependency
**OWASP Reference:** N/A
**Location:**
- `src/images/types.ts:21-34`: `ImageAsset` holds `license` and `author`, but no copyright line or notice text.
- `src/images/apple.ts:8-10`, and the same lines in each image module.
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-005.md:32`: "the header comment says images are embedded and names their license (prd/CC-001)".
- `LICENSE:3`: "Copyright (c) 2026 gener8v".

**Description:**
- **What the constraints require:** prd/CC-001, and its interaction with prd/TC-009, say embedded images travel with exported files and "need their notice". The MIT License has one condition: "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."
- **What the export will do:** the images are MIT, and an exported pictograph `.tsx` copies an image's drawing verbatim into a consumer's repository.
- **What it has to work with:** the export ticket asks only that the header "names their license". `ImageAsset` gives the printer `license: "MIT"` and `author: "gener8v"`, but no copyright year or notice text. The likeliest implementation therefore prints "MIT" and stops short of the notice.
- **Why it matters little in law but is cheap to settle:** whether one drawing is a "substantial portion" is a legal question. Either option below removes it.

**Attack Scenario:** N/A (Informational)
**Impact:** consumers who redistribute exported worksheets may not meet the MIT condition for the embedded drawings, and the obligation lands in curriculum teams' files.
**Recommendation:** Decide one of these, and append it as a Known Hazard to CPSE TICKET-005:
1. **Keep MIT and print the notice.** For each embedded MIT image, the header carries "Copyright (c) 2026 gener8v" and the MIT permission notice; the notice can be printed once per file. Expose it from the image set, for example as an `IMAGE_NOTICES` map or a `copyright` field, so the printer does not compose legal text.
2. **Or release the in-house drawings as `CC0-1.0`.** gener8v holds their copyright, and CC0 is already on the allowed list. Exported files then need no notice, only the record of what is embedded. This is a Product Owner decision, alongside prd/OQ-001 (the package license).

**Compliance Impact:** prd/CC-001 (the notice in exported files). Not violated today: no export embeds an image yet.
**Status:** Deferred → CPSE TICKET-005
**Resolution:** `IMAGE_LICENSE_NOTICES` (`src/images/types.ts`) exposes the notice each license needs: MIT's is the package `LICENSE`, kept identical by a test. Known Hazard appended to `component-packaging-and-source-export/TICKET-005.md`: an exported file that inlines a drawing prints that notice, with each image's name and author, and tests it. Approved by the user, 2026-10-14.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Attribute allowlist in the image test; `checkScene` rejects backslashes | No | `tests/images/images.test.ts`, `src/layout/kit/check.ts`, `tests/layout/kit/check.test.ts` |
| SEC-002 | Fix | Image modules import only `./draw` and `./types` (lint, tests); guide made consistent | No | `eslint.config.js`, `tests/package/boundaries.test.ts`, `CONTRIBUTING.md` |
| SEC-003 | Defer → DGP TICKET-005 | Known Hazard: arithmetic unit count, `too_large` above a Product Owner limit (OQ-004) | No | DGP `TICKET-005.md` |
| SEC-004 | Defer → CPSE TICKET-005 | `IMAGE_LICENSE_NOTICES` exposed and tested; Known Hazard on the exporter | No | `src/images/types.ts`, `src/images/index.ts`, `tests/images/images.test.ts`, CPSE `TICKET-005.md` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001 and SEC-002 are fixed. SEC-003 (bounding pictograph units, pending the Product Owner's OQ-004 limit) and SEC-004 (printing the MIT notice in exported files) belong to the tickets that render and export pictographs; each carries a Known Hazard. The notice text is already exposed and tested here.
- All eight images meet prd/CC-001, CC-003 and CC-004 as delivered. Product Owner sign-off on the set is still pending (EXT-001).
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (890 tests) exits 0 on three runs. Deliberately breaking each fix fails its tests.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-14, no known vulnerabilities.
