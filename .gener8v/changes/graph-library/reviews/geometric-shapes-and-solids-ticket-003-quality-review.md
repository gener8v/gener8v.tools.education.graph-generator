# TICKET-003: Square graph type — Quality Review

## Summary

Reviewed the square graph type (definition, layout, component, entry, registration), the new shared `unitProperty` and kit `figure-labels.ts` extracted from the circle (carried QR-004), and their tests. The code is clean, consistent with the circle's per-type pattern, and well tested; lint, typecheck and the full test suite pass. Three Suggestions, no Critical or Concern findings.

**Files Reviewed:**
- `src/core/definitions/figure.ts`
- `src/core/definitions/square.ts`
- `src/core/definitions/circle.ts`
- `src/layout/kit/figure-labels.ts`
- `src/layout/square.ts`
- `src/layout/circle.ts`
- `src/react/graphs/SquareGraph.tsx`
- `src/entries/square.ts`
- `tests/core/square.test.ts`
- `tests/layout/square.test.ts`
- `tests/layout/kit/figure-labels.test.ts`
- `tests/package/per-type-bundle.test.ts`, `tests/react/Graph.test.tsx`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts` (extended)

**Findings:** 3
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The square mirrors the circle's definition / layout / component / entry split. The circle's figure-agnostic label code now lives in `src/layout/kit/figure-labels.ts` behind one `placeLabels` call, which removes about 80 lines from `src/layout/circle.ts` and gives the cube and cylinder a shared base. The `unit` term has one definition (`unitProperty`) that pulls in no other figure's code. `squareLabels` is the one rule shared by `describe` and the layout. Dependency direction is correct: layout imports definitions and the kit; the kit imports no figure.

### Readability

**Rating:** Strong
**Notes:** Names state intent (`besideHorizontal`, `placeLabels`, `RIGHT_ANGLE_MARK`, `DRAWN_SIDE`). `squareLayout` is about 100 lines in a linear sequence (outline, obstacles, marks, labels), with comments on the non-obvious choices (bounds instead of a title obstacle, equal-length candidates). Doc comments carry the reasoning and requirement IDs. Right-angle mark coordinates are written out per corner, which is clear if repetitive.

### Error Handling

**Rating:** Strong
**Notes:** Invalid side lengths are rejected by the shared definition kit (`min`/`max`, `out_of_range`) before layout. Blank and over-long caller text is handled (blank label draws nothing, four-line cap with an ellipsis, stacking below the figure when no clear place exists). The layout has no failure path of its own; `placeLabel` returning `undefined` is handled by stacking. No swallowed errors.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run in this review: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 60 files and 1,706 tests passed; `tests/layout/kit/text.test.ts` rerun twice, 32 passed each time (the known timing flake did not occur). Tests cover equal sides at any scale (property), both label modes, value/unit/custom/blank text, the 0.001 square with four labels, an overlap property over full-length caller strings, right-angle marks and obstacle behaviour, `fmt()` use, determinism, at-limit and over-limit caller text, per-type bundle exclusions, and the kit code directly. The circle's Scene is verified byte-identical to `main` by the delivery's probe. Assertions are on behaviour (geometry, text) rather than on internals.

### Observability & Operability

**Rating:** Adequate
**Notes:** This is a pure, synchronous rendering library with no logging, metrics or I/O, matching the rest of the codebase. Failures surface as typed validation results with a field and cause, not as logs. Nothing to add.

## Findings

### QR-001: Circle re-exports `LABEL_MAX_LINES` only to keep its own tests unchanged

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/circle.ts:17` (`export { LABEL_MAX_LINES }`), `tests/layout/circle.test.ts:14`
**Description:** After the constant moved to `src/layout/kit/figure-labels.ts`, the circle layout keeps a re-export so `tests/layout/circle.test.ts` can still import it from the circle. The square test imports it from the kit. Two places now export the same constant, and the circle module's public surface exists for a test.
**Impact:** Minor. A future reader may wonder which is canonical, and a later change to the cap could miss the shim. Number-line and xy-graph already follow a similar re-export pattern, so it is not out of line with the codebase.
**Recommendation:** Point `tests/layout/circle.test.ts` at the kit's `LABEL_MAX_LINES` and drop the re-export from `src/layout/circle.ts`, or leave it deliberately and say why in the comment.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `src/layout/circle.ts` no longer re-exports `LABEL_MAX_LINES`; `tests/layout/circle.test.ts` imports it from `src/layout/kit/figure-labels.ts`, its only change. (The number line and the x,y graph still re-export their element-label cap under their own name; that is a type-specific name, not a kit constant passed through.)

---

### QR-002: `labelSize` repeats the `{ lines, width, height }` shape instead of a named type

**Category:** Naming
**Severity:** Suggestion
**Location:** `src/layout/kit/figure-labels.ts:30` (`labelSize`), `:75` (`unplaced` array type)
**Description:** `LabelSize` is exported as `{ width, height }`, but `labelSize` returns an inline `{ lines: string[]; width: number; height: number }`, and `placeLabels` rebuilds that type with `ReturnType<typeof labelSize>`. The function and the type share a name that differs only in case, and the richer shape has no name.
**Impact:** Small readability cost in a kit that the cube and cylinder will reuse.
**Recommendation:** Export `interface LabelBlock extends LabelSize { readonly lines: readonly string[] }` (or similar), return it from `labelSize`, and use it for `unplaced`. Consider renaming the function to `labelBlock` to remove the case-only clash.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `LabelBlock extends LabelSize { lines }` is exported, `labelSize` is renamed `labelBlock` and returns it, and `placeLabels` keeps its unplaced labels as `LabelBlock[]`. Kit tests and the specification's `@spec Coverage` row follow the rename.

---

### QR-003: Scene-size bound in the at-limit test uses an unexplained `+ 5`

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/square.test.ts:228`
**Description:** `expect(scene.nodes.length).toBeLessThanOrEqual(3 + 4 * LABEL_MAX_LINES + 5)` uses the literals `3` and `5` without saying what they count (title lines, outline, marks, sides). The bound is loose enough that a few stray nodes would pass.
**Impact:** If the node count changes, the test may pass when it should fail, or fail with no hint about what to adjust.
**Recommendation:** Name the pieces (for example `TITLE_LINES`, `OUTLINE + 4 MARKS`) or compute the expected count from a no-text render of the same square plus the label lines.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The bound now reads `TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES + OUTLINE + MARKS`, with `TITLE_MAX_LINES` from `src/layout/kit/title.ts` and a comment naming the pieces.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Dropped the circle's `LABEL_MAX_LINES` re-export; circle test imports it from the kit | `src/layout/circle.ts`, `tests/layout/circle.test.ts` |
| QR-002 | Fix | Added `LabelBlock`; renamed `labelSize` → `labelBlock` | `src/layout/kit/figure-labels.ts`, `tests/layout/kit/figure-labels.test.ts`, `.gener8v/specifications/geometric-shapes-and-solids.md` |
| QR-003 | Fix | Named the parts of the Scene-size bound | `tests/layout/square.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** QR-001..003 fixed during resolution; recorded in the delivery record's Post-Review Amendments. Re-verified with the full verification loop.
