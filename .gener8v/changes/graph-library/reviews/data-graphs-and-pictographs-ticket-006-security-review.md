# TICKET-006: Accuracy and text-alternative checks — Security Review

## Summary

This review covers the delivery of `graph-library/data-graphs-and-pictographs/TICKET-006` at commit `dedd90f` on branch `ticket/graph-library-dgp-006`. The delivery adds tests only: fast-check generators, an independent geometric reference, and accuracy and text-alternative property tests. It changes no `src/` file, no dependency and nothing that ships (`package.json` `files` is `["dist"]`). The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-30.

The caller asked whether the suite's coverage of caller text in text alternatives (names up to `CALLER_TEXT_LIMIT`, stacked marks) leaves gaps a hostile description could exploit. The short answer:
- **What the suite gets right:**
  - It compares each name through `quoteText`, so it pins that `describe` quotes and neutralises names. `tests/core/format.test.ts` pins the neutralisation itself.
  - The `holds` matcher is sound against forged entries in names, titles, axis labels and series labels. Every entry starts with the package's “, and `quoteText` turns any caller “ or ” into a straight `"`, so caller text inside those quotations cannot produce a false match.
  - Probes with the inputs the generator never draws all state each entry whole, with no unsafe character in the text: names that are one 200-code-point cluster (`oneClusterTexts(200)`), 200 astral code points (400 UTF-16 units), and names that start with combining marks. Names of 201 code points are `too_large`.
- **SEC-001 (Informational):** caller text reaches a data graph's text alternative unquoted in one place, the pictograph's unit-shaped `valueUnitLabel`. The generator never puts a quotation mark there.
  - A valid 19-character label, `votes, “Fish” is 40`, puts a fake entry in the package's own quotation marks after the key and after every value: 101 copies at 100 categories.
  - The suite's presence-only check still passes.
  - GSS TICKET-002 SEC-003/SEC-004 settled that quotation marks are not a boundary. This finding records a new consequence of that rule, not a new rule.
- **SEC-002 (Informational):** `nameArb` leaves out the hostile and boundary shapes the fixtures already provide: the validating `HOSTILE_TEXT` strings, one-cluster and astral names at the limit, and names that start with marks. Its "a name at the limit" counter counts UTF-16 units, while the validator counts code points. No exploit was found. The gap matters because graph-library GSV TICKET-006 (DEP-005) reuses these generators for schema agreement.

Two findings: 0 Critical, 0 High, 0 Medium, 0 Low, 2 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-30)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-006-delivery.md` (DEL-001..003, no Post-Review Amendments yet)

**Files Reviewed:**
- `tests/fixtures/data-graphs.ts`
- `tests/fixtures/data-graph-reference.ts`
- `tests/layout/data-graph-accuracy.test.ts`
- `tests/core/data-graph-text-alternative.test.ts`
- `.gener8v/specifications/data-graphs-and-pictographs.md` (the `@spec Coverage` rows only)

Code the tests exercise, read unchanged:
- `src/core/format.ts` (`cleanText`, `quoteText`, `formatMeasurement`, `stateMeasurement`, `isUnitShaped`)
- `src/core/definitions/line-graph.ts`, `src/core/definitions/bar-graph.ts`, `src/core/definitions/pictograph.ts` (`describe`)
- `src/core/definitions/categories.ts` (`axisLabelSentences`)
- `src/core/definitions/shared.ts` (`CALLER_TEXT_LIMIT` = 200)
- `src/core/validate/structure.ts` (`charactersOver`)
- `tests/fixtures/plain-text.ts`

Context read:
- the ticket's Constraints (prd/CC-002, prd/TC-002) and Known Hazards;
- `.gener8v/constraints/prd.md` (there is no `constraints/data-graphs-and-pictographs.md`);
- `.gener8v/technical-design/system-design.md` (AD-003, AD-007, AD-014);
- `.gener8v/context.md`, `.gener8v/CONVENTIONS.md`;
- graph-library/component-packaging-and-source-export TICKET-007's Known Hazards (the text alternative in the tool `summary`);
- the earlier security reviews in this change, chiefly GSS TICKET-002 (SEC-003, SEC-004), GSS TICKET-004/005/006, and DGP TICKET-002 and 005. These settled risks are not raised again:
  - quotation marks in a text alternative are not a boundary, and a unit with quotes can count as unit-shaped and be stated unquoted (GSS TICKET-002 SEC-003/SEC-004, restated in GSS TICKET-004, 005 and 006);
  - text-alternative size (DGP TICKET-002 SEC-001, CPSE TICKET-007's `summary` cap).

**Review environment note:**
- **How I probed:** inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` scripts from the repository root, importing `./src/…` and `./tests/fixtures/plain-text.ts`. One mutation of `src/core/definitions/line-graph.ts` was copied aside, applied, tested and restored byte for byte; `git diff --quiet src` confirmed it.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0).

| Command | Exit | Evidence |
|---|---|---|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/data-graph-text-alternative.test.ts tests/layout/data-graph-accuracy.test.ts` | 0 | 2 files, 10 tests passed (949 ms) |
| Mutation: line-graph `describe` states the series label unquoted, then `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core tests/layout/data-graph-accuracy.test.ts` | 1 (expected) | 1 failed out of 1,105: `tests/core/line-graph.test.ts` "names the type, the title, both axis labels, and every series…". The new suite does not check series labels; the existing exact-text test does. Restored |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| Secret and API scan of the lines added by `git diff f7bbc50 dedd90f -- tests` (keys, tokens, token shapes, URLs, `fetch`, `eval`, `Function(`, `innerHTML`, `document.`, `window.`, storage, `console.`, `process.env`, `child_process`, `require(`, file I/O) | 1 (no match) | Nothing matched |

- **Not run:** `pnpm build`, `pnpm generate` and the full suite. `dist/` is prebuilt, and the delivery changes nothing they produce. The delivery record's Verification Run reports them.
- **Tree check:** `git status --short` before and after showed only changes I did not make: `.gener8v/pipeline-state.yaml`, `.gener8v/runs.jsonl`, `HANDOFF.md`, and the parallel code and quality reviews. This report is the only file I added.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
- **Entry points:** none added. The tests call `validate` and the three layouts directly. No runtime path, schema, bound or message changed.
- **Where caller text appears in a data graph's text alternative:**

| Caller text | How `describe` states it | What the new suite checks |
|---|---|---|
| `categories[i].name` | `quoteText` | presence of `“Name” is v` / `“Name”: v…`, for every category (and every series) |
| `title` | `quoteText` | nothing (generated, not asserted) |
| `categoryAxisLabel`, `valueAxisLabel` | `quoteText` (`axisLabelSentences`) | nothing (generated, not asserted) |
| `series[s].lineLabel` | `quoteText` | nothing: `entriesOf` builds `label` only for the failure message (`tests/core/data-graph-text-alternative.test.ts:43`) |
| `valueUnitLabel` (pictograph) | unit-shaped: **unquoted**, after the key and after every value. Otherwise quoted, once, in the key | the unit-shaped suffix inside each entry, built from ASCII words, `"students"` and ASCII text at the limit (`tests/fixtures/data-graphs.ts:150-155`) |

- **Soundness of `holds`** (`tests/core/data-graph-text-alternative.test.ts:30-35`):
  - The matcher needs the entry, then `, `, ` and ` or the sentence's end.
  - Every entry starts with the package's opening “. Names, titles, axis labels and series labels cannot hold a curly quote after `quoteText`, so none of them can fake an entry or hide a missing one.
  - The only caller text that can hold “ or ” is the unit-shaped pictograph label. The pictograph's entry format needs `: `, and a colon makes a label not unit-shaped, so even that label cannot fake a match. The check therefore cannot be fooled into passing; it just never looks for what should be absent (SEC-001).
- **Search scope:** for line graphs the search covers the whole text, not each series' sentence. If two series give the same category the same value, a dropped entry is masked. That is a weakness in test strength for the quality review, not something a description can exploit. `describe` is not caller-controlled, and the delivery's dropped-entry mutants still fail.
- **Stacked marks and the limit (probe):** I ran names through `validate` and `barGraphLayout` to see whether the entry holds and whether `findUnsafeTextChar` is -1. Every valid name held, with no unsafe character:
  - `oneClusterTexts(200)` (Latin, Thai and Arabic marks, joiner- and invisible-split marks, joined women);
  - 200 × U+1D4D0 (400 UTF-16 units);
  - `"̸⃝Cats"`, a name that starts with marks, which combine onto the package's opening “ and are shown as a decorated quote.

  `wordsOf(201)` and 201 × U+1D4D0 are `too_large`. `describe` has no length-dependent branch for names, so being at the limit changes nothing in the text alternative. The suite simply does not show that (SEC-002).
- **Size (probe):** the largest line graph I built took 34,021 bytes: 100 categories with 200-character names, 6 series with labels at the limit, and a title and both axis labels at the limit. It gives a 136,899-character text alternative. That is below the x,y graph's figure recorded in CPSE TICKET-007's hazards, so it is not raised.
- **Test output:** failure messages print `JSON.stringify(input)`, which escapes control characters, and the validator has already refused them. A message starts with `{"type"…`, so a generated name cannot begin a CI log line (for example a GitHub Actions `::` command).
- **Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The tests have no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** Library and test code, with no server, accounts, sessions or permissions (`.gener8v/context.md`).

### Data Protection

**Status:** Adequate
**Notes:**
- The tests log, store and send nothing beyond vitest's failure output, which holds generated descriptions only.
- The secret and API scan of the added lines found nothing.
- No fixture holds personal data: names are generated words or the shared `plain-text.ts` strings.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest and lockfile:** unchanged by `dedd90f`. `fast-check` (`^4.10.2`) was already a devDependency. The new files sit under `tests/`, outside `files: ["dist"]`, so nothing new ships.
- **Built output:** untouched (no `src/` change, no changeset).
- **Secrets and defaults:** none. The only constants are the layouts' documented geometry, restated in `tests/fixtures/data-graph-reference.ts`.
- **Cryptography:** not applicable. fast-check's random seeds are for test generation, not security.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014).

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-30 14:49 UTC in the repository against the lockfile at `dedd90f`, read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. There are no runtime dependencies; `react` is a peer.
- `git diff --stat f7bbc50 dedd90f -- pnpm-lock.yaml package.json` is empty.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| GSV TICKET-007: names and labels are plain text of at most `CALLER_TEXT_LIMIT`; include names at the limit and `REAL_STACKED_TEXT`; filter through `validate()`; compare through `cleanText`/`quoteText` | Honoured as written. "At the limit" is generated only as ASCII, and is counted in UTF-16 units (SEC-002) |
| Values stated as supplied, positions rounded | Honoured: text is compared with `String(value)` on a decimal grid. Positions use the 0.5 tolerance after `fmt()` |
| Generators at `tests/fixtures/data-graphs.ts`; reuse the Scene readers | Honoured (`tests/fixtures/scene-readers.ts`) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Not affected: no dependency or asset added |
| prd/CC-002 (WCAG 1.1.1 text alternative) | Met. The suite verifies that every category and value is stated for 500 generated descriptions per type and for the examples. SEC-001 shows that a valid description can add entries that are not there, but no real entry goes missing, so 1.1.1 is not violated |
| prd/CC-003 (no data collection or network) | Met: no network API in the added lines; nothing ships |
| prd/CC-004 (trademarked imagery) | Not affected |
| prd/TC-002 (rounding) | Met: positions are compared after `fmt()` with a 0.5 tolerance |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: A unit-shaped pictograph `valueUnitLabel` is stated unquoted after every value, so 19 characters of valid caller text add a fake entry in the package's own quotation marks, 101 times at 100 categories, and the DGP-NFR-003 suite never generates a quotation mark there

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to OWASP LLM01:2025 Prompt Injection and CWE-451 (user-interface misrepresentation of critical information).
**Location:**
- `src/core/format.ts:208-222` (`stateMeasurement` and `isUnitShaped`: a unit-shaped unit goes through `formatMeasurement`, which only cleans it);
- `src/core/definitions/pictograph.ts:162-170` (the unit after the key and after every value);
- `tests/fixtures/data-graphs.ts:150-155` (the generated `valueUnitLabel`: ASCII words, `"students"`, ASCII text at the limit);
- `tests/core/data-graph-text-alternative.test.ts:30-35`, `:51-57` (a presence-only check).
**Description:**
`quoteText` neutralises every double-quote lookalike in names, titles, axis labels and series labels (GSS TICKET-002 SEC-004). A pictograph's unit-shaped label does not go through it: at most 20 characters, no `.!?:;`. The label is stated as written, curly quotes included, after the key and after every value. Probe (`validate` and then `pictographLayout`, all valid):

```
valueUnitLabel: "votes, “Fish” is 40"   (19 characters, unit-shaped)
A pictograph. Each apple stands for 1 votes, “Fish” is 40. “Cats”: 7 votes, “Fish” is 40 and “Dogs”: 3 votes, “Fish” is 40.
```

The same label with 100 categories puts 101 copies of `“Fish” is 40` in the text alternative. That is the wording a line or bar graph uses for a real entry, inside the package's own quotation marks. The DGP-NFR-003 suite passes on this description:
- `holds` finds `“Cats”: 7 votes, “Fish” is 40` and `“Dogs”: 3 votes, “Fish” is 40`;
- it never asserts that the text holds nothing else;
- the generator never puts a quotation mark in a unit label.

So the one place a data graph's text alternative carries caller text unquoted is the one place the suite does not try with hostile input. Line and bar graphs have no caller unit, so the gap is the pictograph's alone among the data graphs. It also applies to the shapes' `unit` (circle, square, cube, cylinder, triangle), stated once per measurement there.

This is the rule GSS TICKET-002 SEC-003/SEC-004 settled, restated in GSS TICKET-004, 005 and 006 ("a unit with quotes … counts as unit-shaped and is stated unquoted"). DGP TICKET-005 noted the per-value repetition but not this. What is new is the consequence: in a pictograph the label repeats after every value, so it can forge whole category entries, not just garble one measurement.
**Attack Scenario:** N/A (Informational). Illustration: a model writes a pictograph description from a document that carries an injected instruction, which supplies the label above. A screen-reader user hears a category "Fish" with 40 votes, 101 times, that the graph does not have. A model reading the text alternative through the tool `summary` (CPSE TICKET-007) sees fake data inside the package's own quotation marks.
**Impact:**
- The text alternative misstates the data a WCAG 1.1.1 alternative is there to convey. All real entries are still present, so prd/CC-002 is not violated.
- The package's quotation marks can be faked through this one path.
- No markup, script or confidentiality impact: the text is escaped plain text in `aria-label` and `<title>`.
**Recommendation:** choose one, during resolution:
- **Smallest fix:** in `isUnitShaped`, treat a unit that contains any `QUOTE_LIKE` character as not unit-shaped. It is then quoted and neutralised by `quoteText`, and in a pictograph stated once in the key. Add the case to `tests/core/format.test.ts` and `tests/core/pictograph.test.ts`.
- **Alternative:** in the unit-shaped branch of `stateMeasurement`, replace `QUOTE_LIKE` with `"`, as `quoteText` does.
- **In this suite, either way:** add unit labels with “ ” and a lookalike to `pictographArb`. Assert that each category's quoted name appears in the entries list exactly as often as it should, so a forged entry fails.
- **Or:** record that the settled rule also covers forged pictograph entries, so it is accepted rather than unnoticed.

**Compliance Impact:** None (prd/CC-002 met: every real category and value is stated)
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). `isUnitShaped` (`src/core/format.ts`) treats a unit holding a straight quotation mark or any `QUOTE_LIKE` lookalike as not unit-shaped, so `stateMeasurement` quotes it through `quoteText` and a pictograph states it once, in its key: `Each apple stands for 2 “votes, "Fish" is 40”. “Cats”: 7 and “Dogs”: 4.` This applies to the shapes' units too. New tests in `tests/core/format.test.ts` and `tests/core/pictograph.test.ts` (the forged entry never appears; stated once at 100 categories); `pictographArb` draws quoted unit labels (counter ~14%). Patch changeset `.changeset/unit-with-quotation-marks-quoted.md`. Mutant (the quote check removed) fails both new tests. No existing test pinned the old rule.

---

### SEC-002: The generated names leave out the hostile and boundary shapes the fixtures already hold, and "a name at the limit" is counted in UTF-16 units while the validator counts code points

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A
**Location:** `tests/fixtures/data-graphs.ts:22-36` (`wordArb`, `atLimitArb`, `nameArb`); `tests/core/data-graph-text-alternative.test.ts:98` and `:110` (the counter `name.length === CALLER_TEXT_LIMIT`)
**Description:**
`nameArb` draws from four sources:
- printable-ASCII words of up to 24 characters;
- `REAL_STACKED_TEXT`, where every string starts with a base letter and is at most 16 code points;
- `BENIGN_TEXT` and three quote strings;
- ASCII words of exactly 200 characters.

It never draws these, which `tests/fixtures/plain-text.ts` already provides:
- the `HOSTILE_TEXT` strings that pass validation (comment, JSX and attribute breakouts, `<script>`, a markdown image link);
- `oneClusterTexts(CALLER_TEXT_LIMIT)`: one cluster of 200 code points, joiner- and invisible-split marks;
- a name at the limit made of astral characters (200 code points, 400 UTF-16 units);
- a name that starts with combining marks, which then attach to the package's opening “.

The counter checks `name.length`, in UTF-16 units. `charactersOver` (`src/core/validate/structure.ts:92-97`) counts code points. So "a name at the limit" means ASCII at the limit only, and an astral name at the code-point limit is not counted.

The probes found nothing exploitable. Every such valid name is stated whole and quoted, with no unsafe character, and `describe` has no length-dependent branch for names. The gap is about evidence: the suite's claim, "names up to `CALLER_TEXT_LIMIT` including stacked marks", holds for the easy end of each range. These generators are also the inputs graph-library GSV TICKET-006's all-types schema agreement test will reuse (DEP-005). Astral and one-cluster names at the code-point limit are exactly where a JSON Schema `maxLength` and `charactersOver` could disagree, and the generators would not produce them.
**Attack Scenario:** N/A (Informational)
**Impact:** None today. A later change that counts or cuts names differently (by UTF-16 unit, by grapheme, or with a cap inside `describe`) could break the text alternative or the validator's agreement with the schema for these names, and this suite would not show it.
**Recommendation:**
- Add a weighted branch to `nameArb` with each `oneClusterTexts(CALLER_TEXT_LIMIT)` value, an astral name of exactly `CALLER_TEXT_LIMIT` code points, a name that starts with combining marks, and the `HOSTILE_TEXT` strings with `findUnsafeTextChar(text) === -1`. Filter per name, so whole samples are not discarded by `valid()`.
- Count "a name at the limit" as `[...name].length === CALLER_TEXT_LIMIT`, and add a counter for a limit name that is not ASCII.
- Record in the DEP-005 hand-off that the generators now include code-point-limit names.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). `nameArb` gains a branch with every `oneClusterTexts(CALLER_TEXT_LIMIT)` value, a 200-code-point astral name, a name starting with combining marks and the `HOSTILE_TEXT` strings that pass `findUnsafeTextChar`; "a name at the limit" counts code points, and a counter for a non-ASCII name at the limit (~20%) is asserted. These generators now include code-point-limit names for the DEP-005 schema-agreement reuse.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | quoted units with quotation marks; tests; changeset | No | `src/core/format.ts`, `tests/core/format.test.ts`, `tests/core/pictograph.test.ts`, `tests/fixtures/data-graphs.ts`, `tests/core/data-graph-text-alternative.test.ts`, `.changeset/unit-with-quotation-marks-quoted.md` |
| SEC-002 | Fixed | hostile and boundary names generated; code-point counter | No | `tests/fixtures/data-graphs.ts`, `tests/core/data-graph-text-alternative.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Both Informational findings fixed in resolution (Engineer — Thomas Eaves, 2026-10-30) and re-verified; recorded in the delivery record's Post-Review Amendments.
