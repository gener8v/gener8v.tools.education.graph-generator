# TICKET-007: Cylinder graph type — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-007`: delivery commit `fdd5c69`, branch `ticket/graph-library-gss-007`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews. The working tree's `src/` and `tests/` matched `fdd5c69` throughout (`git diff fdd5c69 -- src tests` empty), so every probe ran against the delivered code.

**What the delivery makes public.** The cylinder is now:
- registered in `validate`, `normalize`, `describe` and `createGraph`, in `<Graph>`, and as `<CylinderGraph>` with the `./cylinder` entry;
- published in `schema.json` and `tool-schema.json`.

It also moves the circle's eight radius/diameter terms into `src/core/definitions/figure.ts` as specs shared by identity with the cylinder (DEL-001), and adds `measurementLabelText`.

**What the caller controls.** Three numbers (`radius`, `diameter`, `height`), one enum (`hiddenBase`), five switches, five texts (`title`, `radiusLabelText`, `diameterLabelText`, `heightLabelText`, `unit`) and `lineColor`, which must match a pattern.

I probed the delivered code. It holds up against non-finite geometry, unbounded output, injection and prototype pollution:
- **Measurement limits and extreme proportions.** 246 valid descriptions drew, none `internal_error`, every Scene number finite and through `fmt()`. They covered radius, diameter and height at 0.001 / 0.002, the next double above, 17-digit values, 1, 2, 999999.9999999999 and 1,000,000 / 2,000,000, alone and with both radius and diameter supplied (agreeing within 1%), each with no labels, all labels, and the diameter alone with the hidden base omitted.
  - Coordinates stayed inside the drawing (15.95 to 430.2); the tallest drawing was 450.4 units without stacked labels.
  - The validator refuses, never the layout: 0, `-0`, −1, 0.0009999999999999998, 1000000.0000000001 (radius, height), `1e21`, `5e-324`, `9e307` and `Number.MAX_VALUE` → `out_of_range`; ±Infinity, NaN, `"3"`, `null`, `true`, `[]`, `{}` → `wrong_kind`. (A diameter of 1000000.0000000001 is in range, as it should be.)
  - GSS TICKET-001 SEC-002 is closed by construction: `cylinderScale` (`src/layout/cylinder.ts:36`) divides fixed box sizes by `2r` and `h × ISO_SCALE + 2r × ELLIPSE_RATIO`, both positive and at most about 2,000,000, so the scale is finite and `r × scale` and `h × scale` are at most 220 and 260 before `isometric()` sees them.
- **Degenerate ellipses and arcs.** At the extreme proportions the outline degenerates, as DEL-002 records: in 96 Scenes the base arcs had `rx` 0 (radius 0.001 under a 1,000,000 height draws about 3 × 10⁻⁷ units), in 152 `ry` rounded to 0, and 168 lines had zero length. Every one is valid SVG: an arc with a zero radius or equal endpoints is drawn as a line or omitted, and an `<ellipse>` with a zero radius is not rendered. Every `d` value had the one shape `M # # A # # # # # # #`, with no `NaN`, `Infinity` or exponent, because `pathData` (`src/layout/kit/format.ts`) maps every number, the arc flags included, through `fmt()`. Zero-length segments fall back in `unit()` (`src/layout/kit/vec.ts:19`), so label candidates stay finite. `checkScene` passed every Scene.
- **Caller text through `wrap`.** Every drawn caller text is cleaned and wrapped with a line cap:
  - radius, diameter and height labels go through `measurementLabel` (`cleanText`) → `placeLabels` → `labelBlock` → `textBlock` → `wrap`, with `LABEL_MAX_LINES` (4);
  - the stacked form (`r = …`, `d = …`, `h = …`, `src/layout/cylinder.ts:191`) is passed explicitly as `stackedText` and goes through the same `labelBlock`; a blank label is skipped before it can stack;
  - the title goes through `titleBlock` (3 lines).

  No caller text is drawn as a raw `text` node, and nothing caller-sized is spread into arguments. The obstacle count is fixed (at most 72 + 36 + 36 ellipse pieces, 2 sides, 2 segments), so label placement cost does not grow with the description: at most 11.7 ms per description for `createGraph` plus one server render.
- **Size at the caller-text limits.** I measured 3,672 descriptions:
  - 23 fillers (`wordsOf(200)`, 200 × `"`, `'`, `&`, `<`, `W`, `i`, `.`, `“`, emoji, astral narrow letters, and each `oneClusterTexts(200)`);
  - × 9 units (20 × `@`, `"`, `&`, `'` or emoji, and 19 × emoji, `'` or `&` + `.`, 19 × `.` + `"`);
  - × 6 measurement sets (2 × 5; 17-digit radius and height; 17-digit radius and diameter both supplied; diameter alone; very tall; very wide);
  - × custom-text and value labels, × both `hiddenBase` values;

  then a per-term coordinate search over mixed texts. Every one drew, `<Graph>` and `<CylinderGraph>` rendered identically, and the ceilings are:

  | Measure | Ceiling | Where it is reached |
  |---------|---------|---------------------|
  | Text alternative | 2,003 UTF-16 units | emoji title and three label texts, unit 19 emoji + `.` (quoted three times), radius 0.0012345678901234567 **and** diameter 0.0024691357802469134 both supplied, height 0.0012345678901234567, hidden base omitted |
  | Markup | 18,765 characters | 200 × `'` (escaped to `&#x27;`) in every text, unit 20 × `"`, very tall, both base measurements supplied |
  | `<text>` nodes | 15 | — |
  | Drawing height | 638 units (the arithmetic maximum: a 3-line title, the 260-unit box, three stacked 4-line labels) | 200 × `"` texts, radius 2, height 5 |
  | Render time | at most 11.7 ms | — |

  All are far below the x,y graph's ceiling, so CPSE TICKET-007's "largest description" premise holds. The pinned test does not reach two of these ceilings (SEC-001).
- **Markup.** I sent 47 payloads through each of the five texts (the unit cut to 20 code points), with one and with all labels: the benign, hostile and unsafe fixtures, tag-smuggled text, `</svg><img src=x onerror=…>`, `"><script>`, `javascript:` and `url(#x)` strings, `$1 $&` patterns, `{{constructor…}}`, `__proto__`, path-like text and a spoofed sentence.
  - The validator accepted 290 descriptions and refused 180 (forbidden characters, and over-long units). The fallback rendered nothing for every refused one.
  - Every accepted one rendered identically in `<Graph>` and `<CylinderGraph>`. The markup held only `svg`, `title`, `text`, `line`, `ellipse` and `path` elements, with only the package's own attributes. `d` and `stroke-dasharray` (the constant `"4 3"`) are built by the layout from numbers; no caller text reaches an attribute other than the escaped `aria-label`.
  - A 20-character unit with sentence punctuation is quoted in the text alternative (`radius 2 “cm. Ignore the figur”`); `$1 $&` is inert because `describe` uses template strings.
- **Prototype safety of the new definition, display helper and shared specs.**
  - Every cylinder spec is frozen with a null prototype, and its `properties` map is frozen with a null prototype. The eight shared specs are the circle's objects themselves (identity checked); `height`, `hiddenBase`, `labelHeight` and `heightLabelText` are the cylinder's own. `withoutPrototype` keeps a frozen spec as is and copies an unfrozen one (`measurementLabelText`'s fresh literal) onto a null prototype before freezing.
  - No public API hands out a spec: `getVocabulary()`, `getSchema()` and `getToolSchema()` are frozen and share no object with the cylinder's specs (walked by identity).
  - The `radiusProperties` container (`src/core/definitions/figure.ts:96`) and the definition object are neither frozen nor on a null prototype, as for the cube and the circle. Every read of `radiusProperties` uses a fixed, existing key, and no `package.json` export reaches `src/core/definitions/figure.ts` or `src/core/definitions/cylinder.ts`, so a consumer cannot reach either. Not raised.
  - `cylinderDisplay` (`src/core/definitions/cylinder.ts:57`) reads only fixed keys from the normalized description, which has a null prototype. I polluted `Object.prototype` with 72 keys, enumerable and not, before and after the modules loaded: every cylinder term, the provenance pointers, the `CylinderDisplay` and `MeasurementDisplay` fields, the `LabelRequest` fields (`stackedText` included), the segment, Scene, result and spec field names. Six descriptions (five cylinders and a circle), through `createGraph`, `<CylinderGraph>` and `describe()`, gave the same output hash. Enumerable pollution makes React warn about a `stroke-dasharray` DOM property in the circle fallback path; the output is unchanged.
  - I polluted `Array.prototype` indices 0..6, 0 + 2, and 3..12, before and after load: output unchanged, every description `ok`.
- **Built entry.** `dist/cylinder.js` and its three chunks (`chunk-DK6HHNHK.js`, `chunk-W336YBY2.js`, `chunk-QDAH5Z5C.js`) contain none of these (CC-003): `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.`, `eval`, `new Function`, dynamic `import()`, `require()`, `process.env`, storage, `document.cookie`, `innerHTML` or `dangerouslySetInnerHTML`. Their only external imports are `react` and `react/jsx-runtime`. `dist/` was rebuilt at 21:13 EDT by a parallel run; this review did not build it.
- **Tests.** `npx vitest run --no-cache` passed 717 tests in 24 files on the first run, with a scratch config without the build step (none of these files needs `dist/`): `tests/layout/cylinder.test.ts`, `tests/core/cylinder.test.ts`, `tests/core/circle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts`, `tests/core/validate-envelope.test.ts`, `tests/core/validate-structure.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/react/Graph.test.tsx`, `tests/layout/kit/*` (the timing test included), `tests/layout/circle.test.ts` and `tests/layout/cube.test.ts`.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean (see Configuration Security).

There is one finding, with no exploitable path:
- **SEC-001 (Informational):** the cylinder's recorded and pinned size ceiling never supplies both radius and diameter and never stacks every label under a full-height figure. The true ceilings are a 2,003-unit text alternative (recorded 1,985) and a 638-unit drawing (recorded 582.73, bound 650). Both are inside the test's bounds, but the height has 12 units to spare and the test's inputs cannot see it.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-007-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-004, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/figure.ts` (modified: `figureTerms` gains the eight radius/diameter specs; `radiusProperties`, `measurementLabelText`)
- `src/core/definitions/circle.ts` (modified: uses the shared specs)
- `src/core/definitions/cylinder.ts` (new: `Cylinder`, `CYLINDER_BASE_MEASUREMENTS`, `CYLINDER_HEIGHT_MIN`, `CYLINDER_HEIGHT_LIMIT`, `cylinderDisplay`, `defineCylinder`, `describe`)
- `src/layout/cylinder.ts` (new: `cylinderLayout`, `cylinderScale`, `FIT_WIDTH`, `FIT_HEIGHT`, `ellipseSegments`, `pathNode`, `segmentCandidates`)
- `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json` (registration and the `./cylinder` entry)
- `src/generated/schema.json` (the cylinder: `additionalProperties: false`, `required` `type` and `height`, `anyOf` radius or diameter, `minimum`/`maximum` 0.001..1,000,000 and 0.002..2,000,000, `enum`, `maxLength` 200 / 20 with `pattern`), `src/generated/tool-schema.json` (the same bounds without `pattern`), `src/generated/description.ts`, `src/generated/vocabulary.json`
- `examples/cylinder.json`, `examples/invalid/cylinder-missing-height.json`, `.changeset/cylinder-graph.md`
- `tests/core/cylinder.test.ts`, `tests/layout/cylinder.test.ts` (new); `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/layout/kit/isometric.ts` (`isometric`, `isoEllipse`, `ISO_SCALE`, `ELLIPSE_RATIO`, `HIDDEN_DASH`);
  - `src/layout/kit/format.ts` (`fmt`, `pathData`);
  - `src/layout/kit/figure-labels.ts` (`placeLabels`, `labelBlock`, `besidePoint`, `besideVertical`, `segmentNode`), `src/layout/kit/vec.ts` (`unit`);
  - `src/layout/kit/measure.ts` (`measurementLabel`), `src/layout/kit/title.ts` (`titleBlock`, `textBlock`);
  - `src/layout/kit/check.ts` (`checkScene`);
  - `src/core/format.ts` (`cleanText`, `quoteText`, `stateMeasurement`, `isUnitShaped`, `formatSupplied`, `sourceOf`);
  - `src/core/definitions/types.ts` (`defineProperties`, `withoutPrototype`, `deepFreeze`);
  - `src/graph.ts` (`createGraphWith`), `src/core/index.ts`;
  - the built `dist/cylinder.js` and its chunks.

**Context read:**
- **The ticket** (`.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-007.md`) and its Known Hazards: the two `path` arcs (AD-008); projected-axis comparison (AD-009); the definition contract; `maxItems` (not applicable, no arrays); derivation-group limits; domain checks; the rich example; provenance; the measurement-label rules; caller-sized text (GSS TICKET-002 SEC-001..003); GSS TICKET-001 CR-003 (radius along a projected axis) and SEC-002 (scale before projecting); the bundle test's placeholder type; caller-text limits and the at-limit and over-limit tests (GSV TICKET-007); `maxLength` on every string; per-type bundles and the registration checklist. Its Constraint is prd/TC-010.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004, TC-010). There is no `constraints/geometric-shapes-and-solids.md`.
- **`.gener8v/technical-design/system-design.md`** (AD-007..AD-011) and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **The earlier security reviews in this change,** chiefly GSS TICKET-001 (isometric kit), TICKET-002 (circle) and TICKET-006 (cube). Settled risks are not raised again:
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost (here at most 3 labels against a fixed obstacle set);
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSS TICKET-002 SEC-003/SEC-004: quotation marks in a text alternative are not a boundary; drawn labels show the unit unquoted;
  - caller colors are the caller's contrast choice;
  - blank-looking characters the plain-text policy allows;
  - the tool schema leaves out the plain-text `pattern`, and `validate` is the gate;
  - GSS TICKET-006 SEC-001 (`stackedText` read own-key) is fixed in the kit, and the cylinder passes `stackedText` explicitly anyway.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **Coverage.** Every cylinder term has a spec the validator enforces, mirrored in both schemas with `additionalProperties: false`:
  - `radius` 0.001..1,000,000 and `diameter` 0.002..2,000,000, one of them required (the derivation group), agreeing within 1% when both are given (`contradiction` otherwise);
  - `height`: required, 0.001..1,000,000;
  - `hiddenBase`: `"dashed"`/`"omitted"`;
  - five booleans, with seven `agrees` checks (label text implies labeled; a labeled or texted radius or diameter is drawn);
  - three label texts at most 200, plain text; `unit` at most 20, the shared `unitProperty`;
  - the shared `title` and `lineColor`.

  Unknown keys, `__proto__` included, are `unknown_property`. The derivation's limits agree (each diameter bound is twice the radius bound), so no in-range value derives an out-of-range one.
- **Numeric robustness.** The caller's measurements reach the geometry only as the ratio `cylinderScale` fits into a fixed 220 × 260 box, so every coordinate is bounded whatever the measurements. The Scene height is bounded by the title (3 lines), the box and at most 3 stacked labels of 4 lines: 638 units at most, which is also the arithmetic maximum. Every Scene number, including those inside `d`, goes through `fmt()`. A layout throw would become one `internal_error` (`src/graph.ts:42-46`), and none occurred on any valid description.
- **Injection vectors.** There is no SQL, shell, file path, template or dynamic code. The only sinks are React's SVG text children, the escaped `aria-label` and `<title>`, `stroke` (the validated `lineColor`), `d` (numbers only) and the constant `stroke-dasharray`. The markup probe found no gap.
- **Size ceiling.** See SEC-001.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a rendering and validation library with no accounts, sessions, tokens or protected resources (`.gener8v/context.md`). The cylinder adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data handling.** The cylinder collects, stores and sends nothing (CC-003). The built entry and its chunks contain no network, storage or cookie API, and there is no logging.
- **Errors.** A layout throw or malformed Scene becomes one `internal_error` with a fixed message (`src/graph.ts:18`, `:42-46`). No exception text reaches the caller.
- **Text alternative.** It states caller text in full, quoted, which is intended (CC-002); it is at most 2,003 UTF-16 units. Supplied values are stated as written, at most 21 characters each.
- **CC-002.** Every cylinder has a text alternative. The hidden half of the base differs from the front half by its dash, not by color (1.4.1). At extreme proportions the drawing degenerates to lines (DEL-002) and the text alternative still states every measurement and the hidden-base treatment.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets.** There are no secrets, credentials, keys or environment reads in the delivered files.
- **Registration.**
  - The definition is built by `/* @__PURE__ */ defineCylinder()`, and its `properties` by `defineProperties` (frozen, null prototype).
  - The shared specs are frozen, null-prototype objects held by identity by the circle and the cylinder; the vocabulary's one-definition-per-term rule (GSV-REQ-015) is met by construction.
  - The definition and layout tables stay frozen null-prototype records.
  - `<CylinderGraph>` draws with only its own definition and layout (`createGraphComponent`); `dist/chunk-DK6HHNHK.js` imports only the cylinder's definition and layout chunks.
  - `radiusProperties`, `cylinderDisplay` and the definition object are mutable but unreachable from any `package.json` export.
- **Dependency audit:**
  - Run on 2026-10-30 at 01:13:38 UTC (2026-10-29 21:13:38 EDT), from the repository root, with pnpm 10.28.2.
  - `pnpm audit`: exit 0, "No known vulnerabilities found".
  - `pnpm audit --prod`: exit 0, "No known vulnerabilities found".
  - `fdd5c69` leaves `pnpm-lock.yaml` and every dependency list unchanged (CC-001). Its only `package.json` change is the `./cylinder` entry in `exports`.

## Findings

### SEC-001: The cylinder's recorded and pinned size ceiling misses its two worst cases — both base measurements supplied (text alternative 2,003) and every label stacked under a full-height figure (height 638 against a bound of 650)

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (resource bounds; no exploitable path)
**Location:**
- `tests/react/Graph.test.tsx:961-996` ("keeps the cylinder's text alternative and markup bounded at its limits"): measurement sets at `:978-982`, `toBeLessThan(2_200)` at `:988`, `toBeLessThan(650)` at `:989`, `toBeLessThan(22_000)` at `:990`;
- the delivery record's Notes ("at most a 1,985-character text alternative, 18,731 characters of markup, 15 `<text>` nodes and a height of 582.73").

**Description:** The pin varies the texts (`"`, `'`, emoji with a quoted unit) and three measurement pairs, but every pair supplies the radius alone, and every pair is width-bound or extreme:
- **Both base measurements supplied.** When the radius and the diameter are both given (and agree within 1%), both are supplied and stated as written, so the text alternative carries two 21-character values instead of one written and one rounded. Emoji texts, unit 19 emoji + `.`, radius 0.0012345678901234567, diameter 0.0024691357802469134, height 0.0012345678901234567, hidden base omitted: 2,003 UTF-16 units, against the recorded 1,985.
- **Full-height figure with every label stacked.** `(3.14…, 2.71…)` is width-bound (the figure is less than 260 tall), and the two extreme pairs leave room beside the side line, so the height label places. With 200 × `"` texts and radius 2, height 5 (or any height-bound ratio such as 1 × 2), all three labels find no clear place and stack at 4 lines each under a 260-unit figure: the drawing is 638 units, the arithmetic maximum (16 + 3 × 21.6 title, 16 + 16.8 + 6 label room, 260, 6 + 16.8, 3 × (6 + 4 × 16.8), 16). The pin's inputs reach 582.73; the at-limit test (`:665`) uses radius 2, height 5 but no `"` texts and asserts no height (564.8).

Measured on this branch, with every text at its limit:

| Measure | Recorded / pinned input | True ceiling | Test bound |
|---------|------------------------|--------------|------------|
| Text alternative | 1,985 | 2,003 UTF-16 units | < 2,200 |
| Markup | 18,731 | 18,765 characters (200 × `'`, unit 20 × `"`, very tall, both measurements supplied) | < 22,000 |
| `<text>` nodes | 15 | 15 | ≤ 15 |
| Drawing height | 582.73 | 638 units | < 650 |

Every true ceiling is inside its bound today. The height, though, has only 12 units to spare, and the test's own input sits 67 units below the bound: a change that adds one stacked line (16.8 units), such as a fifth label line or a taller label-room band, would take the real worst case past 650 while the test still passes. This is the same gap the cube's SEC-002 closed for its own pin. All values are orders of magnitude below the x,y graph's ceiling, so CPSE TICKET-007's premise is unaffected.
**Attack Scenario:** N/A (Informational)
**Impact:** None today. The risk is that the ceiling drifts unnoticed, and that the delivery record states a smaller ceiling than callers can reach.
**Recommendation:**
1. Add to the pin's measurement sets a pair with both base measurements supplied, `{ radius: 0.0012345678901234567, diameter: 0.0024691357802469134, height: 0.0012345678901234567 }`, and a height-bound pair, `{ radius: 2, height: 5 }`, so the `"` texts stack every label under a full-height figure.
2. Keep the bounds (2,200; 22,000; 15; 650) and note the measured 2,003 / 18,765 / 15 / 638 in the comment, or raise the height bound to about 700 with the measured value beside it.
3. Record the true ceiling in the delivery record's Post-Review Amendments: 2,003 UTF-16 units of text alternative, 18,765 characters of markup, 15 `<text>` nodes, a height of 638.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The pin in `tests/react/Graph.test.tsx` adds a set with both base measurements supplied and a height-bound set (radius 2, height 5) whose labels all stack; the bounds stay 2,200 / 22,000 / 15, and the height bound is 700. Measured in the main session: a 2,003-unit text alternative, 18,731 characters of markup (the review measured 18,765), 15 `<text>` nodes and a height of 638.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Both worst cases in the size pin; height bound 700 | No | `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 fixed during resolution and recorded in the delivery record's Post-Review Amendments.
- **Verdict basis.** The cylinder adds no injection, confidentiality or code-execution path:
  - its geometry reads the caller's measurements only as a ratio fitted into a fixed box, so nothing overflows at the limits, and every degenerate ellipse or arc at extreme proportions is finite, valid SVG through `fmt()`;
  - every caller text is cleaned and wrapped with a line cap;
  - the shared specs are frozen, null-prototype and shared by identity, and its own reads ignore polluted `Object.prototype` keys and `Array.prototype` indices;
  - its output is bounded (2,003 / 18,765 / 15 / 638);
  - the dependency audit is clean.
- **SEC-001** adds the two missing worst cases to the cylinder's pinned ceiling and corrects the recorded figures.
