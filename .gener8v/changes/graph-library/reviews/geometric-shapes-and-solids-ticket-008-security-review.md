# TICKET-008: Proportion, label-overlap and text-alternative checks across figures — Security Review

## Summary

This review covers `graph-library/geometric-shapes-and-solids/TICKET-008`: delivery commit `84e0d35` on branch `ticket/graph-library-gss-008`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews.

**The delivery adds tests only.** `git diff --stat 7a590d0 84e0d35 -- src package.json pnpm-lock.yaml` is empty. The commit touches three new test files, one extended test fixture, the specification's `@spec Coverage` rows, the delivery record and `pipeline-state.yaml`. `package.json` publishes only `dist` (`"files": ["dist"]`), so none of the new code ships. Nothing new is reachable by a consumer, the attack surface is unchanged, and no new dependency was added: `jsdom` and `fast-check` were already devDependencies.

**The question that matters for a test-only delivery** is whether the new helpers in `tests/fixtures/scene-geometry.ts` could let a real defect pass without notice. That would mean a proportion, viewBox or overlap test passing vacuously, which would weaken the verification behind GSS-NFR-001/003/004 and, through NFR-004, CC-002. I probed this directly:
- **Every node kind is handled today.** I enumerated the Scenes of every example and of each figure with every label shown. They contain only `text`, `line`, `polygon`, `polyline`, `circle`, `ellipse` and `path` nodes. All of these are handled by `drawnPoints`, `figureLines` and `labelBoxOf`. No text carries a `transform`, and every text is `text-anchor="middle"` (`labelBoxOf` throws otherwise, so it fails closed). Every `path` `d` has the single shape `M # # A # # 0 0 1 # #` that `arcOfPath` parses.
- **No attribute is missing or non-numeric today.** I scanned 1,528 Scenes: the examples, the 42 caller-text-limit stress cases, and 300 generated sizes × 5 figures with every label on. Every required attribute was present and finite, so no current test is passing on `NaN`.
- **The proportions suite fails closed.** `ratioMiss` tests `!(… <= TOLERANCE)`, so a `NaN` length fails. Each figure's helper also asserts the expected node count (2 lines, 4 sides, 12/9 edges, 2 verticals plus slants) before it compares anything.
- **The generators are not vacuous.** Of the sampled descriptions, 1,949/2,000 generated circles, 1,000/1,000 squares, 1,000/1,000 cubes and 1,961/1,991 range-passing cylinders are valid. The triangle property uses `fc.pre`, which fast-check fails if too many runs are skipped, and the `vertices` set is always checked.
- **The overlap finder is not vacuous on well-formed input.** Its negative tests and the delivery's no-obstacle mutant show it reports real overlaps.
- **The overlap and viewBox helpers fail open on input they cannot read.** `num()` turns a missing or non-numeric attribute into `NaN`, and every comparison against `NaN` is false. As a result:
  - a text box or line built from `NaN` never overlaps anything in `placeLabel`;
  - a `NaN` point is never outside the viewBox;
  - `drawnPoints` and `figureLines` return nothing for an unhandled node kind (for example `rect` or `g`).

  I confirmed each case with a probe. It masks nothing today, but it would mask a future layout regression (SEC-001, Low).

**Text alternatives.** `tests/react/gss-text-alternatives.test.tsx` renders through `<Graph>` with `renderToStaticMarkup` and parses the markup with JSDOM in the test process only. The test reads fixed `examples/*.json` paths. There is no caller-controlled path, network access, `eval` or new sink.

There is one finding, with no exploitable path: SEC-001 (Low).

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-008-delivery.md`. I read the Pre-Flight Reconciliation, Implementation Plan, Verification Run, DEL-001..DEL-003, Deviations (none) and Post-Review Amendments (none).

**Files Reviewed:**
- `tests/fixtures/scene-geometry.ts` (extended: `lengthOfLine`, `segmentOfLine`, `lineLengths`, `polyPoints`, `polygonSides`, `arcOfPath`, `drawnPoints`, `labelBoxOf`, `labelBoxes`, `figureLines`, `labelOverlaps`, `outsideViewBox`)
- `tests/layout/gss-proportions.test.ts` (new)
- `tests/layout/gss-label-overlap.test.ts` (new)
- `tests/react/gss-text-alternatives.test.tsx` (new)
- `.gener8v/specifications/geometric-shapes-and-solids.md` (`@spec Coverage` rows only)
- **Read unchanged, because the helpers rely on them:** `src/layout/kit/labels.ts` (`placeLabel`, `boxesOverlap`, `segmentCrossesBox`), `package.json` (`files`, dependencies) and `tests/setup/build.ts`.

**Context read:**
- The ticket `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-008.md`: Constraints prd/TC-001, prd/TC-011 and prd/RF-001, and the Known Hazards (estimated boxes only, no DOM measurement; do not loosen 1%; cylinder radius along its projected axis; extend the existing fixture; overlap at `CALLER_TEXT_LIMIT`).
- `.gener8v/constraints/prd.md` (CC-001..CC-004). There is no area-level constraints file.
- `.gener8v/CONVENTIONS.md`.
- The prior GSS security reviews in this change (TICKET-007 for house context). Settled risks are not raised again.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Not Applicable
**Notes:** No entry point, validator or layout changed (`src/` untouched). The tests feed descriptions through the existing `createGraph` gate, and the only file reads are fixed `examples/<name>.json` paths from a constant list. There is no SQL, shell, template, dynamic code or caller-controlled path. The one concern is the robustness of the test helpers' own parsing (SEC-001).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a rendering library with no accounts, sessions or protected resources, and this delivery adds none.

### Data Protection

**Status:** Adequate
**Notes:** There is no PII, credential or logging. Test fixtures use synthetic measurements and the shared plain-text fillers. CC-003 (no data collection or transmission) is unaffected because no shipped code changed and the tests make no network calls.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets.** There are no secrets, keys or tokens in the delivered files.
- **Dependencies.**
  - `pnpm audit` (pnpm 10.28.2, run 2026-10-30T01:57:10Z, i.e. 2026-10-29 21:57 EDT): "No known vulnerabilities found", exit 0.
  - `pnpm audit --prod`, run at the same time: "No known vulnerabilities found", exit 0.
  - No dependency was added or changed (`pnpm-lock.yaml` untouched).
- **Tests run.** `npx vitest run --no-cache` on the three new files passed 155 tests in 3 files (exit 0; output in the agent's scratchpad). The project's `globalSetup` (`tests/setup/build.ts`) ran `pnpm build` as part of that run, because I did not set `GRAPH_GENERATOR_PREBUILT=1`. That rebuilt the git-ignored `dist/` in place. No tracked file changed.
- **Compliance.** CC-002 (WCAG 1.1.1 text alternative) is what `tests/react/gss-text-alternatives.test.tsx` verifies, and the delivery cannot violate it because it changes no source. CC-001, CC-003 and CC-004 are unaffected.

## Findings

### SEC-001: Overlap and viewBox helpers fail open on unparseable attributes and unhandled node kinds

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions (fail-open handling of malformed input, in the verification tooling)
**Location:**
- `tests/fixtures/scene-geometry.ts:21` (`num`)
- `tests/fixtures/scene-geometry.ts:171-195` (`drawnPoints`, `default: return []`)
- `tests/fixtures/scene-geometry.ts:198-205` (`labelBoxOf`)
- `tests/fixtures/scene-geometry.ts:221-254` (`figureLines`, `default:`)
- `tests/fixtures/scene-geometry.ts:260-270` (`labelOverlaps`)
- `tests/fixtures/scene-geometry.ts:273-284` (`outsideViewBox`)

**Description:** `num(node, name)` returns `Number(attr(node, name))`. A missing attribute (`undefined`) or a non-numeric one (e.g. `"9000px"`) therefore becomes `NaN`, and the helpers never check for it:
- `labelBoxOf` builds a `NaN` box. `placeLabel`'s `boxesOverlap` and `segmentCrossesBox` (`src/layout/kit/labels.ts:28-65`) compare with `<` and `>`, so a `NaN` box or segment never overlaps anything.
- `outsideViewBox` tests `x < 0 || x > width`, which is false for `NaN`.
- `drawnPoints` and `figureLines` return no points or segments for any node kind they do not list (`rect`, `g`, `svg`, …). Such a node is neither checked against the viewBox nor treated as an obstacle.

Probes against the delivered helper (scratch, not committed):
- A text node crossed by a line and carrying no `font-size`: `labelOverlaps` → `[]`. With `font-size` it is `["3 cm"]`.
- The same text with no `y`: `[]`.
- A crossing line with no `x2`: `[]`.
- A text at `x = -500` with no `font-size`: `outsideViewBox` → `[]`.
- A `rect` at `x = 9000`: `outsideViewBox` → `[]`.
- A line at `x1 = "9000px"`: `outsideViewBox` → `[]`.

**Today's Scenes do not trigger it.** I scanned 1,528 GSS Scenes and found every required attribute present and finite and only handled node kinds, so the current suites are not passing vacuously. The proportions suite is not affected: `ratioMiss` fails on `NaN`, and each figure asserts its node counts.
**Attack Scenario:** Not required for Low. There is no attacker path: the helpers are test-only and never published. The risk is to verification integrity. Suppose a future layout change drops or misformats a coordinate or `font-size` on a text or line, or draws part of a figure as a new node kind (say a `rect` right-angle mark or a `g` group). The GSS-NFR-003 overlap suite and the GSS-REQ-031 viewBox checks would keep passing while the figure overlaps or overflows. That would weaken the regression guard behind these requirements, and the `@spec Coverage` rows would claim protection that is not there.
**Impact:** A future layout defect (label collision or a figure outside its viewBox) could reach a release with green tests.
**Recommendation:** Make the helpers fail closed:
- In `num`, throw when the attribute is missing or `!Number.isFinite(value)`, naming the node and attribute.
- In `pointsOf`, throw on any non-finite coordinate or a pair that is not exactly two numbers.
- In `drawnPoints` and `figureLines`, replace the silent `default` with `throw new Error(\`no geometry for a ${node.kind}\`)`. Text is already handled separately, and an explicit skip list can be added if one is ever needed.
- Add one negative test per guard, e.g. `expect(() => labelOverlaps(scene(line, textWithoutFontSize))).toThrow()`.

**Compliance Impact:** None directly. Indirectly it affects the strength of the evidence for CC-002, but only through NFR-003/REQ-031 and not the text-alternative test, which fails closed.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `tests/fixtures/scene-geometry.ts` reads the cross-figure checks' coordinates with a strict `finite()` (and `allFinite` for points and arc data), which throws on a missing or non-finite value; `drawnPoints` throws on a node kind it cannot read, and `figureLines` skips text (labels) and throws on any other unread kind. The lenient `num` stays for the older per-type tests. Tests in `tests/layout/gss-label-overlap.test.ts` show a `NaN` line coordinate, a label with no `x` and a `rect` node each make the checks throw. Mutation-checked: dropping the finite check fails 2 tests; restoring either silent default fails 1.

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Strict readers; unread node kinds throw | No | `tests/fixtures/scene-geometry.ts`, `tests/layout/gss-label-overlap.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 fixed during resolution and recorded in the delivery record's Post-Review Amendments. The reviewer's vitest run rebuilt `dist/` because `tests/setup/build.ts` builds unless `GRAPH_GENERATOR_PREBUILT=1` is set — the cause of the `dist/` races seen with parallel reviewers.
