# TICKET-005: Verify accuracy, server rendering, accessibility and performance for all axis-based graphs — Security Review

## Summary

This review covers `graph-library/number-lines-and-coordinate-graphs/TICKET-005` (branch `ticket/graph-library-nlc-005`, delivery commit `2ca3f5a`). The `security-reviewer` agent ran the findings phase in a fresh context.

The delivery adds four checks and one test fixture. It changes nothing under `src/`, adds no dependency, and ships nothing: `package.json` `files` is `["dist"]`. So the attack surface is unchanged. I confirmed this directly; I did not take it from the delivery record. The review then checked whether any of the four checks can pass vacuously or hide a real defect.

- **Server render.** It really does run with no browser globals.
- **axe run.** It cannot silently skip a rule.
- **Bench.** It cannot pass on an empty render or on the placeholder, and a missed p95 fails the run.

One gap remains. The bench's guard that it is timing a full graph is also met by a graph drawn with no ticks at all. That is recorded as one Informational finding (SEC-001).

One finding: 0 Critical, 0 High, 0 Medium, 0 Low, 1 Informational.

**Files Reviewed:**
- `tests/fixtures/nlc-generators.ts`
- `tests/layout/nlc-accuracy.property.test.ts`
- `tests/react/nlc-server-render.test.ts`
- `tests/react/nlc-accessibility.test.tsx`
- `tests/layout/nlc-render.bench.ts`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (the four `@spec Coverage` rows only)

Context read:
- the ticket, including its Known Hazards, and the delivery record;
- `.gener8v/constraints/prd.md` (CC-001 to CC-004; there is no per-area constraints file);
- the code the new files rely on:
  - `vitest.config.ts`, `tests/setup/build.ts`;
  - `tests/helpers/axe.ts`, `tests/helpers/bench.ts`;
  - `src/react/Graph.tsx`, `src/react/createGraphComponent.tsx`, `src/react/Placeholder.tsx`, `src/react/graphs/XyGraph.tsx`;
  - `.github/workflows/ci.yml` (the `pnpm test` and `pnpm bench` steps).

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Not Applicable
**Notes:**

**Tests only, nothing shipped.** I checked both diffs against `src`, and both are empty:
- `git diff --stat 2ca3f5a~1 2ca3f5a -- src`;
- `git diff --stat main...HEAD`. It lists only `.gener8v/` files and the five `tests/` files.

**No new entry point.** The new files read only committed examples at fixed URLs: `examples/<type>.json`, where `<type>` comes from a constant list in the test.

**Generated input.** Generated descriptions come from fast-check, never from outside input, and every sample passes through `validate()` (`tests/fixtures/nlc-generators.ts:53`). Generated labels are printable ASCII of up to 40 characters (`grapheme-ascii`), so they include `<`, `&` and `"`. In `tests/react/nlc-accessibility.test.tsx` the three seeded samples per type are rendered to markup and parsed back by JSDOM. Their `aria-label` must equal the text alternative exactly, so a React escaping regression would surface there. That is a side benefit, not a target.

**axe-core runs inside a JSDOM window.** It runs through the existing `tests/helpers/axe.ts`, which is unchanged. That window is a `vm` context, not a sandbox, and axe-core is trusted as a pinned devDependency. This trust model was accepted at `rulers/number-lines-and-coordinate-graphs-ticket-004-security-review/SEC-001`. This delivery does not change it.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package has no authentication or authorization. The delivery adds none.

### Data Protection

**Status:** Not Applicable
**Notes:**
- No data is collected, stored or sent (CC-003 is unaffected).
- No secrets, tokens or credentials appear in any new file.
- On failure, the test messages print the generated description (`JSON.stringify(input)`). It is synthetic and appears only in test output.

### Configuration Security

**Status:** Adequate
**Notes:**

**Configuration unchanged.** The delivery does not change `vitest.config.ts`, CI or `package.json`. Tests run in `environment: "node"`, with no `setupFiles` and with Vitest's default per-file isolation (no `isolate: false` or pool override).

**Do the checks really enforce their targets (prd/OC-001)?** Each was checked against "can it pass vacuously":

**Server render (NLC-NFR-002), `tests/react/nlc-server-render.test.ts`.**
- **No browser library loaded.** The file has no `@vitest-environment` pragma and imports neither jsdom nor `tests/helpers/axe.ts`. Its imports are `node:fs`, `react`, `react-dom/server`, `vitest` and the four `src/react` components.
- **Globals asserted, before and after.** It asserts `typeof window` and `typeof document` are `"undefined"` in a test of its own and again after every render.
- **Placeholder cannot pass.** Each render must contain `<svg`. The invalid-description placeholder is a `<div role="note">` with no `<svg>` (probe below), so a broken example cannot pass as a placeholder.
- **Equal markup.** `<Graph>` and the per-type component must produce identical markup.
- **`navigator` is defined, by design.** Node 22 defines `navigator` itself. It is not one of the browser globals the requirement names, and the source does not use it to render.

**Accessibility (NLC-NFR-003, prd/CC-002), `tests/react/nlc-accessibility.test.tsx`.** It cannot silently skip a rule:
- `violations` must be empty.
- `incomplete` must be empty.
- The sorted `passes` must equal `SVG_IMAGE_RULES` exactly (`tests/react/nlc-accessibility.test.tsx:57`), so a rule that becomes inapplicable fails the test.
- `runOnly` names the rules, and axe rejects an unknown rule id.
- A negative control shows that `svg-img-alt` reports an unnamed `<svg role="img">`.
- The case count is asserted (`3 * (1 + SAMPLES)`).
- An `afterAll` checks that no `window` or `document` leaked into the Node global.
- The text alternative must be non-blank, and `aria-label` must equal it.

**Bench (NLC-NFR-004), `tests/layout/nlc-render.bench.ts`.**
- **Placeholder and empty render cannot pass.** Before timing, the markup must contain exactly 50 `<circle ` and at least 202 `<line `. The placeholder has neither.
- **Limit and sample count unchanged.** The p95 limit is exactly 50 ms, and `minSamples` is 100.
- **A missed p95 fails the run.** I confirmed this with a scratch bench outside the repository that calls the shared `expectP95` with a 0 ms limit: `vitest bench --run` exited 1 with `AssertionError: busy: p95 0.1690 ms over 2277 runs`. A missed target therefore fails the CI `pnpm bench` step.
- **Gap.** The 202-line floor alone does not guarantee the ticks were drawn (SEC-001).

**Accuracy (NLC-NFR-001), `tests/layout/nlc-accuracy.property.test.ts`.**
- **Sample count.** For each of the three types, the number of samples checked is counted and asserted to be at least 200.
- **Shape checked before positions.** Tick, point and segment counts are asserted before positions, so an empty Scene fails rather than passing through an empty `forEach`.
- **Seeded mutations.** The delivery record lists them: a point moved 0.6 units and a 1% stretch of `linearScale` were both caught. A stretch inside `isometric()` is out of scope by design (DEL-002).

## Dependency Check

**Tool:** `pnpm audit` (pnpm 10.28.2), run 2026-10-30T14:07:40Z (10:07:40 EDT).

| Command | Exit | Output |
|---------|------|--------|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |

The delivery adds no dependency. `axe-core ^4.14.0`, `jsdom ^26.1.0` and `fast-check ^4.10.2` were already devDependencies.

## Cryptography and Logging

**Cryptography: not applicable.** fast-check's seed (`20260101`) only makes the test samples reproducible. It is not used for security.

**Logging: no sensitive data.** The only log line is the bench's p95 line from `expectP95`, which holds a requirement ID, a name and a timing.

## Compliance Cross-Reference

| Constraint | Assessment |
|------------|------------|
| CC-001 (licences) | No dependency or asset added. |
| CC-002 (WCAG 1.1.1 text alternative) | The delivery verifies it: `role="img"`, a non-blank `aria-label` equal to the text alternative, and axe's SVG image rules all passing. 1.4.11 and 1.4.1 are outside this ticket. No violation. |
| CC-003 (no data collection) | No network, storage or telemetry code. |
| CC-004 (no trademarked imagery) | Not applicable. |

## Verification Run (this review)

All commands were run on 2026-10-30. Output is saved under `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/security-review-nlc005/`.

| Command | Exit | Evidence |
|---------|------|----------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --reporter=verbose` on the three new test files | 0 | 3 files, 20 tests passed (`tests.txt`) |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest bench --run --reporter=verbose tests/layout/nlc-render.bench.ts` | 0 | `NLC-NFR-004 xy-graph 100 ticks, 50 points: p95 7.5452 ms over 497 runs` (`bench.txt`) |
| `TSX_DISABLE_CACHE=1 npx tsx -e` (bench markup probe) | 0 | Bench description: 402 `<line>` = 200 grid + 202 axes and ticks, and 50 `<circle>`. The same graph with `showGrid: false` has 202 lines. An invalid variant renders `<div role="note" …>` with no `<svg>` or `<circle>`. `window` and `document` are undefined (`probe-bench.txt`). |
| Scratch failing-bench probe (`expectP95` with `limitMs: 0`) | 1 | `AssertionError … expected 0.169… to be less than or equal to 0` (`probe-bench/out.txt`) |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found (`audit.txt`) |

## Findings

### SEC-001: The bench's full-graph guard is met by a render with no ticks

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** N/A
**Location:** `tests/layout/nlc-render.bench.ts:33`
**Description:**

**The floor.** The guard is meant to show that the timed render is the full graph. It requires at least `2 * TICKS + 2` = 202 `<line>` elements.

**What the render draws.** The bench description sets `showGrid: true`, so the render contains:
- 200 grid lines;
- 2 axes;
- 200 tick marks.

That is 402 lines in total (probe). With the grid alone plus the two axes, the count is exactly 202.

**The gap.** Suppose a regression stopped drawing ticks on a 100-tick axis, for example a thinning cap above some tick count. The guard would still pass, and so would the p95, now measured on a cheaper render.

**Why the accuracy test does not cover this case.** It catches dropped ticks only up to the 41 ticks per axis its generator produces (DEL-001). So nothing pins the 100-tick case's tick count.

This does not affect the package's security. It is a weakness in whether the check enforces its target (prd/OC-001).

**Attack Scenario:** Not required (Informational).
**Impact:** The NLC-NFR-004 measurement could silently time a smaller graph than the requirement names. No security impact.
**Recommendation:** Count what the requirement names, instead of a floor that the grid alone meets:
- count tick lines apart from grid lines (stroke `defaultStyle.colors.grid`);
- or raise the floor to `4 * TICKS + 2` while the grid is on;
- or turn the grid off and require exactly `2 * TICKS + 2`.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed with quality review QR-002 (Engineer — Thomas Eaves, 2026-10-30): the bench's guard counts exactly 100 ticks per axis and 50 points from the Scene and matches the markup to it; a render with no ticks now fails the bench (reconfirmed in the main session). Committed with the code review resolution (`e049ca1`).

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Bench guard counts what NLC-NFR-004 names | No | `tests/layout/nlc-render.bench.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 fixed during resolution (`e049ca1`); no source change.
