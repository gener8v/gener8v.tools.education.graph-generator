# TICKET-001: Check the published package after every release — Quality Review

## Summary

Reviewed the post-publish install check: `tests/smoke/published.mjs`, the `install-check` job in `.github/workflows/release.yml`, the extended `tests/package/release-config.test.ts`, the `test:published` script and `docs/versioning.md`. The code is small, clear and consistent with the neighbouring smoke scripts, with sound argument validation and no shell use. The main gap is that the entry-point check compares the installed exports map with itself, so a missing entry point would pass. There are 4 findings: 0 Critical, 1 Concern, 3 Suggestions.

**Files Reviewed:**
- tests/smoke/published.mjs
- .github/workflows/release.yml
- tests/package/release-config.test.ts
- package.json
- docs/versioning.md
- tests/smoke/render.mjs (neighbour)

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** One step per function, a `StepFailure` type that carries the step name, and `main` that reads as the check list. It reuses `render.mjs` and the react19 template instead of duplicating them. The job is separate, has read-only permissions and needs `verify-provenance`.

### Readability

**Rating:** Strong
**Notes:** Constants are named and commented (retry interval, deadline, timeout). The header says what is checked and the exit codes. The `for (;;)` retry loop is easy to follow.

### Error Handling

**Rating:** Adequate
**Notes:** Every step turns failures into `StepFailure` naming the version and the step, and stderr and stdout are kept. Temporary directory cleanup is in `finally`. However, the retry loop retries every install failure, not only "not yet installable" (QR-002), and the entry-point step cannot detect a missing entry point (QR-001).

### Test Coverage

**Rating:** Adequate
**Notes:** Commands run: `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm vitest run tests/package/release-config.test.ts` exit 0 (23 passed); `node tests/smoke/published.mjs latest` exit 2 with the usage. The full `pnpm test` was not run. The 10-minute negative registry run was not run, as instructed. The script's network steps (retry cap, signature regex, export, entry points) are covered only by string-contains assertions on the source (QR-003) and the bad-argument cases. There is no test of the retry or failure naming.

### Observability & Operability

**Rating:** Strong
**Notes:** The failure message names package, version and step, with the underlying npm output. Each retry logs a warning with the cause and interval. The `npm audit signatures` output is printed. The job has a 20-minute timeout above the 10-minute retry cap.

## Findings

### QR-001: Entry-point check compares the installed exports map with itself

**Category:** Testing
**Severity:** Concern
**Location:** `tests/smoke/published.mjs:importEntryPoints` (`entries = Object.keys(manifest.exports)`), with `tests/smoke/render.mjs` (the `expected` vs `installed` comparison)
**Description:** `render.mjs` takes the expected keys as an argument and fails on a missing or extra entry in the installed exports map (code review CR-004 in its header). `published.mjs` builds that argument from the installed package's own `exports`, so the missing-or-extra comparison can never fail. If a release publishes without an entry point (for example a build that drops a subpath), the check imports whatever remains and passes. CPSE-REQ-050 says every public entry point is imported.
**Impact:** The check proves the entry points that exist import, not that all the public ones are there. That is the failure mode a post-publish check exists to catch.
**Recommendation:** Take the expected list from the checked-out tag, which is the release's own source: read `package.json` `exports` in the repository (`join(repository, "package.json")`) and pass that to `render.mjs`, so a difference from the installed map fails. Add a test for the derivation.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). `importEntryPoints(work, version)` takes the expected keys from the checked-out repository's `package.json` (the tag, in CI) and passes them to `render.mjs`, which fails on a missing or extra entry; it fails first if that `package.json` is not the version being checked. Test asserts the derivation. Mutation: adding `./not-published` to the repository's exports made `pnpm test:published 0.1.0` fail with "the installed exports map has no \"./not-published\" entry".

---

### QR-002: The install retries on any failure, not only on "version not yet available"

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `tests/smoke/published.mjs:installFromRegistry`
**Description:** Every `npm install` failure (a typo in the package name, a network error, an integrity error, a peer-dependency conflict) is retried for 10 minutes. The final message reports the last npm error, so the cause is not lost, but a permanent failure delays the run by 10 minutes.
**Impact:** Slow feedback on permanent failures. CPSE-REQ-052 only requires retry while the version is not installable, so this is acceptable, which is why it is a suggestion.
**Recommendation:** Retry only when npm reports `E404` or `ETARGET` (check `error.message` for them), and fail at once otherwise. Keep the 10-minute cap.
**Status:** Resolved
**Resolution:** Resolved by code review CR-002 (Engineer — Thomas Eaves, 2026-11-05): retries only on `E404`, `ETARGET` or `notarget`.

---

### QR-003: The workflow test asserts the script by substring, and one assertion is vacuous

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/package/release-config.test.ts` (the test "checks the published package in its own job ...")
**Description:** `expect(script).toContain("npm")` is true of any script that mentions npm. The other checks (`--ignore-scripts`, `INSTALL_DEADLINE_MS = 600_000`) tie the test to source text, so a reformat such as `600000` fails it while a behavioural regression passes. This matches the file's existing style for workflow checks, so it is not a new pattern.
**Impact:** Brittle on formatting, weak on behaviour. The retry cap and the failure message are not exercised at all.
**Recommendation:** Remove the `toContain("npm")` line. If the script is split so `installFromRegistry` and the argument handling can be imported, cover the retry cap with a fake `npm` first on `PATH` that always fails and a short deadline set through an environment variable.
**Status:** Resolved
**Resolution:** Resolved by code review CR-003 (Engineer — Thomas Eaves, 2026-11-05): exact code-line assertions replace the substring checks, and the vacuous `toContain("npm")` is gone. The fake-npm behavioural test was not added; the real-registry runs cover the behaviour.

---

### QR-004: Docs line is longer than its neighbours

**Category:** Readability
**Severity:** Suggestion
**Location:** `docs/versioning.md` step 7
**Description:** The line "entry point. If npm does not serve the new version yet, it keeps trying for 10 minutes. If any check fails," exceeds the wrap width the surrounding paragraph uses.
**Impact:** Cosmetic; a noisy diff on the next edit.
**Recommendation:** Re-wrap the paragraph to the file's width.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). Step 7 re-wrapped to the file's width; it also says to check out the version's tag before a local run (follows from QR-001).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approve | Expected entry points from the checked-out package.json; version guard | `tests/smoke/published.mjs`, `tests/package/release-config.test.ts`, `docs/versioning.md` |
| QR-002 | Resolved by CR-002 | — | — |
| QR-003 | Resolved by CR-003 | — | — |
| QR-004 | Approve | Re-wrapped step 7 | `docs/versioning.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 4 resolved)
**Notes:** Resolved in the main session with the Engineer, 2026-11-05. Re-verification: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed), `pnpm test:published 0.1.0` 0.
