# TICKET-008: Document the minimum shown width of a ruler for 3:1 mark contrast where `<Graph>` users read it — Security Review

## Summary

Reviewed a documentation-only delivery at commit `0ee50a3`: a README paragraph, two source doc comments and one README test. No executable line changed, so there is no new attack surface. The review therefore looks mostly at compliance (prd/CC-002, WCAG 2.1 AA 1.4.11): whether the new guidance is accurate and avoids overclaiming. It mostly is. The 330 px (30 cm), 164 px (15 cm) and 210 px (12 in to sixteenths) figures match the layout's own numbers, and the wording is hedged ("about", "at least", "a floor … not a guarantee"). One problem: the README states a general rule of "about 11 px wide per centimetre of its length". That rule is too lenient for any centimetre ruler of 11 cm or less, because their marks are capped at the 1.5-unit tick width and need about 128 px whatever their length. One Low finding.

**Files Reviewed:**
- `README.md` (Styling section, lines 33–40)
- `src/react/Graph.tsx` (doc comment, lines 17–19)
- `src/layout/kit/ruler.ts` (comment above `RULER_MIN_MARK_WIDTH`, lines 25–33; `drawRulerMarks` read for the arithmetic)
- `tests/package/checks.test.ts` (new README test, lines 57–62)
- Context read: `src/react/graphs/RulerGraph.tsx:11-13`, `src/layout/ruler.ts`, `src/layout/scene.ts` (`rootAttrs`), `src/core/style.ts` (`lineWidths.tick`, `colors.line`), `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md` (DS-003)

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Not Applicable
**Notes:** No entry point, validator or layout code changed. `git diff 0ee50a3~1 0ee50a3 -- src` shows only comment lines: a filter for changed lines that are not `*` or `//` comment lines returns nothing. `src/core/definitions/ruler.ts` and `src/generated/*` are untouched (DEL-001: the published description is unchanged), so neither the schema nor the tool schema that a model reads has changed. The new test reads a fixed repository file (`README.md`) with a non-backtracking-prone regex, in test code only.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package has no authentication, sessions or authorization. Nothing in this delivery touches them.

### Data Protection

**Status:** Adequate
**Notes:** The added text contains no personal data, credentials or internal hosts. The `RULER_MIN_MARK_WIDTH` comment names a repository-relative `.gener8v/` path. That is the project's convention, it is not sensitive, and it is stripped from the published bundle like every other comment. prd/CC-003 (no data collected, transmitted or stored) is unaffected.

### Configuration Security

**Status:** Adequate
**Notes:** No configuration, build, dependency or package-manifest change. No secrets in the diff (`git show 0ee50a3`).

**Dependency check:** `pnpm audit` (pnpm, run 2026-11-02 at commit `0ee50a3`): exit 1, one moderate advisory, `minimatch` <11.0.1 via `.>eslint>minimatch` (GHSA-g3hv-75wg-m249, "potential denial of service via globparts amplification"). It is a dev-only lint dependency, already an accepted risk (CPSE TICKET-004 SEC-002), and is not re-raised here. `pnpm audit --prod`: exit 0, "No known vulnerabilities found".

**Cryptography / Logging:** Not applicable. No cryptography, random numbers or logging in the delivery.

**Compliance cross-reference (prd/CC-002, WCAG 1.4.11):**
- The drawing is unchanged. The ticket required that ruler Scenes stay byte-identical; `tests/layout/ruler.test.ts` and `tests/package/checks.test.ts` pass (`GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 …`: 2 files, 54 tests passed). The marks' sub-floor contrast at small shown sizes remains rulers NLC TICKET-003 DEL-002's decision. It is not reopened here.
- I checked the figures against the built layout (`createGraph` from `dist/`, finest mark `stroke-width` per ruler, floor = 0.48 × 400 / width, using the delivery's threshold that `#222222` blended into white reaches 3:1 at coverage ≥ 0.48, which I recomputed and confirmed):

  | Ruler | Finest mark (units) | 3:1 floor (px) | README per-cm rule (px) |
  |-------|--------------------|----------------|-------------------------|
  | 30 cm | 0.59 | 325 | 330 |
  | 15 cm | 1.17 | 164 | 165 |
  | 12 cm | 1.47 | 131 | 132 |
  | 11 cm | 1.5 | 128 | 121 |
  | 10 cm | 1.5 | 128 | 110 |
  | 5 cm | 1.5 | 128 | 55 |
  | 1 cm | 1.5 | 128 | 11 |
  | 12 in, sixteenths | 0.92 | 209 | — (README: about 210) |
  | 8 in, sixteenths | 1.38 | 139 | — |
  | 6 in, sixteenths | 1.5 | 128 | — |

  All the stated figures (330, 164, 210) are accurate and slightly conservative, and the "about"/"floor, not a guarantee" hedging meets the ticket's Known Hazard. The per-centimetre generalisation is wrong below about 12 cm (SEC-001). `RulerGraph.tsx`'s flat "at least 330 px" stays conservative for every ruler. The figures are in CSS pixels at device-pixel ratio 1; a higher ratio gives a mark more device pixels, so the model does not overclaim on high-density screens.

## Findings

### SEC-001: The README's "about 11 px per centimetre" rule understates the minimum shown width for centimetre rulers of 11 cm or less

**Severity:** Low
**Category:** Misconfiguration
**OWASP Reference:** N/A (accuracy of compliance guidance; the code is unchanged)
**Location:** `README.md:33-35`; `src/react/Graph.tsx:17`
**Description:** The README says a ruler "keeps 3:1 contrast for its finest marks (WCAG 1.4.11) when shown at least about 11 px wide per centimetre of its length". `drawRulerMarks` (`src/layout/kit/ruler.ts`, `width = max(RULER_MIN_MARK_WIDTH, min(defaultStyle.lineWidths.tick, spacing / 2))`) narrows marks below the 1.5-unit tick width only when the millimetre spacing on the 352-unit edge is under 3 units, which happens only for rulers longer than about 11.7 cm. On any shorter centimetre ruler every mark is 1.5 units wide, so by the delivery's own coverage model it needs about 0.48 × 400 / 1.5 ≈ 128 px whatever its length. The per-centimetre rule gives 110 px for 10 cm, 55 px for 5 cm and 11 px for 1 cm, all below that floor. At those sizes the README promises 3:1 where the project's own model predicts less. For a 5 cm ruler at 60 px, coverage is about 0.23 against the 0.48 needed. `Graph.tsx`'s comment repeats the rule ("about 11 px per centimetre"), framed around the 330 px figure. The specific figures (330, 164, 210 px) are correct. Only the general rule overreaches.
**Attack Scenario:** No attacker is involved. This is a compliance-guidance inaccuracy. A school-software developer places several short (for example 5 cm) rulers in a multi-column grid on a phone, works out 11 px × 5 = 55 px from the README, shows them at about 90 px, and ships believing the marks meet WCAG 1.4.11. Under the delivery's model they do not.
**Impact:** A consumer relying on the documented rule could ship ruler marks below 3:1 contrast in an ADA Title II / Section 508 context, believing the package's guidance covered them. Likelihood is low: few layouts show a ruler under about 128 px wide, and the over-strict 330 px figure in `RulerGraph.tsx` and up front in `Graph.tsx` steers most readers to a safe width. I rated this Low rather than Critical under the CC rule because the rendering is unchanged and its small-size contrast is DEL-002's accepted decision. The defect is that the newly documented condition is too lenient for one range of rulers. Resolution may raise the severity if the Security role reads it as a CC-002 violation.
**Recommendation:** State the floor with both terms, for example in `README.md`: "at least about 11 px wide per centimetre of its length, and never narrower than about 130 px: about 330 px for a 30 cm ruler, 164 px for 15 cm, and about 130 px for any ruler of 12 cm or less." Apply the same correction to the `Graph.tsx` sentence, or drop its per-centimetre clause and keep the 330 px figure and the pointer to the README. Optionally say that an inch ruler needs about 130 px at least, and 210 px for 12 in to sixteenths. Extend the `tests/package/checks.test.ts` assertion to cover the new figure. Keep every figure identical across `README.md`, `src/react/Graph.tsx` and `src/react/graphs/RulerGraph.tsx` (the ticket's second Known Hazard).
**Compliance Impact:** prd/CC-002 (WCAG 2.1 AA 1.4.11): accuracy of the stated condition under which the drawing meets 3:1
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the README, `Graph.tsx` and `RulerGraph.tsx` now say a ruler needs at least about 130 px whatever its length (on a ruler of 11 cm or less every mark is drawn at the full tick width, about 128 px under DEL-002's model), and a centimetre ruler longer than about 12 cm about 11 px per centimetre (330 px for 30 cm, 164 px for 15 cm); the test requires "about 130 px" in all three places.

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | 130 px floor stated everywhere | No | `README.md`, `src/react/Graph.tsx`, `src/react/graphs/RulerGraph.tsx`, `tests/package/checks.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 fixed. The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
