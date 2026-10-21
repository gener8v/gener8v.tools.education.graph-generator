# TICKET-007: Limit caller text: 200 characters for titles and labels, 20 for a unit — Security Review

## Summary

I reviewed `graph-library/graph-specification-and-vocabulary/TICKET-007` as it stands at HEAD (`fefe803`) on branch `ticket/gsv-007`. That covers the delivery (`1b17b88`), the code-review resolution (`ecffd20`) and the quality-review resolution (`fefe803`). Those two resolutions rewrote the drawn-text bound in `src/layout/kit/text.ts`: `isMark` by Unicode category, a run counted along the whole word, joiners transparent, and `MAX_STACKED_MARKS` raised to 4.

**What holds:**
- **The validator bounds every caller text.** All 19 `kind: "string"` term uses in the five registered types have `maxLength`: 18 at 200 and the circle's `unit` at 20. That includes the ruler's nested `measuredObject.label` and the line graph's `series[].lineLabel`. Over-limit text gets one `too_large` with the count and the limit.
- **The schemas publish the bounds.** The published schema and the tool schema carry all 19 as `maxLength`. The five color strings are bounded by an anchored pattern, and the five enums by their values.
- **The other echoes are bounded.** Caller keys reach messages only through `describeTerm`, clipped at 64, and values through `describeValue`, clipped at 40.
- **Every caller text the registered types draw goes through `wrap`.**
- **The text kit stays linear.** A 2 MB run of marks takes 53 ms, and the `\p{Mn}\p{Me}` test costs about 30 ns per code point, with no backtracking.
- **The dependency audit is clean.**

**Carried findings:**
- The two SEC-002 closures (caller-text length) hold.
- The carried one-cluster finding, rulers NLC TICKET-003 SEC-001, is closed only for the constructions the record names: one letter with a run of marks, a joiner chain, and marks split by joiners. Marks split by invisible code points that the plain-text policy still accepts draw the same column through the ruler, within 200 characters, while `createGraph` reports `ok` (SEC-001). At the bound itself, four marks below a letter still reach into the bar (SEC-002).

There are 5 findings: 0 Critical, 0 High, 0 Medium, 1 Low, 4 Informational.
- **SEC-001 (Low):** U+FFF0–U+FFF8, U+1D173–U+1D17A and the unassigned rest of plane 14 restart `drawnWord`'s mark count, and Chromium stacks the marks on either side of them on one letter. A 200-character label draws a 300-unit column through the bar, the end marks, the "5" and the ruler's body. A title made the same way runs through the object's label.
- **SEC-002 (Informational):** at `MAX_STACKED_MARKS` = 4, four marks below a letter draw 10.4 units past the label's one-line box and 4.4 units into the 12-unit bar. Criterion 6 asks for the text to stay inside its box.
- **SEC-003 (Informational):** `isMark` uses the engine's Unicode tables. On the same description, Node 24.1 and Chromium 153 draw different text, so server-rendered markup fails React hydration.
- **SEC-004 (Informational):** an over-limit text is scanned in full for unsafe characters before its length is checked. Refusing a 10 MB title takes 0.6 s, while `JSON.parse` of that body takes 3 ms.
- **SEC-005 (Informational, pre-existing):** glyphs 3 to 6 times wider than the width table estimates (cuneiform, U+FDFD, U+2E3B) draw past their box. Six such characters draw a circle's label across the circle.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-007-delivery.md`. I read DEL-001..DEL-003, the Deviations, the Notes, and the Post-Review Amendments: CR-001..CR-005, and QR-001..QR-006 with their re-verification.

**Earlier reviews read first.** Their findings are not raised again:
- **This ticket's code review (Approved):**
  - CR-001: marks classified by category;
  - CR-002: joiners neither count nor end a run;
  - CR-003: annotations;
  - CR-004: the `name` description;
  - CR-005: the file count.

  SEC-001 is CR-002's effect reached through separators other than joiners.
- **This ticket's quality review (Approved):**
  - QR-001: pinned bounds;
  - QR-002: one `isMark`;
  - QR-003: the early stop;
  - QR-004: 4 marks, and both joiners;
  - QR-005: the fixtures;
  - QR-006: the documentation of `UNIT_TEXT_LIMIT`.

  The quality review also considered and set aside `rotatedLines`' raw `textWidth`.
- **The three carried findings,** verified below:
  - `graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-002`;
  - `rulers/number-lines-and-coordinate-graphs-ticket-002-security-review/SEC-002`;
  - `rulers/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-001`.
- **`graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-002`,** the plain-text policy. Its resolution listed the default-ignorables to reject; the ranges in SEC-001 were not among them.
- **`graph-library/component-packaging-and-source-export-ticket-003-security-review`:**
  - SEC-003/SEC-004: raw `issue.path` and `formatIssue`;
  - SEC-005: validation on every render, an accepted risk;
  - SEC-006: the consumer's request-body limit.
- **`graph-library/data-graphs-and-pictographs-ticket-002-security-review/SEC-001`:** the line graph's text alternative, carried as a Known Hazard to CPSE TICKET-007.
- **`graph-library/number-lines-and-coordinate-graphs-ticket-001-security-review/SEC-003`:** custom tick labels in `drawAxis`, carried to graph-library NLC TICKET-002 as "wrap to one line".

**Files Reviewed:**
- `src/layout/kit/text.ts` (rewritten: `isMark`, `advance`, `clusters`, `MAX_STACKED_MARKS`, `MAX_CLUSTER_LENGTH`, `drawnWord`, `wrap`, `widestWord`)
- `src/core/definitions/shared.ts` (`CALLER_TEXT_LIMIT`, `UNIT_TEXT_LIMIT`, `maxLength` on the shared text terms)
- `src/core/definitions/categories.ts` (`CATEGORY_NAME_LIMIT`, `valueUnitLabel`)
- `src/core/definitions/circle.ts` (`unit`, the three label texts)
- `src/core/issues.ts` (the `too_large` documentation)
- `src/core/schema.ts` and `src/core/validate/structure.ts` (annotations only)
- `src/layout/kit/value-scale.ts` (a comment)
- `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `src/generated/description.ts` (regenerated)
- `tests/fixtures/plain-text.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`, `tests/core/validate-structure.test.ts`, `tests/core/schema-shape.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/react/Graph.test.tsx`, `tests/layout/pictograph.test.ts`
- **Read unchanged, because caller text flows through them:**
  - `src/core/format.ts` (the plain-text policy, `cleanText`, `quoteText`);
  - `src/core/definitions/types.ts`, `src/core/definitions/index.ts`;
  - `src/core/validate/json.ts`, `src/core/validate/envelope.ts`, `src/core/validate/suggest.ts`;
  - `src/graph.ts`;
  - `src/layout/ruler.ts`, `src/layout/circle.ts`, `src/layout/pictograph.ts`, `src/layout/line-graph.ts`, `src/layout/bar-graph.ts`, `src/layout/scene.ts`;
  - `src/layout/kit/title.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/ruler.ts`;
  - `src/react/SceneSvg.tsx`, `src/react/createGraphComponent.tsx`, `src/react/Placeholder.tsx`;
  - `src/tool/index.ts` (still an empty module).

**Context read:**
- the ticket and its seven Known Hazards;
- `.gener8v/constraints/prd.md`. There is no `constraints/graph-specification-and-vocabulary.md`;
- `.gener8v/technical-design/system-design.md`: AD-008, AD-010, AD-014, AD-015, TR-003 and the Data Model;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- graph-library CPSE TICKET-007 and graph-library NLC TICKET-002, for the hazards they carry.

**Review environment note:**
- **How I probed:**
  - Inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` runs and small scripts against `src/`, from the repository root.
  - Browser checks used the Chromium headless shell from the Playwright cache (Chrome for Testing 153.0.8010.12), on static pages of `<RulerGraph>`, `<CircleGraph>` and `<BarGraph>` markup (`react-dom/server`).
  - Ink was measured with canvas `measureText`, which goes through the same shaping, and checked against screenshots.
  - For SEC-003, `src/graph.ts` was bundled with the repository's esbuild into the scratchpad and run in both engines.
  - Scripts, pages, screenshots and logs are in `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/security-review-gsv007/`. Among them are `ruler-ink.png`, `ruler-zoom.png`, `ruler-ink2.txt`, `wide.png`, `wide2.png`, `perf.txt` and `worst.txt`.
- **Runtime:** Node.js v24.1.0 (ICU 77.1, Unicode 16.0), pnpm 10.28.2, React and React DOM 19.3.0, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` (2026-10-21, 20:21 UTC) | 0 | No known vulnerabilities found |
| `pnpm audit --prod` (2026-10-21) | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | `tsc --noEmit` |
| `pnpm exec vitest run --no-cache`, three runs | 1, 0, 0 | Run 1: 1 failed, 1,390 passed. The failure is the `tests/layout/pictograph.test.ts:279` property (fast-check seed 1871463178): its generator built a 232-character category name, now `too_large`. Runs 2 and 3: 49 files and 1,391 tests passed. The file alone passed five times. Not a security finding (see Verdict notes) |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | 16 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |

- **Not run:** `pnpm size` and `pnpm generate`, as instructed. `publint`, `attw`, `bench` and `check:images` were also not run: the code and quality reviews re-ran them with exit 0, and they have no bearing on these findings.
- **Tree check:** before I wrote this report, `git status --short` showed only ` M .gener8v/runs.jsonl`.

**Findings:** 5
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 4

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Every caller text term is bounded, in the validator and in both schemas.**
- **Walk of the registered definitions.** I walked every registered definition and both scoped maps, nested objects and lists included: 19 string term uses, none without `maxLength`.
  - At 200: `title` (×5), `measuredObject.label`, `categoryAxisLabel` and `valueAxisLabel` (×2 each), `categories[].name` (×3), `series[].lineLabel`, `valueUnitLabel`, and the circle's three label texts.
  - At 20: the circle's `unit`.
- **Walk of `src/generated/schema.json` and `src/generated/tool-schema.json`.** Every string schema has `maxLength` except two kinds, each bounded another way:
  - the 5 color schemas carry an anchored pattern over eight names and `#rgb`/`#rrggbb`;
  - the 5 enums (10 uses in the tool schema) carry their values.
- **The other kinds** (number, integer, boolean, color, enum) never reach the drawing or the text alternative as caller-written text:
  - colors resolve to `#rrggbb`;
  - an enum passes only as one of its own values;
  - numbers are printed by `formatSupplied` and `formatDerived`.
- **The check.** `checkValue` (`src/core/validate/structure.ts:124-135`) counts code points, as JSON Schema does. The every-term test (`tests/core/validate-structure.test.ts:797`) walks the registry, so a later type cannot land a text term unbounded. That includes the number line's planned `textAlternative` and `tickLabels` terms (graph-library NLC TICKET-002).

**Echoes of caller input that are not terms:**
- **Object keys:**
  - messages show them through `describeTerm`, clipped to 64 and escaped;
  - `formatIssue` clips the path the same way;
  - the raw `issue.path` stays a faithful JSON Pointer by design (CPSE TICKET-003 SEC-003).
- **Rejected values** appear through `describeValue`, clipped to 40.
- **`closestTerm`** skips names whose length rules them out, so a 1 MB key costs nothing there.
- **The `textAlternative` prop** is the consumer's, not the description's. It is cleaned and unbounded, and out of scope by the ticket's Known Hazard.
- **The tool `summary`** does not exist yet (`src/tool/index.ts` is empty). CPSE TICKET-007 keeps its summary-cap hazard.

**The text alternative and the Scene at the limits.** Both are now bounded, and linear in the description:

| Description | Body | Text alternative | Text nodes | Markup | One render |
|---|---|---|---|---|---|
| circle: three 200-character label texts, a 20-character unit, a 200-character title | 1,063 B | 1,081 chars | 15 | 5.6 KB | 1.6 ms |
| bar graph: 100 categories with 200-character names, horizontal | 22 KB | 21,678 chars | 2,612 | 538 KB | 49 ms |
| line graph: 6 series × 100 categories, every text at 200 | 35 KB | 137,547 chars | 130 | 405 KB | 36 ms |

The line graph's text alternative is the largest. It is the tool summary's concern (DGP TICKET-002 SEC-001, carried to CPSE TICKET-007), and is not raised again.

**The text kit (`src/layout/kit/text.ts`):**
- **Every drawn caller text passes through `wrap`:**
  - titles, through `titleBlock`;
  - the ruler, circle and pictograph labels;
  - the line-graph legend;
  - axis labels and category names, plain and turned (`value-scale.ts`).

  The kit's tick labels and ruler numbers are package text. `drawAxis` draws custom tick labels without `wrap`, but no registered type calls it yet, and graph-library NLC TICKET-002 carries "wrap to one line" as a Known Hazard.
- **`drawnWord` and `wrap` are linear,** and `wrap` still stops early. A run of `x` plus U+0E38 took, with `maxLines` 2:

  | Code points | `wrap` |
  |---|---|
  | 250,000 | 6.7 ms |
  | 500,000 | 13.5 ms |
  | 1,000,000 | 28.7 ms |
  | 2,000,000 | 53.2 ms |

  At 1M code points:
  - one CJK word took 333 ms, the slowest, because every code point reaches the range scans and the regex;
  - `"word "` repeated took 4.9 ms.

  Validated callers reach `wrap` with at most 200 code points.
- **The regex** `/[\p{Mn}\p{Me}]/u` is a single character class:
  - no `g` or `y` flag, so no `lastIndex` state;
  - no quantifier, so no backtracking.
- **What the bound gets right.** It bounds the constructions the record names, in every script tested: one letter plus 199 marks draws 4, and joiner chains draw 16 code points.
- **Where it fails:**
  - **SEC-001:** invisible separators the policy accepts restart the count.
  - **SEC-002:** 4 marks still leave the box.
  - **SEC-003:** mark classification depends on the engine.
  - **SEC-005:** the width side of the same box guarantee, outside this ticket.

**The validator's own cost:** SEC-004.

**Carried findings, verified:**

| Finding | Closed? | Evidence |
|---|---|---|
| `graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-002` (caller text length, render cost) | Yes | `unit` is at most 20 and every label text at most 200 (`src/core/definitions/circle.ts:73,136`). The worst circle now draws 15 text nodes in 5.6 KB of markup, where a 100 KB unit drew 6.4 MB. The summary cap stays a Known Hazard on CPSE TICKET-007, as the ticket requires |
| `rulers/number-lines-and-coordinate-graphs-ticket-002-security-review/SEC-002` (the ruler's label and title) | Yes | The ruler nests the shared `label` by identity, so `measuredObject.label` and `title` are at 200. Over-limit text is refused through `<RulerGraph>` (`tests/react/Graph.test.tsx:477`) |
| `rulers/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-001` (one-cluster text drawn over the figure) | Partly | Closed for one letter with a run of marks in any script, for joiner chains and for joiner-split marks. Not closed for marks split by U+FFF0–U+FFF8, U+1D173–U+1D17A or plane-14 code points (SEC-001). At the bound itself the marks reach the bar (SEC-002) |

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a library with no accounts, sessions or permissions. This ticket adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Nothing is stored, sent or logged.** The diff adds no `console`, `fetch` or network use. `pnpm check:dist` finds no network API in the 16 built files (prd/CC-003).
- **The text alternative carries caller text by design** (prd/CC-002), now bounded.
- **Invisible code points still pass.** The ones SEC-001 names pass `cleanText` and reach the text alternative unchanged: 4 of 4 in a probe. They carry no ASCII as tag characters do, but they are the residue of the invisible-character class that GSV TICKET-003 SEC-002 closed for the ranges it listed. SEC-001's third recommendation would close them as well.

### Configuration Security

**Status:** Adequate
**Notes:**
- **No secrets.** The diff holds no secrets, keys, URLs or configuration changes.
- **No runtime dependencies,** and `pnpm check:deps` agrees.
- **The dependency audit is clean.** `pnpm audit` and `pnpm audit --prod` were run on 2026-10-21 (pnpm 10.28.2) and found no known vulnerabilities.
- **No cryptography** is involved.
- **Compliance:**
  - **prd/CC-001:** no new dependency or asset.
  - **prd/CC-002:** the text alternative still states every caller text whole, now at most 200 characters.
  - **prd/CC-003:** no data flow.
  - **prd/CC-004:** not touched.

  No CC-XXX constraint is violated.

## Findings

### SEC-001: Invisible code points the plain-text policy accepts restart the stacked-mark count, so a 200-character label or title still draws a column of marks through the ruler's bar, end marks, number and body

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-451 (user interface misrepresentation of critical information).
**Location:**
- `src/layout/kit/text.ts:199-201` (`drawnWord`): `if (!joiner) marks = isMark(code) ? marks + 1 : 0;`. Every code point that is neither a mark nor U+200C/U+200D ends the run.
- `src/layout/kit/text.ts:28-46` (`ZERO_WIDTH`): the ranges U+1AB0–U+1AFF, U+20D0–U+20FF and U+E0000–U+E01EF include unassigned code points. `clusters` (`:157`) attaches them to the letter, but `isMark` does not count them.
- `src/layout/kit/text.ts:101-109` (`advance`): U+FFF0–U+FFF8, U+1D173–U+1D17A and U+E01F0–U+E0FFF get the 667 fallback width, though the browser draws them as nothing.
- `src/core/format.ts:94-106` (`INVISIBLE_FORMAT`): it rejects U+FFF9–U+FFFB, U+E0000–U+E007F and U+E0100–U+E01EF. It does not reject U+FFF0–U+FFF8, U+1D173–U+1D17A, U+E0080–U+E00FF or U+E01F0–U+E0FFF.
- `tests/fixtures/plain-text.ts:75-86` (`oneClusterTexts`): it uses no separator other than U+200D.

**Description:**
**What the bound does, and what the browser does.**
- **The bound.** It counts a run of marks and starts again at any code point that is not a mark or a joiner.
- **The browser.** Chromium (HarfBuzz) hides default-ignorable code points. When it attaches a mark to its base, it skips over them, so the marks on both sides of one stack on the same letter.
- **The policy.** The plain-text policy (GSV TICKET-003 SEC-002, a Product Owner decision) rejects the default-ignorables that review listed. Four ranges are still accepted, and `cleanText` keeps them too:
  - U+FFF0–U+FFF8 (unassigned);
  - U+1D173–U+1D17A (musical-symbol format controls, Cf);
  - U+E0080–U+E00FF and U+E01F0–U+E0FFF (the unassigned rest of plane 14).

**Probes.** Each text is 200 code points, and `createGraph` returns `ok` for every one. The ruler is 10 cm, with an object from 4.9 to 5.1. Ink was measured in Chromium 153 at the label's font, and the screenshots are `ruler-ink.png` and `ruler-zoom.png` in the scratchpad.

| Label | What `wrap` draws | Ink below the estimated box | What it covers |
|---|---|---|---|
| `x` + 199 marks below (control) | 1 line: `x` + 4 marks | 10.4 | see SEC-002 |
| `x` + (4 marks + ZWJ) repeated | 1 line: 4 marks | 10.4 | bounded: CR-002's fix holds |
| `x` + 4 marks + (U+FFF0 + 4 marks) × 39 | 2 lines of 115 and 85 code points, holding 92 and 68 marks | 299.9 | a column from the label down through the bar, both end marks, the "5" and the ruler's body |
| the same with U+1D173, U+FFF8, U+E01F0 or U+E0FFF | the same | 299.9 to 314.5 | the same |
| the same with U+E0080, which is in `ZERO_WIDTH` | 1 line of 16 code points, 12 of them marks: the 16-code-point cut is the only bound | 25.0 | through the bar to the top of the ruler's body. This is CR-002's 12-mark case, reached through another separator |
| a title made the same way, with U+FFF0 | 3 lines of 140, 60 and 6 | 460.4 | a column from the title through the object's label "pencil", the bar, the ruler and the "5" |

**Separators that stay bounded.** The browser draws these as bases with an advance:
- U+1BCA0 and U+1BCA2;
- the Hangul fillers U+115F, U+3164 and U+FFA0.

**Why the tests pass:**
- `oneClusterTexts` holds no such separator.
- The ruler test (`tests/layout/ruler.test.ts:253`) would catch the two-line case and the 12-mark case, but checks only its own texts.
- The scene geometry measures each line one line high (`tests/fixtures/scene-geometry.ts:66-68`).

**Attack Scenario:**
- **Attacker:** a curriculum author, or a model whose tool call was steered by injected content.
- **Steps:**
  1. Write a "How long is the pencil?" ruler.
  2. Make its label `x` followed by groups of four marks below, separated by U+FFF0. That is 200 characters, inside GSV-REQ-052's limit.
- **What happens:** it validates, `createGraph` reports `ok`, and any platform check that trusts the package's no-overlap layout passes. Students see a column of marks through the bar and the number they are asked to read. The text alternative states a label.
- **Limits:**
  - The author already controls the figure. What they gain is that the package reports it as clean, after a fix that says it is not possible.
  - Nothing escapes the graph's `<svg>`, and no markup is injected.

**Impact:**
- **The carried finding is not closed.** rulers NLC TICKET-003 SEC-001 is open in substance: the same column, the same size, the same 200 characters, through a different separator. The delivery record's Notes ("is fixed by DEL-002") and criterion 6 read as met.
- **It is not only the ruler.** The kit is shared, so titles in every type behave the same, and so do category names, which have no line cap.

**Recommendation:**
1. **End a run only at a code point drawn with an advance.** In `drawnWord`, write `if (isMark(code)) marks++; else if (advance(code) > 0) marks = 0;`. Joiners, `ZERO_WIDTH` entries and any other zero-advance code point then neither count nor end a run.
2. **Give the remaining default-ignorables zero width.** Add U+FFF0–U+FFF8, U+1D173–U+1D17A and U+E0000–U+E0FFF to `ZERO_WIDTH`. `clusters` then keeps them with their letter, the 16-code-point cut applies, and `wrap` does not spread them over lines the browser collapses.
3. **Or narrow the policy.** The Product Owner can extend the plain-text policy to the four ranges above, keeping the joiners and the emoji variation selectors. Of the three options, this one alone also keeps these code points out of the text alternative and the tool summary. Steps 1 and 2 are still worth doing for the kit's own robustness.
4. **Test it.**
   - Add separator texts to `oneClusterTexts`: U+FFF0, U+1D173, U+E0080, U+E0FFF and U+20F1.
   - In `tests/layout/kit/text.test.ts` and `tests/layout/ruler.test.ts:253`, assert that no drawn line holds more than `MAX_STACKED_MARKS` marks between two code points with an advance. A line that begins with marks counts from its start.
5. **Correct the record.** When this is resolved, update the delivery record's Notes on the carried SEC-001.

**Compliance Impact:** None. prd/CC-002 still holds: the text alternative states the label.
**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `drawnWord` (`src/layout/kit/text.ts`) ends a run of marks only at a drawn character (`DRAWN_BASE`: a letter, digit, punctuation, symbol, spacing mark or space). Joiners, invisible formatting characters and unassigned code points neither count nor end it, which closes the whole class rather than the listed ranges. `oneClusterTexts(n).invisibleSplitMarks` (U+FFF0, U+1D173 and U+E0080 between marks) draws 4 marks, in `tests/layout/kit/text.test.ts` and on the ruler in `tests/layout/ruler.test.ts`. Letting any character end the run fails 3 tests. rulers NLC TICKET-003 SEC-001 is now closed.

---

### SEC-002: At the bound, four marks below one letter still draw 10 units below the label's one-line box and into the top of the ruler's bar

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-451 (user interface misrepresentation of critical information).
**Location:**
- `src/layout/kit/text.ts:170-176` (`MAX_STACKED_MARKS = 4`)
- `src/layout/ruler.ts:102-103`: `labelHeight` is lines × 14 × 1.2, and `barTop` is `top + labelHeight + LABEL_GAP`.
- `src/layout/ruler.ts:35` (`LABEL_GAP = 6`)
- `src/layout/kit/title.ts:18-40` (`textLines`: the baseline at 0.8 em inside a 1.2 em band)

**Description:**
- **What criterion 6 asks.** A one-cluster label "draws inside its estimated line box: the text kit bounds the marks stacked on one letter, or counts them in the box's height".
- **What the code does.** The kit bounds the run, but the box is still one line high, and the ruler leaves a 6-unit gap above the bar.
- **Measured.** These are Chromium 153 figures for marks below `x` at the label's 14-unit font, on the criterion's own 4.9–5.1 object:

  | Marks | Ink below the box | Ink into the bar |
  |---|---|---|
  | 1 | −1.3 | — |
  | 2 | 1.5 | — |
  | 3 | 5.9 | stops 0.1 short |
  | 4 | 10.4 | 4.4 of its 12 |

  `ruler-zoom.png` shows the fourth mark inside the bar.
- **How it got there.** QR-004 raised the bound from 3 to 4 so that cantillated Hebrew is drawn whole. That step moved the residual into the bar.
- **Above the letter.** Marks above have a similar reach toward a title.

**Attack Scenario:** N/A (Informational). For the record: the very text in the ticket's criterion, `x` followed by 199 marks below, today draws its fourth mark over the top third of the bar at its centre, while `createGraph` reports `ok`.
**Impact:** Small. One mark covers part of the bar's middle. The numbers and the end marks stay clear, and real text rarely stacks four marks below one letter.
**Recommendation:** One of these:
- **Count the bounded marks in the box,** the ticket's own alternative. When a drawn line holds marks, extend its box below (and above) by the depth of its longest run: about 10 units for four marks below at 14 units.
- **Widen the label's gap** above the bar so the bound clears it.
- **Accept the residual.** State it in `MAX_STACKED_MARKS`' documentation, and record that criterion 6 holds as "clear of the numbers and the end marks" rather than "inside its box".

Whichever is chosen, test it in terms of an estimated mark depth, not one line height.

**Compliance Impact:** None.
**Status:** Accepted
**Resolution:** Risk accepted. The limit stays at 4 so pointed Hebrew with a cantillation mark draws whole (quality review QR-004). Only contrived text stacks 4 marks below one letter, and it reaches a few units into the bar, which stays readable.
**Risk accepted by:** Security — Thomas Eaves, 2026-10-21

---

### SEC-003: `isMark` asks the JavaScript engine's Unicode tables, so the server and the browser draw different text for marks one of them does not know, and React hydration fails

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to prd/TC-001 and prd/TC-002: server and browser output must match, and exported markup must equal the runtime markup.
**Location:**
- `src/layout/kit/text.ts:84` (`COMBINING_MARK = /[\p{Mn}\p{Me}]/u`)
- `src/layout/kit/text.ts:94-98` (`isMark`)
- its three uses: `advance` (`:103`), `clusters` (`:158`) and `drawnWord` (`:200`)

**Description:**
- **Before this ticket.** The kit decided widths and clusters from fixed tables (`ZERO_WIDTH`, `WIDE`), so a description was laid out to the same lines in every engine.
- **Now.** `\p{Mn}` and `\p{Me}` follow the running engine's Unicode version.
- **The engines differ.** Node.js 24.1.0 (ICU 77.1, Unicode 16.0) and Chromium 153 disagree on 39 code points that a later Unicode version made marks:
  - U+1ACF–U+1ADD and U+1AE0–U+1AEB;
  - U+10EFA–U+10EFB;
  - five code points in U+11B60–U+11B66;
  - five in U+1E6E3–U+1E6F5.

  The plain-text policy accepts all of them.
- **Probe.** I bundled `src/graph.ts` with the repository's esbuild and ran the same bundle in both engines. For a ruler labelled `x` plus 20 × U+1ACF:
  - Node draws `x` plus 15 × U+1ACF, the 16-code-point cut, since the code point is not a mark there;
  - Chromium draws `x` plus 4.

  The `<text>` node differs.
- **Line breaks differ too.** For U+10EFA–U+10EFB, which are outside `ZERO_WIDTH`, the estimated width is 667 in one engine and 0 in the other, so for longer text the line breaks and the number of text nodes differ.
- **The pair decides the set.** Node.js 22 (prd/TC-006) and Safari's JavaScriptCore carry tables of their own, so the code points that differ depend on which two engines meet.

**Attack Scenario:** N/A (Informational). For the record:
- An author stores a description whose label holds such a code point.
- Every page that server-renders it and hydrates fails hydration. React reports a recoverable error and re-renders on the client up to the nearest Suspense boundary, or the root.
- An exported component, printed by Node, differs from the one the browser renders.
- There is no data exposure: the effect is a client re-render and console errors on each view.

**Impact:** The determinism the kit had (prd/TC-001) is lost, for crafted text and for new-script text. Hydration mismatches are hard to trace (prd/RF-003).
**Recommendation:**
- **Use a fixed range table.** Replace the regex with a range table of nonspacing and enclosing marks pinned to one Unicode version, like `ZERO_WIDTH`. Either generate it with `pnpm generate` into `src/generated/` and add it to the freshness check, or write it in.
- **Test the table.** Under the pinned Node.js, a test compares the table with `\p{Mn}\p{Me}` and fails on a Unicode bump until the table is regenerated on purpose.
- **Classify every character the same way.** The plain-text policy already works this way, from fixed ranges, so every engine reads the same characters the same.

**Compliance Impact:** None.
**Status:** Accepted
**Resolution:** Risk accepted. Node and the browser disagree only on marks newer than the Unicode version both support; no curriculum text uses them, and the worst case is a hydration warning that re-renders the figure on the client.
**Risk accepted by:** Security — Thomas Eaves, 2026-10-21

---

### SEC-004: An over-limit text is scanned in full for unsafe characters before its length is checked, so refusing a 10 MB title takes 0.6 s

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A06:2025 Insecure Design and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/core/validate/structure.ts:124-130`: `findUnsafeTextChar(value)` at `:126` runs before `charactersOver` at `:127`.
- `src/core/format.ts:165-172` (`findUnsafeTextChar`)

**Description:**
`validate` of a ruler whose title is over the limit, median of three runs:

| Title | `validate` |
|---|---|
| 1 MB of `a` | 58 ms |
| 10 MB of `a` | 582 ms |
| 10 MB of U+0E38 | 611 ms |

**Where the time goes:**
- `findUnsafeTextChar` alone: 615 ms per 10 MB;
- a code-point count: 20 ms;
- `JSON.parse` of the same 10 MB body: 3 ms.

**What the limit now allows.** A text with more than `2 × maxLength` UTF-16 units has more than `maxLength` code points, so it can be refused without the scan.

**A second effect of the order.** A long text that also holds an unsafe character is reported as `wrong_kind` first, and as `too_large` only once it is fixed: two rounds for a model correcting its call.

**Attack Scenario:** N/A (Informational). For the record: a service that validates untrusted descriptions behind a 10 MB body limit spends about 0.6 s of event loop refusing each such request, about 200 times the cost of parsing it. The class is accepted: CPSE TICKET-003 SEC-005 accepted validation cost on every render, and SEC-006 asks consumers to keep a body limit. This finding only notes that the new limit makes the refusal nearly free.
**Impact:** CPU per refused request grows with text size, where it could be constant.
**Recommendation:**
- **Refuse early.** Before the scan, when `spec.maxLength !== undefined && value.length > 2 * spec.maxLength`, report `too_large`. Take `count` from a code-point count (20 ms per 10 MB), or leave it out: the message already has a "has more than N characters" form.
- **Keep the scan for the rest.**
- **Test it.** A 10 MB title should be refused well under, for example, 50 ms.

**Compliance Impact:** None.
**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `checkValue` (`src/core/validate/structure.ts`) checks `maxLength` before scanning for unsafe characters, so an oversized text is refused as `too_large` without the scan. A text within the limit that holds an unsafe character is still `wrong_kind`. Tested with a 10 MB title ending in U+202E (`tests/core/validate-structure.test.ts`) and in `tests/core/categories.test.ts`; putting the scan first again fails a test. One effect: a text that is both too long and unsafe is now reported as `too_large`, not `wrong_kind`.

---

### SEC-005: Characters far wider than the width table's estimate (cuneiform, U+FDFD, U+2E3B) draw past their box, so a few characters, well inside the limit, draw over a circle, other names or the axis

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-451 (user interface misrepresentation of critical information).
**Location:**
- `src/layout/kit/text.ts:22-25` (`FALLBACK_WIDTH` = 667, `WIDE_WIDTH` = 1000)
- `src/layout/kit/text.ts:65-79` (`WIDE`)
- `src/layout/kit/text.ts:101-109` (`advance`)

**Description:**
- **Pre-existing.** This ticket did not change it. I record it because the carried SEC-001's closure covers height only: marks stacked on a letter. Width is the other half of the same box guarantee.
- **Measured.** These are Chromium 153 advances at 14 units, against the kit's estimate of 10.3 (the fallback width with its 1.1 margin):

  | Character | Drawn advance | Times the estimate |
  |---|---|---|
  | U+1242B, a cuneiform numeric sign | 64.9 | 6.3 |
  | U+12219, a cuneiform sign | 56.4 | 5.5 |
  | U+FDFD, the Arabic Bismillah ligature | 44.9 | 4.4 |
  | U+2E3B, the three-em dash | 36.6 | 3.6 |
  | U+102A, Myanmar letter au | 34.3 | 3.3 |

  macOS's system fonts carry all of them.
- **Renders.** `createGraph` reports `ok` for each (`wide.png`, `wide2.png`):
  - a circle's radius label of 6 cuneiform signs draws across the circle and its radius line;
  - a bar graph's category name of 8 signs draws over "Bus", "Car" and the axis at 0;
  - a ruler label of 200 signs draws two lines across the whole drawing, cut at its edges.
- **The limit does not help.** The 200-character limit cannot bound this: six characters are enough.
- **Not what TR-003 covered.** The technical design's TR-003 considered estimates that are wrong for the consumer's font. Here the characters are the caller's choice, in the default font.

**Attack Scenario:** N/A (Informational). For the record: the author writes "r = " followed by a few cuneiform signs as the radius label. The label is drawn across the circle and its radius while the package reports a clean layout. As with SEC-001, the author already controls the figure.
**Impact:** GSS-NFR-003's no-overlap guarantee holds only for the scripts the width table knows. The same applies to the ruler's "never hides a number".
**Recommendation:** Open a ticket, and choose one:
- **Estimate the wide blocks at their width:**
  - cuneiform, U+12000–U+1254F, about 5 em;
  - Egyptian hieroglyphs, U+13000–U+1345F;
  - the Arabic ligatures U+FDF0–U+FDFF, about 3 to 4 em;
  - U+2E3A–U+2E3B, 2 to 3 em;
  - Myanmar.

  Alternatively, estimate every code point outside the scripts the table knows at the widest of these.
- **Narrow what callers may write.** The Product Owner restricts caller text to scripts the table knows.
- **Accept it,** and record that the no-overlap guarantees are for the table's scripts.

Whichever is chosen, add these characters to the layout geometry properties.

**Compliance Impact:** None.
**Status:** Accepted
**Resolution:** Risk accepted. Pre-existing: the width table underestimates a few rare glyphs (cuneiform, U+FDFD, U+2E3B). Only the author can write them, and the effect stays inside the graph's own `<svg>`.
**Risk accepted by:** Security — Thomas Eaves, 2026-10-21

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | A run of marks ends only at a drawn character | No | `src/layout/kit/text.ts`, `tests/fixtures/plain-text.ts`, `tests/layout/kit/text.test.ts` |
| SEC-002 | Accepted | — | Yes | — |
| SEC-003 | Accepted | — | Yes | — |
| SEC-004 | Fixed | Length checked before the unsafe-character scan | No | `src/core/validate/structure.ts`, `tests/core/validate-structure.test.ts`, `tests/core/categories.test.ts` |
| SEC-005 | Accepted | — | Yes | — |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 3 (SEC-002, SEC-003, SEC-005; Informational)
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Security role: SEC-001 and SEC-004 fixed; SEC-002, SEC-003 and SEC-005 accepted. All three carried findings are now closed. Re-verification: `pnpm generate`, `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 49 files and 1,393 tests on three runs.
- **The flaky property test** this review found (`tests/layout/pictograph.test.ts`, names up to 232 characters) is fixed: generated names are cut to fit the limit.
- **The validator work is sound.** The validator, schema and vocabulary work (GSV-REQ-052..054) is complete: every caller text term is bounded in the validator and in both schemas.
- **The carried findings:**
  - graph-library GSS TICKET-002 SEC-002 and rulers NLC TICKET-002 SEC-002 are closed.
  - rulers NLC TICKET-003 SEC-001 is closed only for the constructions the record names.
- **SEC-001 was the one to settle** (findings phase; now fixed). It is Low and blocks nothing, but the delivery record says the carried finding is fixed, and it is not for invisible separators. Fix it (recommendations 1 and 2, or the policy change in 3), or defer it to a named ticket with a Known Hazard. Either way, correct the delivery record's Notes.
- **SEC-002 to SEC-005 are Informational.** SEC-002 and SEC-003 come from this ticket's text-kit changes. SEC-004 is a cheap improvement the new limit makes possible. SEC-005 is pre-existing and belongs on its own ticket.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod`, 2026-10-21, no known vulnerabilities.
- **A test failure for the main session (not a security finding).** One of three full test runs failed on the `tests/layout/pictograph.test.ts:279` property (fast-check seed 1871463178). Its name generator (`:249-253`) joins up to five words, one of them 45 letters long, and so can build names of up to 232 characters, now over the limit. This is a remnant of the ticket's Supersession hazard: an intermittent CI failure, for the code or quality resolution to fix by bounding the generator to `CALLER_TEXT_LIMIT`.
