# TICKET-002: Issue codes and validation result types — Quality Review

## Summary

Reviewed the four files delivered for graph-library/graph-specification-and-vocabulary/TICKET-002 (branch `ticket/gsv-002`, delivery commit `8e08f2a`). The `quality-reviewer` agent ran the findings phase in a fresh context. The code is small, clearly organised and strictly typed, and every verify and CI command passes when re-run. The weak points are in the API that about a dozen later tickets will call:
- `IssueParams` does not require the inputs each code needs, so messages fall back to filler text.
- The same input can mean different things for different codes, so structured fields can mislead.
- The per-code tests would not notice either problem.
- `createIssue` lets non-finite range bounds through.
- The public `./core` entry point exports internal helpers.

There are no performance concerns: every function is constant-time or linear in very small inputs, and `./core` is 2.61 kB gzipped against a 25 kB budget. 8 findings in total: 0 Critical, 5 Concerns, 3 Suggestions. The verdict below is provisional until resolution with the user.

**Files Reviewed:**
- `src/core/result.ts`
- `src/core/issues.ts`
- `src/core/index.ts`
- `tests/core/issues.test.ts`

Neighbours read for patterns and context: `src/index.ts`, `src/tool/index.ts`, `src/export/index.ts`, `tests/package/boundaries.test.ts`, `tests/package/entries.test.ts`, `tests/setup/build.ts`, `eslint.config.js`, `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`, `CONTRIBUTING.md`.

**Findings:** 8
**Critical:** 0 | **Concerns:** 5 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** Two small modules with a clear split:
- `src/core/result.ts` holds the result and issue types and the two result constructors.
- `src/core/issues.ts` holds the code registry, the documentation, the message templates, the JSON Pointer helpers and the issue constructor.

There are no runtime imports between the two files. Each imports types from the other (`import type`, which `verbatimModuleSyntax` erases at build time). That is harmless at runtime, but the design's "Issue codes — Dependencies: none" now holds only at runtime.

`src/core/issues.ts` has six responsibilities in 218 lines, which is fine today. Its template `switch` will grow with every code a rendering area adds (RES-008), and the keyed record suggested in QR-001 would let that growth happen without one function getting longer.

`pnpm lint` confirms there are no React or browser imports in `src/core`. The weak point is the public barrel, which exports internal helpers (QR-005).

Tests for `src/core/result.ts` live in `tests/core/issues.test.ts`, as the ticket's Output prescribes. A `tests/core/result.test.ts` would mirror the sources more closely, but this is not raised as a finding.

### Readability

**Rating:** Adequate
**Notes:** Names are descriptive (`describeRange`, `escapePointerToken`, `createIssue`). Most exports have a doc comment that says why, not only what. The templates read top to bottom, one sentence per code.

Small nits, not raised as findings:
- the one-letter parameter `p` in `issueMessage`
- the helper name `aGraph`
- `validResult` has no doc comment, while `invalidResult` has one
- the `detail` suffix ternary is repeated five times (`src/core/issues.ts:153-181`)

The structural readability problem is that an input's meaning depends on which code receives it (QR-002). A reader of a `createIssue` call cannot tell what `expected` or `range` will mean in the resulting issue. Wording points are in QR-008.

### Error Handling

**Rating:** Adequate
**Notes:** What works:
- `invalidResult` rejects an empty list at runtime with a clear programmer-error message.
- The `Issues` tuple type stops an empty list at compile time.
- Adding a code without a `case` or a documentation entry fails the build. I copied `src/core/issues.ts` and `src/core/result.ts` to the scratchpad and added one code: `tsc` reported TS2366 ("Function lacks ending return statement") for `issueMessage` and TS2741 (missing property) for `issueDocs`.

The gaps:
- Missing inputs fall back to filler text instead of being rejected (QR-001).
- Non-finite range bounds break the plain-JSON guarantee (QR-004).
- Runtime values outside the type contract produce an `undefined` message or misleading text (QR-007).

### Test Coverage

**Rating:** Adequate
**Notes:** I ran the context.md verify commands (`## Repositories`, row `.`) and the extra CI checks from the delivery record's Verification Run. Environment: Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-002` at `8e08f2a`.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 5 files, 153 tests passed (43 in `tests/core/issues.test.ts`); global setup ran `tsup` |
| `pnpm build` | 0 | built |
| `pnpm check:dist` | 0 | "Built files scanned: 4, no network APIs or network modules." |
| `pnpm size` | 0 | `./core` 2.61 kB minified and gzipped (budget 25 kB) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | all green in the ESM profile |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:changesets` | 0 | "Changesets checked: 0." |

After the runs, `git status` showed no change to any tracked file except the hook-managed `.gener8v/runs.jsonl`, which was already modified before the runs. No coverage provider is installed, so coverage was assessed by reading the tests against the code.

Every acceptance criterion has a test, and the tests assert behaviour, not implementation details:
- documentation completeness in both directions
- JSON round-trips for every code
- the shapes of valid and invalid results
- that the issue does not share arrays with the caller's inputs
- the order of pointer escaping

Test names describe behaviour.

Weaknesses:
- The per-code message tests cannot detect a message that gives no fix (QR-003).
- The code-list snapshot cannot tell an addition from a breaking change (QR-006).
- No test uses non-finite numbers (QR-004).

The message and issue outputs quoted in the findings come from a scratchpad probe script that imported `src/core/issues.ts` read-only.

### Observability & Operability

**Rating:** Adequate
**Notes:** This is pure library code, and the package forbids telemetry (CPSE-REQ-005), so having no logging or metrics is correct. Operability here means the issues themselves: they are the surface that a curriculum author, a model or an integrating developer acts on. That surface is good:
- Every issue carries a stable code, a JSON Pointer and a message stating the fix.
- `internal_error` is documented as a package defect, and its message says "please report it", so it is not mistaken for a problem with the description.
- `invalidResult` fails loudly on misuse.

How actionable an issue is depends on two things this delivery does not secure: callers supplying the right inputs, which nothing enforces (QR-001), and structured fields that mean what their documentation says (QR-002).

## Findings

### QR-001: `IssueParams` does not say which inputs each code needs, so a caller who leaves one out gets a placeholder message

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/issues.ts:70-88` (`IssueParams`), `src/core/issues.ts:112` (`list` returns `"none"`), `src/core/issues.ts:122` (`"a valid value"`), `src/core/issues.ts:120-183` (`issueMessage`), `src/core/issues.ts:203` (`createIssue`)
**Description:** `IssueParams` is one flat interface for all 24 codes, and only `term` is required. Each template quietly substitutes filler text when an input it needs is missing. The compiler accepts every call below; the outputs are verbatim from the probe:

| Call | Message |
|------|---------|
| `out_of_range` without `range` | "radius must be a valid value; got -2." |
| `unknown_graph_type` without `allowed` | "type must be one of: none; got \"pie\"." |
| `contradiction` without `conflicts` | "diameter (12) disagrees with none; change one of them so they agree, or remove all but one." |
| `wrong_kind` without `expected` | "radius must be a different kind of value; got \"5\"." |
| `series_length_mismatch` without `expected` | "series[1].values has 4 values but there are a different number of categories; …" |

The envelope templates also build fixed wording around `term`. `not_an_object` reads "A graph ${term} must be…", so `term: "graph"` gives "A graph graph must be a JSON object…". No test catches any of these (QR-003).
**Impact:** About a dozen later tickets will call `createIssue`: validator stages 2–4, the domain checks of the three rendering areas, the tool handler and the exporter. The delivery record's Notes tell them to. The only way for them to learn which inputs a code needs is to read the `switch`. A forgotten input ships a message that gives no fix, which defeats GSV-REQ-031 and the ticket's stated Value.

The failure is silent at compile time, in tests and at runtime. The TypeScript exhaustiveness check that the delivery Notes rely on catches a missing `case`, not a missing input. I confirmed this on the scratchpad copy: an added code triggers TS2366 and TS2741, while a missing input triggers nothing.
**Recommendation:** Key the inputs by code, so the compiler requires exactly what each template uses:

```ts
interface IssueParamsByCode {
  out_of_range: { term: string; got: unknown; range: Range };
  unknown_graph_type: { term: string; got?: unknown; allowed: readonly [string, ...string[]] };
  contradiction: { term: string; got: unknown; conflicts: readonly [string, ...string[]]; agreeingValue?: number };
  not_an_object: { got: unknown };
  // …one entry per code
}
const templates: { [C in IssueCode]: (p: IssueParamsByCode[C]) => string } = { /* … */ };
export function createIssue<C extends IssueCode>(code: C, path: string, params: IssueParamsByCode[C]): Issue;
```

A keyed record of template functions stays exhaustive, because a missing key is a compile error. It also types each template's inputs precisely, which a `switch` over a generic code cannot do. Type the test's `SAMPLES` as `{ [C in IssueCode]: IssueParamsByCode[C] }`, so every new RES-008 code must declare its inputs. Then delete the filler strings ("none", "a valid value", "a different kind of value", "a different number of") instead of keeping them as defaults.
**Status:** Resolved
**Resolution:** Approved. `IssueParamsByCode` gives each code exactly the inputs its message uses, and a `templates` record keyed by code stays exhaustive. `SAMPLES` is typed by code. All filler text is gone.

---

### QR-002: The meaning of `expected`, `range` and `got` changes from code to code, and `createIssue` copies them into the public `Issue` fields

**Category:** Naming
**Severity:** Concern
**Location:** `src/core/issues.ts:159` (`too_many_ticks` reads `range.max`), `src/core/issues.ts:173` (`series_length_mismatch` reads `expected`), `src/core/issues.ts:205-213` (copied into the issue), `src/core/result.ts:22-24` (field documentation), `tests/core/issues.test.ts:81`, `tests/core/issues.test.ts:88` (samples that use them this way)
**Description:** Two templates borrow general-purpose inputs for a different meaning. `createIssue` then copies those inputs unchanged into the structured fields, where the meaning given in `Issue`'s doc comments no longer holds. Probe outputs:
- **`series_length_mismatch`** takes the category count in `expected` (`"5"`) and the value count in `got` (`4`). The issue carries `"expected": "5"`, but `Issue.expected` is documented as "The kind of value the property accepts, e.g. "a number"".
- **`too_many_ticks`** takes the maximum tick count in `range.max`. The issue is `{"path":"/xAxis/tickSpacing","range":{"max":100}, …}`. A program reading the structured fields concludes that the tick spacing must be at most 100. The real fix is a *larger* spacing, which only the message says.
**Impact:** The structured fields (GSV-REQ-032) exist so that programs and models can act on an issue without parsing its message. For these two codes the fields point the wrong way, and only the message is right. Each new code is another chance for its template author to borrow an existing input, so the meaning of `Issue.expected` and `Issue.range` will drift further.
**Recommendation:**
- Give message-only values their own names (`valueCount`/`categoryCount`, `maxTicks`/`tickCount`). QR-001's keyed inputs do this naturally.
- Have `createIssue` copy into `expected` and `range` only values that mean what `Issue` documents: the accepted kind of value, and the allowed range of the value at `path`.
- Pin the full issue for both codes with `toEqual` in the tests.
**Status:** Resolved
**Resolution:** Approved. Message-only values have their own names (`conflictTerms`, `tickCount`, `maxTicks`, `fittingSpacing`, `valueCount`, `categoryCount`). `createIssue` copies only fields that mean what `Issue` documents, and both full issues are pinned with `toEqual`.

---

### QR-003: The per-code message tests check the property name but not the fix, so placeholder messages pass

**Category:** Testing
**Severity:** Concern
**Location:** `tests/core/issues.test.ts:95-106`
**Description:** The 24 tests named "names the property and says how to fix it" assert three things:
- the message contains `term`
- the message matches `FIX_WORDS`
- the message contains neither "undefined" nor "[object Object]"

`FIX_WORDS` includes `must` and `use`, so any message shaped "<term> must …" passes the second check. Every placeholder message in QR-001 passes all three checks, for example "radius must be a valid value; got -2." and "type must be one of: none; got \"pie\".".

Only four templates are pinned to exact text: `out_of_range`, `contradiction` with an agreeing value, `unknown_property` without a suggestion, and `missing_property` (through `createIssue`).

These branches are never exercised (found by reading the code against the samples, as no coverage provider is installed):
- `unknown_graph_type` when no type was supplied (`src/core/issues.ts:127-128`)
- `contradiction` without `agreeingValue` (`src/core/issues.ts:148`)
- the forms without `detail` of `insufficient`, `ambiguous`, `not_a_triangle`, `invalid_json` and `internal_error`
- `aGraph` without a graph type
- the `exclusiveMax` branch of `describeRange`
- the null, non-array object, non-finite number and long-string branches of `describeValue`
**Impact:** The messages are the product surface this ticket exists to deliver (GSV-REQ-031). A template that loses its allowed list or its fix clause keeps the suite green. That could happen in a simple reword, or in the refactor that QR-001 and QR-002 call for. Later tickets that add codes will copy this test pattern.
**Recommendation:**
- Pin every sample's full message in one inline snapshot, for example `expect(Object.fromEntries(ISSUE_CODES.map((c) => [c, issueMessage(c, SAMPLES[c])]))).toMatchInlineSnapshot()`. Every wording change is then reviewed in the diff, and the snapshot doubles as a catalogue of all messages.
- Add samples for the unexercised branches listed above.
- Until QR-001 lands, also assert that no message contains the filler strings ("none", "a valid value", "a different kind of value", "a different number of").
**Status:** Resolved
**Resolution:** Approved. One inline snapshot holds every code's message, and a second covers the other branches (no type supplied, no agreeing value, no suggestion, "an xy-graph", singular counts, `invalid_json` without detail). `describeValue` and `describeRange` branches are tested.

---

### QR-004: `createIssue` passes non-finite bounds and bound-less flags through to `range`, breaking its plain-JSON guarantee

**Category:** Error Handling
**Severity:** Concern
**Location:** `src/core/issues.ts:206-213` (copy of the range), `src/core/issues.ts:102-110` (`describeRange`)
**Description:** `createIssue`'s doc comment makes it the place where an issue becomes "plain JSON data (GSV-REQ-033)", and the ticket's acceptance criterion names non-finite numbers explicitly. The range copy only checks `!== undefined`. Probe results:
- `range: { min: 0, max: Infinity, exclusiveMin: true }`: the issue holds `max: Infinity` in memory and `max: null` after `JSON.parse(JSON.stringify(...))`. The message says "radius must be a number greater than 0 and at most Infinity; got -2."
- `min: NaN`: becomes `min: null` after the round-trip, and the message says "at least NaN".
- `range: { exclusiveMin: true }`, a flag with no bound: copied as-is. The message becomes "r must be a number; got 1.", which gives no fix.

The round-trip test (`tests/core/issues.test.ts:152-157`) uses only finite samples.
**Impact:** Ranges will be built from `PropertySpec` bounds that later tickets write (DEL-002's Ticket Impact), and `max: Infinity` is a natural way to write "no upper bound". Such an issue passes in-process tests, which compare the object with itself. Its shape changes only when it crosses the tool or JSON boundary, where `null` appears in a field that `Range` types as `number`. That boundary is exactly where a model reads it.
**Recommendation:** Normalise the range once, at the top of `createIssue`:
1. Copy `min` and `max` only when `Number.isFinite`.
2. Copy each `exclusive*` flag only when its bound was copied.
3. Omit `range` entirely if nothing remains.

Build the message from the normalised inputs, so the message and the structured field agree. Add a test with `max: Infinity` and one with a flag-only range.
**Status:** Resolved
**Resolution:** Approved. Fixed by `normalizeRange`, which messages and fields share. See CR-003.

---

### QR-005: The public `./core` entry point exports internal helpers that the design does not list and no decision records

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/index.ts:1`, `src/core/index.ts:4-15`
**Description:** `src/core/index.ts` is the package's public `./core` entry point (`package.json` `exports`). It now exports ten runtime values: `ISSUE_CODES`, `issueDocs`, `createIssue`, `issueMessage`, `describeValue`, `describeRange`, `escapePointerToken`, `pointer`, `validResult` and `invalidResult`.

The design defines the public interface of `./core` as `validate`, `normalize`, `getSchema`, `getVocabulary` and `describe` (`.gener8v/technical-design/system-design.md:26`), and the file's own header comment still says the same.

The delivery record says the helpers are "exported for the validator stages". Those stages live in `src/core/validate/` and can import `./issues` directly. `src/tool` and `src/export` can also import `../core/issues` by relative path: tsup runs with `splitting: true`, so the code is shared in one chunk either way. No DEL decision records the wider surface, and no changeset accompanies it (`pnpm check:changesets`: 0).
**Impact:** Everything exported from `./core` becomes public API under semantic versioning (CPSE-REQ-042; `.gener8v/context.md` requires public interfaces to stay backward compatible). `describeValue` and `describeRange` are message-formatting details, and QR-001, QR-002 and QR-008 would each change their output or signature. Once released, every such change becomes an API change for consumers who have started calling them. Trimming the exports is free before the first release and needs a major version after it.
**Recommendation:**
- Export from `./core` only the contract:
  - types: `Issue`, `Issues`, `Range`, `Provenance`, `ValidationResult`, `IssueCode`
  - data: `ISSUE_CODES` and `issueDocs` (the documentation that GSV-NFR-005 requires)
- Keep the construction and formatting helpers internal.
- If a helper is meant for consumers (for example `createIssue`, so they can write custom checks), record that as a DEL decision.
- Update the header comment to match what the file exports.
**Status:** Resolved
**Resolution:** Approved. `./core` exports narrowed to the contract, and the header comment was updated.

---

### QR-006: The code-list snapshot cannot tell an allowed addition from a breaking rename or removal

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/issues.test.ts:15-46`
**Description:** The inline snapshot asserts the exact ordered list. It fails in the same way for three different changes:
- appending a code, which is allowed and is the routine RES-008 path
- reordering, which is harmless
- renaming or removing a code, which is breaking

Only the comment explains which kind of change was made. A contributor who adds a code runs `vitest -u` and gets a snapshot diff. If the same diff also renames a code, the rename looks like part of the routine update.
**Impact:** The test exists to make breaking changes impossible to miss (GSV-REQ-034). Because it fails on every non-breaking addition, it trains contributors to accept snapshot diffs without reading them.
**Recommendation:** Split the test into two assertions:
1. A literal `RELEASED_CODES` array checked with `expect(ISSUE_CODES).toEqual(expect.arrayContaining(RELEASED_CODES))`. This fails only on a rename or removal, so a failure always means a breaking change. Codes join `RELEASED_CODES` at release time.
2. Optionally, keep the existing snapshot to make additions visible in review.
**Status:** Resolved
**Resolution:** Approved. A `RELEASED_CODES` list checked with `arrayContaining` fails only on a rename or removal; the snapshot is kept for review visibility.

---

### QR-007: Values outside the type contract produce an `undefined` message or misleading text

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/core/issues.ts:123-182` (`switch` with no `default`), `src/core/issues.ts:91-99` (`describeValue`)
**Description:** The `switch` is exhaustive for TypeScript callers (see Error Handling). At runtime, it does not handle values the types exclude:
- **Unknown code:** `issueMessage` returns `undefined` for a code outside the union. A JavaScript caller of the exported `createIssue` gets `{"code":"bogus","path":"/x"}` with `message: undefined`, which contradicts both the `Issue` type and the doc comment's promise that optional fields are "never `undefined`".
- **Function, bigint or symbol value:** `describeValue` falls through to `String(value)`. A function prints its whole source code into the message. `10n` prints as `10`, so `wrong_kind` says "radius must be a number; got 10.", which contradicts itself.

The components accept JavaScript objects, not only parsed JSON, so such values can reach the validator.
**Impact:** Both cases are rare. The unknown-code case is the more serious: it breaks the module's plain-JSON promise without any error. The tool handler's `internal_error` wrapper (AD-015) can only convert a thrown error into an issue, and here nothing is thrown.
**Recommendation:**
- End the `switch` with `default: { const unreachable: never = code; throw new Error(\`Unknown issue code: ${String(unreachable)}\`); }`. This keeps compile-time exhaustiveness and fails loudly at runtime.
- In `describeValue`, return descriptions such as "a function", "a symbol" and "a bigint (10n)" for those types.
**Status:** Resolved
**Resolution:** Approved. An unknown code throws from `issueMessage` (guarded with `Object.hasOwn`; the validator turns it into `internal_error`). `describeValue` describes functions, symbols and big integers by kind.

---

### QR-008: Some messages read poorly: unrounded agreeing values, "a xy-graph", and axis ranges described as "a number"

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/issues.ts:149` (`agreeingValue`), `src/core/issues.ts:113` (`aGraph`), `src/core/issues.ts:165` and `src/core/issues.ts:169` (axis and scale ranges rendered by `describeRange`'s default `"a number"`)
**Description:** Probe outputs:
- A derived agreeing value prints at full precision: "…a value of 9.549296585513721 would agree…".
- `aGraph("xy-graph")` gives "xAxis is required for a xy-graph; add it.", and `xyz-graph` is the same. Two of the eleven graph types (AD-005) need "an".
- `outside_axis_range` reads "points[2].x (12) is outside the axis range, a number between -10 and 10; …". The range text is built to describe the kind of value a property accepts, not an interval.
**Impact:** Minor. But curriculum authors read these messages, and models receive them as the issue summary. This module is the single source of message wording (DEL-003), so a fix here applies everywhere.
**Recommendation:**
- Round `agreeingValue` to a few significant figures, for example `Number(v.toPrecision(4))`. That stays well within the 1% tolerance.
- Choose "a" or "an" from the graph-type value.
- Add a small `describeInterval(range)` that renders "from -10 to 10", and use it for axis and scale ranges.
**Status:** Resolved
**Resolution:** Approved. Rounding to 4 significant figures, "a"/"an" chosen correctly, and `describeInterval` ("from -10 to 10") for axis and scale ranges.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | `IssueParamsByCode` and `templates` record; filler text removed | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| QR-002 | Approved | Message-only inputs renamed and never copied into issue fields | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| QR-003 | Approved | Snapshots of every message and of the other branches | `tests/core/issues.test.ts` |
| QR-004 | Approved | `normalizeRange` | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| QR-005 | Approved | `./core` exports narrowed | `src/core/index.ts` |
| QR-006 | Approved | `RELEASED_CODES` check that fails only on a rename or removal | `tests/core/issues.test.ts` |
| QR-007 | Approved | Unknown code throws; non-JSON values described by kind | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| QR-008 | Approved | Rounding, articles, `describeInterval` | `src/core/issues.ts`, `tests/core/issues.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-05. All eight findings were fixed and re-verified with the full verification set (see the delivery record's Post-Review Amendments).
