# TICKET-008: Document the minimum shown width of a ruler for 3:1 mark contrast where `<Graph>` users read it — Code Review

## Summary

Reviewed a documentation-only delivery (commit 0ee50a3): a README Styling paragraph, the `Graph` doc comment, the `RULER_MIN_MARK_WIDTH` comment and one README test. Every acceptance criterion is satisfied. The source diff holds comment lines only, the figures agree (330 px, about 11 px per centimetre, 164 px, 210 px), and the hedging "about" and "at least" is present in the new text. Two Observations, no Issues.

**Delivery Record:** .gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-008-delivery.md
**Files Reviewed:**
- README.md
- src/react/Graph.tsx
- src/layout/kit/ruler.ts
- src/react/graphs/RulerGraph.tsx (the existing statement the figures must match)
- tests/package/checks.test.ts

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| README Styling section states the minimum shown width, to whom it applies and what to do; a test asserts the section names the ruler and 330 px | Yes | README.md:33-40 (about 11 px per cm, 330 px for 30 cm, 164 px for 15 cm, 210 px for 12 in to sixteenths, `<Graph>`/per-type components/`createGraph`, "floor, not a guarantee", show wider or scale up); tests/package/checks.test.ts:57-62 |
| `Graph` doc comment carries the statement with the figure and points to the README; every `330` agrees | Yes | src/react/Graph.tsx:17-19; `grep -rn 330 src README.md` returns README.md:34, Graph.tsx:17, RulerGraph.tsx:11, all 330 px for 30 cm |
| Published description unchanged, with the reason in a DEL | Yes | DEL-001 in the delivery record; `git show 0ee50a3 --stat` touches no `src/core` or `src/generated` file |
| `RULER_MIN_MARK_WIDTH` comment says the shown size is the caller's, points to DEL-002 and the README; no code line changes | Yes | src/layout/kit/ruler.ts:26-32; diff of `src` shows only comment lines changed |
| No behavior change; lint, typecheck and tests pass | Yes | No code line changed (diff inspected); reviewer re-ran the three directly relevant test files, 93 passed |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-044 | Ruler drawn with a mark at every millimeter (contrast depends on shown width) | src/layout/kit/ruler.ts:RULER_MIN_MARK_WIDTH comment; README.md Styling | Yes |
| NLC-REQ-045 | Half-cm and whole-cm marks longer than mm marks | Unchanged (src/layout/kit/ruler.ts:drawRulerMarks); this ticket documents the finest marks only | Yes |
| CPSE-REQ-044 | Documentation for every graph type | README.md Styling; src/react/Graph.tsx doc comment | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | WCAG 2.1 AA 1.4.11, 3:1 for graphical objects | Yes | README states the condition under which the package's own drawing meets 3:1 and says it is not a guarantee |
| Rulers NLC TICKET-003 DEL-002 | Marks unchanged; the documentation states the minimum | Yes | No mark, size or layout code changed; no size prop or minimum width added |

### Architecture Decision Adherence

Technical design not consulted beyond the ticket: the change touches no code line, so no AD-XXX is engaged.

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-044, NLC-REQ-045 | `@spec` on drawRulerMarks | src/layout/kit/ruler.ts:`// @spec NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048` | Yes, unchanged |
| CPSE-REQ-044 | Documentation requirement, no implementing function | README.md | N/A |

**Coverage:** existing annotations intact; no new code added.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` lists `src/layout/kit/ruler.ts`:drawRulerMarks for NLC-REQ-044 and NLC-REQ-045; no new location.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/package/checks.test.ts tests/layout/ruler.test.ts tests/core/ruler-definition.test.ts` (subset of the record's vitest run) | 0 (93 passed) | Yes |
| `grep -rn "330" src README.md` | 0, three lines | Yes |
| `git diff -- src/layout/kit/ruler.ts src/react/Graph.tsx` | comment lines only | Yes |
| Full loop (generate, lint, typecheck, full vitest, bench, build, checks, audit) | Not re-run in full (scope of this review); no code line changed | Not independently confirmed; record shows Status Delivered, Verification passed |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Leaving the published description alone avoids changing the vocabulary, schema and tool schema for a pixel width a model cannot act on; the ticket allows it. |

No deviations are recorded; none found.

## Findings

### CR-001: The RulerGraph statement is worded more firmly than the new text

**Severity:** Observation
**Location:** src/react/graphs/RulerGraph.tsx:11-13
**Traces To:** TICKET-008 Known Hazards ("about" and "at least", never a guarantee; keep every figure the same in every place)
**Description:** The figures agree everywhere, but the wording does not. RulerGraph says "Show a ruler at least 330 px wide" and "narrower than that a 30 cm ruler's millimetre marks render lighter than 3:1", with no "about". README and `Graph` say "at least about 330 px", and the README adds that the figures are arithmetic, not a measurement. The ticket did not list RulerGraph.tsx among its outputs, so this is a leftover difference, not a defect in the delivery.
**Impact:** A reader of the per-type component sees the figure as a firm threshold, which the ticket's hazard says it is not. Low.
**Recommendation:** Optionally add "about" in the RulerGraph comment on a later documentation touch. No action needed for this ticket.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02; also quality QR-004): `RulerGraph.tsx` says "at least about 330 px", gives 164 px for 15 cm and points to the README's Styling section.

---

### CR-002: The README test guards the ruler name and 330 px only

**Severity:** Observation
**Location:** tests/package/checks.test.ts:57-62
**Traces To:** TICKET-008 criterion 1 (the test asserts the Styling section names the ruler and 330 px)
**Description:** The test meets the criterion as written. It does not guard the 164 px or 210 px figures, nor the "about" and "at least" hedging, so those could drift from RulerGraph and Graph without a failing test. The test also sits under the "repository files (CPSE-REQ-037, CPSE-REQ-039)" describe block, while the test cites NLC TICKET-008 and CPSE-REQ-044.
**Impact:** Low: only the figures the ticket asked to test are protected.
**Recommendation:** Optionally also assert "210 px" and "about" in the section. No action needed to approve.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02; also quality QR-003): the test reads the README Styling section, `Graph.tsx` and `RulerGraph.tsx` as words, whatever the line breaks, and requires each to name the ruler and give "about 330 px", "164 px" and "about 210 px". It found `Graph.tsx` giving "210 px" without "about", now corrected. Mutant: the README's 15 cm figure changed → fails.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | `RulerGraph` wording aligned | `src/react/graphs/RulerGraph.tsx` |
| CR-002 | Fixed | every figure checked in all three places | `tests/package/checks.test.ts`, `src/react/Graph.tsx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — two fixed (Engineer — Thomas Eaves, 2026-11-02)
