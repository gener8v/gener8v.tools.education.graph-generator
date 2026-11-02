# number-lines-and-coordinate-graphs/TICKET-008: Document the minimum shown width of a ruler — Quality Review

## Summary

Reviewed a documentation-only delivery: a README Styling paragraph, two comments (`Graph.tsx`, `ruler.ts`) and one README test. The text is clear and the figures mostly agree with `RulerGraph.tsx`. Two small figure and wording inconsistencies and some test brittleness remain. 4 findings: 0 Critical, 1 Concern, 3 Suggestions.

**Files Reviewed:**
- `README.md`
- `src/react/Graph.tsx`
- `src/layout/kit/ruler.ts`
- `src/react/graphs/RulerGraph.tsx` (consistency reference)
- `tests/package/checks.test.ts`

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The statement sits where a user reads it (README Styling, the `Graph` doc comment) and where a maintainer needs it (the `RULER_MIN_MARK_WIDTH` comment). No code lines changed. The figure is stated in three places by design, and the comments point back to the README.

### Readability

**Rating:** Adequate
**Notes:** The README paragraph is clear on what, why and what to do. Two things trip a reader: "scale it up, for example on a phone" (QR-002), and 164 px beside "11 px per centimetre" (QR-001).

### Error Handling

**Rating:** Strong
**Notes:** Not applicable to comments and docs. The test fails loudly if the section is missing, because the regex falls back to "".

### Test Coverage

**Rating:** Adequate
**Notes:** Ran `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/package/checks.test.ts`: 26 passed, exit 0. `npx tsc --noEmit`: exit 0, no output. `npx eslint` on the three changed source and test files: no output. The new test checks only "ruler" and the literal "330 px" in the Styling section. It does not check 164/210, or that the `Graph.tsx` and `RulerGraph.tsx` figures agree (QR-003). `prettier --check` warns on three files, but prettier is not a project script, so it is not counted as a finding.

### Observability & Operability

**Rating:** Strong
**Notes:** Not applicable. No runtime code changed.

## Findings

### QR-001: README and `Graph.tsx` say 11 px per centimetre but give 164 px for 15 cm

**Category:** Readability
**Severity:** Concern
**Location:** `README.md:33-35`, `src/react/Graph.tsx:17-18`
**Description:** 330 px for 30 cm is 11 px per centimetre, so 15 cm by that rule is 165 px. Both texts say 164 px with no explanation (the rule may be rounded; the delivery record does not say).
**Impact:** A developer who checks the arithmetic finds the numbers disagree and doubts the whole floor. Anyone with a 15 cm ruler, a common size, hits it first.
**Recommendation:** Either state 165 px, or say the per-centimetre rate is rounded ("about 10.9 px"). Say which of the two values is the source of truth.
**Status:** Resolved
**Resolution:** Fixed under security review SEC-001 (approved by Engineer — Thomas Eaves, 2026-11-02): the rule is now a floor of about 130 px, and about 11 px per centimetre above about 12 cm; 164 px for 15 cm is the stated figure of DEL-002's model (10.9 px per centimetre), the "about 11" the ticket asked for.

---

### QR-002: "Scale it up, for example on a phone" is ambiguous

**Category:** Readability
**Severity:** Suggestion
**Location:** `README.md:38-39`
**Description:** On a phone the container is narrow, so the SVG scales down. "Scale it up" does not say how: let the page scroll sideways? Set a minimum width? Use a larger length? The text also does not say that 11 px per centimetre applies to a unit-sized ruler of any length, or give a per-inch rate for the inch rulers.
**Impact:** The reader knows the problem but not the remedy.
**Recommendation:** Name a concrete remedy, for example `min-width` on the container plus horizontal scrolling. Also give the per-inch rate, or say the inch figure is only for 12 in to sixteenths.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the README names the remedy — give the ruler the full width of the screen or page rather than a column, or use a shorter ruler.

---

### QR-003: The README test is brittle to reflow and weak on the figures it exists to protect

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/package/checks.test.ts:57-62`
**Description:** `toContain("330 px")` fails if prettier or an editor rewraps the line between "330" and "px" (the number is near a line end today), and the failure message says nothing about reflow. The test also does not look at 164 or 210, or at `Graph.tsx`/`RulerGraph.tsx`, so the figures can drift apart without a failure. The `^## ` lookahead depends on a following section existing, but it fails closed.
**Impact:** A false failure after a harmless reflow, and silent drift of the other figures.
**Recommendation:** Match `/330\s+px/` and, if cheap, assert the same figure in `src/react/Graph.tsx` and `src/react/graphs/RulerGraph.tsx` with one regex, so the delivery's grep check becomes a test.
**Status:** Resolved
**Resolution:** Fixed under code review CR-002 (approved by Engineer — Thomas Eaves, 2026-11-02): the test reads all three places as words and checks every figure and the "about" wording.

---

### QR-004: `RulerGraph` states the floor without the per-centimetre rule

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/react/graphs/RulerGraph.tsx:11-14`
**Description:** `RulerGraph` says "at least 330 px wide" without saying that it is for a 30 cm ruler. The `Graph` comment and the README give the rule by length. The two components that point at each other are worded differently. `RulerGraph.tsx` was not in the delivery's file list, so the change is out of scope by design, but the wording gap is real.
**Impact:** A reader of the per-type component sees an over-conservative floor for short rulers and a figure that disagrees with the README's.
**Recommendation:** Add the sentence "about 11 px per centimetre" to the `RulerGraph` comment in a follow-up, or leave it and note why.
**Status:** Resolved
**Resolution:** Fixed under code review CR-001 and security review SEC-001 (approved by Engineer — Thomas Eaves, 2026-11-02): `RulerGraph.tsx` gives the 15 cm figure, the 130 px floor and a pointer to the README.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | via security SEC-001 | `README.md`, `src/react/Graph.tsx` |
| QR-002 | Fixed | remedy named | `README.md` |
| QR-003 | Fixed | via code review CR-002 | `tests/package/checks.test.ts` |
| QR-004 | Fixed | via CR-001 and SEC-001 | `src/react/graphs/RulerGraph.tsx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — four fixed (Engineer — Thomas Eaves, 2026-11-02)
