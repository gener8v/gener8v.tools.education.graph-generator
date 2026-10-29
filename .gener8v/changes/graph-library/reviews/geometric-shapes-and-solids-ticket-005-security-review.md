# TICKET-005: Triangle layout and labels — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-005`, delivery commit `410f82b` on branch `ticket/graph-library-gss-005`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews.

**Code under review.** While this review ran, the main session resolved code review CR-001 and committed it as `e498f8f` ("Resolve graph-library GSS TICKET-005 code review"). That commit adds an optional `stackedText` to `src/layout/kit/figure-labels.ts` and `src/layout/triangle.ts`. To review exactly what was delivered, every probe and test below ran against an export of `410f82b` in the scratch directory (`git archive 410f82b`, with the repository's `node_modules` linked). I re-ran the two probes that `e498f8f` could affect against it:
- SEC-001 reproduces unchanged.
- The size ceiling is the same or lower: a text alternative of 5,709 units, markup of 45,214 characters, 39 `<text>` nodes and a height of 944. Stacked text still goes through `labelBlock`, so the 4-line cap holds.

The delivery makes the triangle public:
- registered in `validate`, `normalize`, `describe` and `createGraph`, in `<Graph>`, and as `<TriangleGraph>` with the `./triangle` entry;
- published in `schema.json` and `tool-schema.json`;
- adds the layout (`src/layout/triangle.ts`), the label terms and `triangleDisplay` (`src/core/definitions/triangle.ts`), and the shared `labelSides` and `agrees` (`src/core/definitions/figure.ts`).

The caller controls six numbers, up to three `{x, y}` vertices, up to three vertex names, six custom label texts, `labelSides`, `labelAngles`, `unit`, `title` and `lineColor`.

Probed at `410f82b`, it holds up against non-finite geometry, unbounded output, injection and slow work:
- **Numeric extremes.** I drew 25 hand-picked extremes, each bare and with every label on. They covered:
  - 0.02° needles by ASA, SAS, AAS and SSS, up to a 1,000,000 side;
  - sides of 0.001 and of 1,000,000;
  - vertex triangles of side 0.001 at (±1,000,000, ±1,000,000);
  - clockwise vertices, `-0`, and a `5e-324` offset.

  Every valid one drew with finite numbers, passed `checkScene`, and kept every `points` value inside the drawing. Heights were 77.64 to 368.8 units. Invalid ones were refused by the validator as `not_a_triangle` or `out_of_range`, never by the layout.
- **Fuzz (xorshift32, seeds 20261029 and 29102026).** 250,000 descriptions across every determining set: thin SSS built from angles near the 0.02° floor, near-90° angles, and random, needle and tiny vertex triangles anywhere in ±1,000,000. 94,227 were valid. For each, `validate` and `createGraph` agreed:
  - no `internal_error`;
  - no exception;
  - no `checkScene` problem;
  - no coordinate outside the drawing.

  The tallest drawing was 573.2 units and the largest had 20 nodes. The slowest took 9.97 ms, a one-off; the typical time is under 2 ms.
- **The layout's arithmetic.** It divides only:
  - in `unit` (guarded: positive and finite);
  - in `fitScale` (a zero dimension sets no limit; the fallback is 1);
  - by a side length when computing a vertex's height to its opposite side (guarded `opposite > 0`).

  It never divides by a height, inradius or sine, as TICKET-004 SEC-001's hazard asked. Every Scene number goes through `fmt()`/`fmtPoints()`. A layout throw would become one `internal_error` (`src/graph.ts:42-46`), and none occurred.
- **Caller text through `wrap`.** Every drawn caller text is cleaned and wrapped with a line cap, never drawn as a raw `text` node:
  - vertex names, side labels and angle labels go through `placeLabels` → `labelBlock` → `textBlock` → `wrap` (`LABEL_MAX_LINES`, 4);
  - the title goes through `titleBlock` (3 lines).

  Nothing caller-sized is spread into arguments.
- **Size at the caller-text limits.** I measured 11 fillers (`wordsOf(200)`, 200 × `"`, `'`, `&`, `<`, `W`, emoji, astral narrow characters, and each `oneClusterTexts(200)`) on six triangles: 3-4-5, both needles, a right angle, and vertices with subnormal and long-decimal coordinates. Every text was at its limit, every label was on, and the unit was 20 × `@` or `"`. The ceilings are:

  | Measure | Ceiling | Where it is reached |
  |---------|---------|---------------------|
  | Text alternative | 5,709 UTF-16 units | emoji texts, subnormal vertices |
  | Markup | 47,177 characters (47,263 bytes) | `'` texts |
  | `<text>` nodes | 39 | — |
  | Scene nodes | 43 | — |
  | Drawing height | 944 units | — |
  | Render time | at most 1.65 ms (mean 0.92 ms, 684 renders) | — |

  This is far below the x,y graph's pinned ceiling (about 560,000 characters and 5.8 MB), so CPSE TICKET-007's "largest description" premise holds. Nothing pins the triangle's own ceiling (SEC-002).
- **Markup.** I sent 64 payloads through six text slots (`title`, the first and last vertex name, a side and an angle label text, and `unit`): benign, hostile and unsafe fixtures, tag-smuggled text, real stacked scripts, markup and script payloads, `$1 $&` replacement patterns, and spoofed sentences.
  - The validator accepted 270 descriptions and refused 114, all as `wrong_kind` for forbidden characters.
  - Every accepted one rendered identically in `<Graph>` and `<TriangleGraph>`. The markup held only `svg`, `title`, `text`, `polygon` and `polyline`, with only the package's own attributes.
  - Caller text appeared only as escaped text, and no unsafe character reached the markup or the text alternative.
  - `describe`'s `replace(/^vertex (\w) /, …)` takes the caller's name only as its subject, so `$1`/`$&` in a name are inert.
- **Pollution.**
  - `Object.prototype`: I polluted 49 keys, enumerable and not, and rendered five descriptions. The keys covered every triangle term, the provenance pointers, and the internal field names (`base`, `customText`, `labeled`, `rightAngle`, `names`, `candidates`, `x`/`y`, `width`/`height`, `lines`, `nodes`, `attrs`, `textAlternative`, …). The output hash was unchanged.
  - `Array.prototype[0..2]` changes the output (SEC-001).
- **Built entry.** `dist/triangle.js` and its three chunks contain no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.`, `eval`, `new Function`, dynamic `import()`, `require()`, `process.env`, storage, `document.cookie`, `innerHTML` or `dangerouslySetInnerHTML` (CC-003). Their only external imports are `react` and `react/jsx-runtime`. `dist/` was rebuilt at 14:57 EDT by a parallel run, from the working tree; this review did not build it.
- **Tests.** At `410f82b`, `npx vitest run --no-cache` passed 702 tests in 24 files, with no reruns needed. The run used a scratch config without the build step, since none of these files needs `dist/`. The files were:
  - `tests/layout/triangle.test.ts`, `tests/core/triangle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts`, `tests/react/Graph.test.tsx`;
  - `tests/layout/kit/*` (the timing test included);
  - the triangle solver tests and their property test, `validate-structure`;
  - the square's and the circle's layout and core tests.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean (see Configuration Security).

There are two findings, neither exploitable for confidentiality or code execution:
- **SEC-001 (Low):** `triangleDisplay` reads vertex names by index past the caller's array. A polluted `Array.prototype[0]` or `[2]` is drawn as a vertex name and stated, uncapped, in the text alternative of every triangle with fewer than three names. This is a regression: TICKET-004's `describe` read only the caller's own elements.
- **SEC-002 (Informational):** the triangle's size ceiling is not recorded in the delivery record or pinned by a test. The at-limit test bounds only the `<text>` count.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-005-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-006, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/layout/triangle.ts` (new: `triangleLayout`, `modelVertices`, `fitScale`, `SIDE_ENDS`, the candidates, the marks)
- `src/core/definitions/triangle.ts` (modified: label terms, `TRIANGLE_LABEL_TEXT`, `isRightAngle`, `triangleDisplay`, `labelSentences`, `describe`)
- `src/core/definitions/figure.ts` (modified: `labelSidesProperty`, `agrees<D>()`)
- `src/core/definitions/circle.ts`, `src/core/definitions/square.ts` (modified: the shared `agrees` and `labelSides`)
- `src/react/graphs/TriangleGraph.tsx`, `src/entries/triangle.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json` (registration and the `./triangle` entry)
- `src/generated/schema.json`, `src/generated/tool-schema.json` (the triangle's entries: `additionalProperties: false`, `maxLength`, `pattern`, `minimum`/`maximum`, `exclusiveMaximum`, `enum`, `maxItems`), plus `src/generated/description.ts` and `src/generated/vocabulary.json` (regenerated)
- `examples/triangle*.json`, `examples/invalid/triangle-*.json`, `.changeset/triangle-graph.md`
- `tests/layout/triangle.test.ts` (new); `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/triangle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/layout/kit/figure-labels.ts` (`placeLabels`, `labelBlock`);
  - `src/layout/kit/labels.ts` (`placeLabel`);
  - `src/layout/kit/title.ts` (`textBlock`, `textLines`, `titleBlock`);
  - `src/layout/kit/text.ts` (`wrap`, `drawnWord`, caps);
  - `src/layout/kit/format.ts` (`fmt`, `fmtPoints`);
  - `src/layout/kit/measure.ts` (`measurementLabel`);
  - `src/layout/kit/check.ts` (`checkScene`);
  - `src/react/SceneSvg.tsx`, `src/react/createGraphComponent.tsx`, `src/graph.ts` (`createGraphWith`);
  - `src/core/format.ts` (`cleanText`);
  - `src/core/validate/structure.ts` (code-point length check);
  - the built `dist/triangle.js` and its chunks.

**Context read:**
- **The ticket** (`.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-005.md`) and its Known Hazards:
  - y-flip;
  - the provenance contract;
  - the measurement-label rules;
  - caller-sized text (GSS TICKET-002 SEC-001..003);
  - caller-text limits and the at-limit and over-limit tests (GSV TICKET-007);
  - per-type bundles and the registration checklist;
  - vertex names through `wrap`;
  - TICKET-004's DEL-002..004;
  - TICKET-004 SEC-001 (the 0.02° floor; never divide by a height without a guard).

  Its Constraints are prd/TC-001, prd/TC-011 and prd/CC-002.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). There is no `constraints/geometric-shapes-and-solids.md`.
- **`.gener8v/technical-design/system-design.md`** and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **The earlier security reviews in this change,** chiefly GSS TICKET-002 (circle), TICKET-003 (square) and TICKET-004 (solver), and NLC TICKET-003/004 for the pinned ceilings. Settled risks are not raised again:
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost (here at most 9 labels against at most about 50 obstacles);
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSS TICKET-002 SEC-003/SEC-004: quotation marks in a text alternative are not a boundary, and a unit with quotes or angle brackets can count as unit-shaped and be stated unquoted. The probe saw both, as plain escaped text;
  - caller colors are the caller's contrast choice;
  - blank-looking characters the plain-text policy allows;
  - TICKET-004: vertex coordinates have no schema `minimum`/`maximum`, and `validate` is the gate.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
- **Coverage.** Every triangle term has a spec the validator enforces, mirrored in both schemas with `additionalProperties: false`:
  - sides 0.001..1,000,000;
  - angles from 0.02 up to but not including 180;
  - `vertices`: at most 3, `{x, y}` required and closed, with ±1,000,000 enforced by `coordinateIssues`;
  - `vertexNames`: at most 3, each at most 200 code points, plain text;
  - six label texts, each at most 200, plain text;
  - `labelSides`: `"one"`/`"all"`;
  - `labelAngles`: boolean;
  - `unit`: at most 20;
  - the shared `title` and `lineColor`.

  The tool schema leaves out the plain-text `pattern`, as for every type, and `validate` stays the gate. The angle-text contradiction (`labelAngles: false` with angle custom text) is a domain check (`agrees`), and it reads the frozen null-prototype description.
- **Numeric robustness.** No valid description produced a non-finite or off-drawing coordinate, or a layout failure, in 94,227 valid fuzzed triangles and 25 hand-picked extremes (Summary). The Scene height is bounded by `FIGURE_HEIGHT`, at most 3 title lines and at most 9 stacked labels of 4 lines: 944 units at most, measured.
- **Injection vectors.** There is no SQL, shell, file path, template or dynamic code. The only sinks are React's SVG text children, the escaped `aria-label` and `<title>`, and `stroke`, which takes the validated `lineColor`. The markup probe found no gap.
- **Gap.** Vertex names are read by index beyond the caller's array, so a polluted `Array.prototype` index enters the drawing and the text alternative without validation or a length cap (SEC-001).
- **Pre-existing, not raised.** With `Array.prototype[1]` polluted, every triangle and square Scene fails `checkScene` and `createGraph` returns `internal_error`. The cause is `src/layout/kit/check.ts:32`, `token.split(".")[1]` on an integer token. That is kit code this delivery does not touch, and it fails closed.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a rendering and validation library with no accounts, sessions, tokens or protected resources (`.gener8v/context.md`). The triangle adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data handling.** The triangle collects, stores and sends nothing (CC-003). The built entry and its chunks contain no network, storage or cookie API, and there is no logging.
- **Errors.** A layout throw or malformed Scene becomes one `internal_error` with a fixed message (`src/graph.ts:18`, `:42-46`). No exception text reaches the caller, and none occurred on valid input.
- **Text alternative.** It states caller text in full, quoted, which is intended (CC-002). It is at most 5,709 UTF-16 units at the limits. Supplied vertex coordinates are stated as written, so a subnormal coordinate is written out at about 326 characters. Six coordinates bound that, and it is included in the ceiling above.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets.** There are no secrets, credentials, keys or environment reads in the delivered files.
- **Registration.**
  - The definition is built by `/* @__PURE__ */ defineTriangle()`, its `properties` by `defineProperties`, frozen with a null prototype.
  - `labelSidesProperty` and `unitProperty` come from the pure, frozen `figureTerms`.
  - The definition and layout tables stay frozen null-prototype records.
  - `<TriangleGraph>` draws with only its own definition and layout (`createGraphComponent`).
- **Dependency audit:**
  - Run on 2026-10-29 at 18:52:53 UTC (14:52:53 EDT), from the repository root, with pnpm 10.28.2.
  - `pnpm audit`: exit 0, "No known vulnerabilities found".
  - `pnpm audit --prod`: exit 0, "No known vulnerabilities found".
  - `410f82b` leaves `pnpm-lock.yaml` and every dependency list unchanged. Its only `package.json` change is the `./triangle` entry in `exports`.

## Findings

### SEC-001: Vertex names are read by index past the caller's array, so a polluted `Array.prototype` index is drawn and stated, uncapped, in the text alternative

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures (prototype pollution; defense in depth)
**Location:**
- `src/core/definitions/triangle.ts:140-141` (`triangleDisplay`): `const names = triangle.vertexNames ?? [];` and `names[i] === undefined ? "" : cleanText(names[i])` for `i` = 0, 1, 2;
- consumed at `src/layout/triangle.ts:264` (the name label requests) and `src/core/definitions/triangle.ts:313-320` (`describe`).

**Description:** `triangleDisplay` builds the three names with `name(0)`, `name(1)` and `name(2)`. It reads `names[i]` whether or not the caller's array has an element there. When `vertexNames` is absent (the `[]` fallback) or shorter than three, which is the common case, an index past the end is looked up through `Array.prototype`. An inherited value there:
- skips the validator, so neither `CALLER_TEXT_LIMIT` nor the plain-text policy applies (`cleanText` still strips hidden and line-breaking characters);
- is drawn at the vertex (wrapped and cut to 4 lines);
- is stated in the text alternative in full, through `describe`, `createGraph`, `<Graph>` and `<TriangleGraph>`.

TICKET-004's `describe` iterated `(triangle.vertexNames ?? [])` itself, and its review found `Array.prototype[0..3]` left the output byte-identical. So this is a regression of the project's own-key pattern (rulers NLC TICKET-003 SEC-002; GSS TICKET-004 SEC-002).

Probed at `410f82b`:
- With `Array.prototype[2] = "The answer is 42"`, `{ type: "triangle", sideA: 3, sideB: 4, sideC: 5 }` draws "The answer is 42" at vertex C. Its text alternative adds "Vertex C is named “The answer is 42”." With `vertexNames: ["P"]`, both P and the injected name are drawn.
- With a 1,000,000-character value at `[0]` or `[2]`, the text alternative is 1,000,102 characters and the markup 2,001,221. The at-limit ceiling is 5,709 and 47,177.
- `describe()` from `./core` states the injected name too.
- `[1]` instead makes every triangle `internal_error`, because of the pre-existing `checkScene` read noted under Input Validation.
- The square and the circle are unaffected. `Object.prototype` pollution of all 49 keys left the triangle's output unchanged.

**Attack Scenario:** Not required for Low. The precondition is a separate prototype-pollution flaw in the host application that can set a numeric key on `Array.prototype`. An example is a deep merge or path setter fed attacker JSON whose path runs through an array's `__proto__`. Given that, the attacker can do two things to every triangle the page renders that has fewer than three vertex names:
- put chosen text on the figure and in its accessible name ("The answer is 42" in a geometry worksheet);
- inflate each text alternative, and the server-rendered markup that holds it twice, to megabytes.

They cannot run script: React escapes the text, and the validator's verdict is unchanged.

**Impact:** The integrity of the drawn figure and its text alternative, and output size (each render's `aria-label` and `<title>`), for every unnamed or partly named triangle in a polluted runtime. There is no confidentiality, code-execution or cross-user impact beyond what the host's own pollution flaw already gives.
**Recommendation:** Read only the caller's own elements:

```ts
const names = triangle.vertexNames ?? [];
const name = (i: number) => (i < names.length && Object.hasOwn(names, i) ? cleanText(names[i]!) : "");
```

`names.at(i)` would also do, since it checks the length before it reads. Add `Array.prototype[0]` and `[2]` cases to the triangle's tests, and assert the Scene and text alternative are unchanged. They are the indices that change output today; with `[1]`, `checkScene` fails first. If the kit's `checkScene` read is to be hardened too (`token.split(".")[1]` → `token.includes(".") ? token.slice(token.indexOf(".") + 1) : ""`), that is outside this ticket and belongs to its own ticket.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `triangleDisplay` reads a vertex name only when `Object.hasOwn(names, i)` and it is a string. `tests/core/triangle.test.ts` pollutes `Array.prototype[1]` and `[2]` and checks that no inherited name is stated, with and without `vertexNames`; reading `names[i]` directly fails it (mutation-checked).

---

### SEC-002: The triangle's size ceiling is neither recorded nor pinned; the at-limit test bounds only the `<text>` count

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (resource bounds; no exploitable path)
**Location:**
- `tests/react/Graph.test.tsx:621-644` ("draws a valid triangle with every text at its limit…"): one 3-4-5 triangle, asserting `<text>` ≤ 3 + 9 × 4 at `:641`;
- compare `tests/react/Graph.test.tsx:823` ("keeps the x,y,z graph's text alternative and markup bounded at its limits, below the x,y graph's").

**Description:** The earlier types that publish caller text each have their worst case measured and pinned:
- the x,y graph (NLC TICKET-003 SEC-001) and the x,y,z graph (NLC TICKET-004 SEC-001) pin their text alternative and markup length, kept below the x,y graph's ceiling, so CPSE TICKET-007's "largest valid description" premise is checked by the suite;
- the line graph, number line and bar graph have the same pins.

The triangle's at-limit test checks that the description renders and bounds the `<text>` count. It does not bound the text alternative, the markup or the drawing height, and the delivery record does not state the ceiling. Measured at `410f82b`, every text at its limit:

| Measure | Ceiling | Where it is reached |
|---------|---------|---------------------|
| Text alternative | 5,709 UTF-16 units | emoji or astral texts, vertices with subnormal coordinates stated in full |
| Markup | 47,177 characters | 200 × `'` texts, each escaped to `&#x27;` |
| `<text>` nodes | 39 | — |
| Scene nodes | 43 | — |
| Drawing height | 944 units | — |

All of these are about two orders of magnitude below the x,y graph's (about 560,000 characters, 5.8 MB). A later change could raise them without any test failing. Examples are stating coordinates at more digits, stacking more labels, or a longer `stackedText` prefix (`e498f8f`).
**Attack Scenario:** N/A (Informational)
**Impact:** None today. The risk is that the ceiling drifts unnoticed. The ceiling bounds what a server rendering caller descriptions emits per triangle.
**Recommendation:**
1. Record the ceiling in the delivery record's Post-Review Amendments: about 5,700 UTF-16 units of text alternative, about 47,000 characters of markup, 39 text nodes and a height under 1,000.
2. Pin it in `tests/react/Graph.test.tsx` beside the other ceiling tests. Use vertices with subnormal coordinates (for example `[{ x: 5e-324, y: -2.2250738585072014e-308 }, { x: 1, y: -2.2250738585072014e-308 }, { x: -2.2250738585072014e-308, y: 1 }]`), every text 200 × `'` and, separately, 200 emoji, every label on, and `unit` 20 × `"`. Assert:
   - the text alternative under about 6,500 units;
   - the markup under about 50,000;
   - `scene.height` under 1,000;
   - optionally, both under the x,y graph's ceilings (600,000 and 6,200,000).

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). Measured with every caller text at 200 × `"`, a 20-character unit, every label shown and 15-digit measurements: a 2,375-character text alternative, 38,948 characters of markup and 39 `<text>` nodes, for three sides and for a 0.02° needle alike (a vertex-given worst case is refused as too large). `tests/react/Graph.test.tsx` pins the text alternative under 4,000, the markup under 60,000 and the `<text>` count at 3 + 9 × 4.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Own-element reads of `vertexNames`; polluted-prototype test | No | `src/core/definitions/triangle.ts`, `tests/core/triangle.test.ts` |
| SEC-002 | Fix | Worst case measured and pinned | No | `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 and SEC-002 fixed during resolution and recorded in the delivery record's Post-Review Amendments.
- **Verdict basis.** The triangle adds no injection, confidentiality or code-execution path, and its layout is numerically robust on every valid extreme probed:
  - finite, on-drawing coordinates from 0.02° needles to ±1,000,000 vertices;
  - no `internal_error` on 94,227 valid fuzzed triangles;
  - a bounded Scene;
  - every caller text through `wrap` with a line cap;
  - a clean dependency audit.
- **SEC-001** is a one-line own-element fix in `triangleDisplay` with a pollution test. It regresses a pattern TICKET-004 kept, so it is worth fixing before merge.
- **SEC-002** records and pins the triangle's ceiling as the earlier types did.
- **CR-001 commit.** `e498f8f` (the CR-001 resolution) was rechecked only for SEC-001 and the size ceiling, and both hold there; the rest of that commit is the code review's.
