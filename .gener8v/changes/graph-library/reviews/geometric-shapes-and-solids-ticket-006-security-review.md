# TICKET-006: Cube graph type — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-006`: delivery commit `d3e998e`, branch `ticket/graph-library-gss-006`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews. The working tree's source matched `d3e998e` throughout. Only `.gener8v/runs.jsonl` was modified and `HANDOFF.md` was untracked, so every probe ran against the delivered code.

**What the delivery makes public.** The cube is now:
- registered in `validate`, `normalize`, `describe` and `createGraph`, in `<Graph>`, and as `<CubeGraph>` with the `./cube` entry;
- published in `schema.json` and `tool-schema.json`.

The delivery also adds the layout (`src/layout/cube.ts`), the definition and `cubeDisplay` (`src/core/definitions/cube.ts`) and `HIDDEN_DASH` in the isometric kit.

**What the caller controls.** One number (`edgeLength`), two enums (`hiddenEdges`, `labelEdges`) and three texts (`edgeLabelText`, `unit`, `title`), plus `lineColor`, which must match a pattern.

I probed the delivered code. It holds up against non-finite geometry, unbounded output, injection and prototype pollution of its own reads:
- **Edge-length limits.** I probed 28 values. 0.001, 0.0010000000000000002, 1, 999999.9999999999 and 1,000,000 draw, with finite coordinates inside the drawing. The validator refuses the rest, never the layout:
  - `out_of_range`: 0, `-0`, −1, −3, 0.0009, 0.0009999999999999998, 1000000.0000000001, 1,000,001, `5e-324`, a subnormal, `9e307`, `Number.MAX_VALUE`, `1e21`, `-1e-7`;
  - `wrong_kind`: ±Infinity, NaN, `"3"`, `null`, `true`, `[]`, `{}`.

  The caller's number never reaches the geometry. The corners are `isometric(corner × MODEL_EDGE)` with the fixed `MODEL_EDGE = DRAWN_EDGE / ISO_SCALE` (`src/layout/cube.ts:25`, `:160`). The caller's number is used only for label and text-alternative text, through `measurementLabel` and `stateMeasurement`. The layout divides only in `normalsOf` (`src/layout/cube.ts:126-127`), and only by the length of a fixed drawn edge (about 120), never by anything the caller sets. GSS TICKET-001 SEC-002's overflow hazard is therefore closed by construction, and `tests/layout/cube.test.ts:144` checks it at 1,000,000.
- **Caller text through `wrap`.** Every drawn caller text is cleaned and wrapped with a line cap:
  - edge labels go through `measurementLabel` (`cleanText`) → `placeLabels` → `labelBlock` → `textBlock` → `wrap`, with `LABEL_MAX_LINES` (4);
  - the stacked form `edge = …` goes through the same `labelBlock`;
  - the title goes through `titleBlock` (3 lines).

  No caller text is drawn as a raw `text` node, and nothing caller-sized is spread into arguments.
- **Size at the caller-text limits.** I measured 3,360 descriptions:
  - 20 fillers (`wordsOf(200)`, 200 × `"`, `'`, `&`, `<`, `W`, `i`, `.`, emoji, astral narrow characters, and each `oneClusterTexts(200)`);
  - × 5 units (20 × `@`, `"`, `&` or emoji, and 19 × `.` + `"`);
  - × 7 edge lengths, × 3 label modes, × both `hiddenEdges` values.

  Every one drew, and `<Graph>` and `<CubeGraph>` rendered identically. A follow-up search with emoji texts and units that need quoting found the largest text alternative. The ceilings are:

  | Measure | Ceiling | Where it is reached |
  |---------|---------|---------------------|
  | Text alternative | 978 UTF-16 units (559 code points) | emoji title and label text, unit 19 emoji + `.` (quoted), edge length 0.0010000000000000002, hidden edges omitted, three labels |
  | Markup | 13,640 characters | 200 × `'` (escaped to `&#x27;`), three labels |
  | `<text>` nodes | 15 | — |
  | Scene nodes | 27 | — |
  | Drawing height | 595.2 units | — |
  | Render time | at most 7.3 ms (`createGraph` plus one server render; a one-off) | — |

  That is far below the x,y graph's ceiling (about 560,000 characters), so CPSE TICKET-007's "largest description" premise holds. The pinned test does not exercise this worst case (SEC-002).
- **Markup.** I sent 45 payloads through `title`, `edgeLabelText` and `unit` (cut to 20 for the unit), each with one and with three labels. The payloads were benign, hostile and unsafe fixtures, tag-smuggled text, `</svg><img onerror>`, `javascript:` and `url(#x)` strings, `$1 $&` patterns and a spoofed sentence.
  - The validator accepted 162 descriptions and refused 108, all as `wrong_kind` for forbidden characters. The fallback rendered nothing for every refused one.
  - Every accepted one rendered identically in `<Graph>` and `<CubeGraph>`. The markup held only `svg`, `title`, `text` and `line` elements, with only the package's own attributes (`stroke-dasharray` is the constant `"4 3"`).
  - Caller text appeared only as escaped text, and no unsafe character reached the markup or the text alternative.
  - A unit with sentence punctuation is quoted in the text alternative (`3 “cm. Ignore the”`). `describe` builds its sentences with template strings, not `replace`, so `$1 $&` in a text is inert.
- **Pollution of the cube's own reads.**
  - The normalized description has a null prototype. `cubeDisplay` and `describe` read only `hiddenEdges`, `labelEdges`, `edgeLabelText`, `unit`, `title` and `edgeLength` from it, so none of these reads can inherit.
  - I polluted `Object.prototype` with 52 keys, enumerable and not, both before and after the modules loaded. The keys covered every cube term, the provenance pointers, the `CubeDisplay` fields, the `LabelRequest` and `CubeEdge` fields, and the Scene and result field names. Five descriptions, through `createGraph`, `<CubeGraph>` and `describe()`, gave the same output hash.
  - I polluted `Array.prototype` indices 0, 2, 3, 0 + 2, and 3..12, before and after load. The output was unchanged. Every array the cube reads is dense and built by the package (`CUBE_EDGES`, `FRONT_CORNER_EDGES`, the corners, the candidate lists).
  - Index 1 makes the cube `internal_error`. The cause is the pre-existing `checkScene` read noted under Input Validation, and it fails closed.
  - The cube passes `stackedText` explicitly, so it is unaffected by SEC-001.
- **Built entry.** `dist/cube.js` and its three chunks (`chunk-5HEA3NMV.js`, `chunk-6VMTDWBP.js`, `chunk-Y2PFPJTB.js`) contain none of these (CC-003): `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.`, `eval`, `new Function`, dynamic `import()`, `require()`, `process.env`, storage, `document.cookie`, `innerHTML` or `dangerouslySetInnerHTML`. Their only external imports are `react` and `react/jsx-runtime`. `dist/` was built at 16:39 EDT, a minute after the delivery commit; this review did not build it.
- **Tests.** `npx vitest run --no-cache` passed 684 tests in 24 files, with no reruns needed. The run used a scratch config without the build step, since none of these files needs `dist/`. The files were:
  - `tests/layout/cube.test.ts`, `tests/core/cube.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts`, `tests/core/validate-envelope.test.ts`, `tests/core/validate-structure.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/react/Graph.test.tsx`;
  - `tests/layout/kit/*` (the timing test included);
  - the triangle's, square's and circle's layout tests.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean (see Configuration Security).

There are two findings, neither exploitable for confidentiality or code execution:
- **SEC-001 (Low):** `placeLabels` reads `request.stackedText` through the prototype. The square and the circle pass requests without that key, so a polluted `Object.prototype.stackedText` is drawn in place of their stacked labels. This is kit code from `e498f8f` (the triangle's CR-001 resolution), outside this delivery's diff. The cube is unaffected, but its layout depends on this function, and no security review has covered it before.
- **SEC-002 (Informational):** the cube's recorded size ceiling (552 / 12,047 / 15) and its pinned test use only `"` texts. The true text-alternative ceiling is 978 UTF-16 units. That is inside the test's `< 1,000` bound, with 22 units to spare, but the test cannot see it.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-006-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-004, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/cube.ts` (new: `Cube`, `CUBE_EDGE_MIN`, `CUBE_EDGE_LIMIT`, `cubeDisplay`, `defineCube`, `describe`)
- `src/layout/cube.ts` (new: `cubeLayout`, `DRAWN_EDGE`, `MODEL_EDGE`, `CUBE_EDGES`, `edgeCandidates`, `normalsOf`, `besidePoint`)
- `src/layout/kit/isometric.ts` (modified: `HIDDEN_DASH`)
- `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json` (registration and the `./cube` entry)
- `src/generated/schema.json`, `src/generated/tool-schema.json` (the cube's entries: `additionalProperties: false`, `minimum` 0.001 / `maximum` 1,000,000, `enum`, `maxLength` 200 / 20, `pattern` in `schema.json`), plus `src/generated/description.ts` and `src/generated/vocabulary.json` (regenerated)
- `examples/cube.json`, `examples/invalid/cube-negative-edge.json`, `.changeset/cube-graph.md`
- `tests/layout/cube.test.ts`, `tests/core/cube.test.ts` (new); `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts`, `tests/core/validate-envelope.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/layout/kit/figure-labels.ts` (`placeLabels`, `labelBlock`, `segmentNode`);
  - `src/layout/kit/measure.ts` (`measurementLabel`);
  - `src/layout/kit/check.ts` (`checkScene`);
  - `src/core/format.ts` (`cleanText`, `quoteText`, `stateMeasurement`, `formatSupplied`, `sourceOf`);
  - `src/core/definitions/figure.ts` (`unitProperty`), `src/core/definitions/types.ts` (`defineProperties`);
  - `src/core/describe.ts`, `src/react/createGraphComponent.tsx`, `src/graph.ts` (`createGraphWith`);
  - the built `dist/cube.js` and its chunks.

**Context read:**
- **The ticket** (`.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-006.md`) and its Known Hazards:
  - the definition contract;
  - `maxItems` (not applicable, since the cube has no array);
  - domain checks (none);
  - the rich example;
  - provenance;
  - the measurement-label rules;
  - caller-sized text (GSS TICKET-002 SEC-001..003);
  - caller-text limits and the at-limit and over-limit tests (GSV TICKET-007);
  - per-type bundles and the registration checklist;
  - GSS TICKET-001 CR-004 (coincident corners; hidden edges as obstacles);
  - GSS TICKET-001 SEC-002 (scale before projecting; test at the limit).

  Its Constraint is prd/TC-010.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004, TC-010). There is no `constraints/geometric-shapes-and-solids.md`.
- **`.gener8v/technical-design/system-design.md`** (AD-009, AD-011) and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **The earlier security reviews in this change,** chiefly GSS TICKET-001 (isometric kit), TICKET-002 (circle), TICKET-003 (square) and TICKET-005 (triangle). Settled risks are not raised again:
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost (here at most 3 labels against at most 12 edges);
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSS TICKET-002 SEC-003/SEC-004: quotation marks in a text alternative are not a boundary, and a short unit with quotes counts as unit-shaped;
  - caller colors are the caller's contrast choice;
  - blank-looking characters the plain-text policy allows;
  - the tool schema leaves out the plain-text `pattern`, and `validate` is the gate.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **Coverage.** Every cube term has a spec the validator enforces, mirrored in both schemas with `additionalProperties: false`:
  - `edgeLength`: required, 0.001..1,000,000;
  - `hiddenEdges`: `"dashed"`/`"omitted"`;
  - `labelEdges`: `"one"`/`"three"`;
  - `edgeLabelText`: at most 200, plain text;
  - `unit`: at most 20, the shared `unitProperty`;
  - the shared `title` and `lineColor`.

  Nothing can contradict custom text, so there are no domain checks (DEL-002) and no array terms.
- **Numeric robustness.** The caller's edge length is used only as text. The drawing is a fixed hexagon (`DRAWN_EDGE` 120), so its size and coordinates do not depend on any caller number. The Scene height is bounded by the title (3 lines), the fixed hexagon and at most 3 stacked labels of 4 lines: 595.2 units at most, measured. Every Scene number goes through `fmt()`. A layout throw would become one `internal_error` (`src/graph.ts:42-46`), and none occurred on any valid description.
- **Injection vectors.** There is no SQL, shell, file path, template or dynamic code. The only sinks are React's SVG text children, the escaped `aria-label` and `<title>`, `stroke` (the validated `lineColor`) and the constant `stroke-dasharray`. The markup probe found no gap.
- **Pre-existing, not raised again.** With `Array.prototype[1]` polluted, every figure Scene fails `checkScene` and `createGraph` returns `internal_error` (`src/layout/kit/check.ts:32`, `token.split(".")[1]`). The triangle's review noted this, it is kit code this delivery does not touch, and it fails closed.
- **Kit gap the cube depends on but does not trigger.** See SEC-001.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a rendering and validation library with no accounts, sessions, tokens or protected resources (`.gener8v/context.md`). The cube adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data handling.** The cube collects, stores and sends nothing (CC-003). The built entry and its chunks contain no network, storage or cookie API, and there is no logging.
- **Errors.** A layout throw or malformed Scene becomes one `internal_error` with a fixed message (`src/graph.ts:18`, `:42-46`). No exception text reaches the caller.
- **Text alternative.** It states caller text in full, quoted, which is intended (CC-002). It is at most 978 UTF-16 units at the limits. The edge length is stated as written, at most 21 characters (`0.0010000000000000002`).
- **CC-002.** Every cube has a text alternative. Hidden edges differ from visible ones by their dash, not by color (1.4.1).

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets.** There are no secrets, credentials, keys or environment reads in the delivered files.
- **Registration.**
  - The definition is built by `/* @__PURE__ */ defineCube()`, and its `properties` by `defineProperties` (frozen, null prototype).
  - `unitProperty` is the shared frozen spec.
  - The definition and layout tables stay frozen null-prototype records.
  - `<CubeGraph>` draws with only its own definition and layout (`createGraphComponent`).
  - `CUBE_EDGES` is a plain, unfrozen array, but no `package.json` export reaches `src/layout/cube.ts`, so a consumer cannot alter it. The same holds for `cubeDisplay`, which no entry exports.
- **Dependency audit:**
  - Run on 2026-10-29 at 20:42:22 UTC (16:42:22 EDT), from the repository root, with pnpm 10.28.2.
  - `pnpm audit`: exit 0, "No known vulnerabilities found".
  - `pnpm audit --prod`: exit 0, "No known vulnerabilities found".
  - `d3e998e` leaves `pnpm-lock.yaml` and every dependency list unchanged. Its only `package.json` change is the `./cube` entry in `exports`.

## Findings

### SEC-001: `placeLabels` reads `stackedText` through the prototype, so a polluted `Object.prototype.stackedText` replaces the square's and circle's stacked labels

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures (prototype pollution; defense in depth)
**Location:**
- `src/layout/kit/figure-labels.ts:133` (`placeLabels`): `unplaced.push(request.stackedText ?? request.text);`
- requests without an own `stackedText`: `src/layout/square.ts:100-102` and `src/layout/circle.ts:146`
- introduced by `e498f8f` ("Resolve graph-library GSS TICKET-005 code review"), not by `d3e998e`

**Description:** `LabelRequest.stackedText` is optional (`src/layout/kit/figure-labels.ts:105`), and `placeLabels` falls back with `??`. The square's and the circle's requests are plain object literals with no `stackedText`, so the read goes through `Object.prototype`. When one of their labels has no clear place and is stacked below the figure, an inherited `stackedText` is drawn instead of the label. The inherited value:
- skips the validator, so neither `CALLER_TEXT_LIMIT` nor the plain-text policy applies;
- is not cleaned, although `textLines` and React still escape it, and `labelBlock` still wraps it and cuts it to 4 lines.

The text alternative is unaffected. The project's pattern is to read kit inputs as own properties only: `checkScene` uses `Object.hasOwn(node, "text")`, as do `VISIBLE_FACES`, `sourceOf`, `propertySpec` and the triangle's SEC-001 fix. This read was added after the triangle's security review ran. That review rechecked `e498f8f` only for its SEC-001 and the size ceiling, so no security review has covered it.

The cube and the triangle pass `stackedText` on every request (`src/layout/cube.ts:199`; `src/layout/triangle.ts:289`, `:295`, `:302`), so they are unaffected. I checked the cube with 52 polluted keys, `stackedText` among them.

Probed on this branch, with `Object.defineProperty(Object.prototype, "stackedText", { value: … })`:
- `{ type: "square", sideLength: 3, labelSides: "all", sideLabelText: "W".repeat(200) }` draws the injected text below the square;
- `{ type: "circle", radius: 3, showRadius: true, showDiameter: true, labelRadius: true, labelDiameter: true, labelCircumference: true, …LabelText: "W".repeat(200) }` does the same below the circle;
- the text alternative is identical, and a 900,000-character value still draws at most 4 lines.

**Attack Scenario:** Not required for Low. The precondition is a separate prototype-pollution flaw in the host application, for example a deep merge fed attacker JSON with `__proto__.stackedText`. Given that, the attacker can put chosen text, up to 4 lines, below every square or circle whose label stacks. They cannot run script (React escapes it) or change the text alternative.
**Impact:** The integrity of the drawn figure for squares and circles whose labels stack, in a polluted runtime. There is no confidentiality, code-execution or output-size impact.
**Recommendation:** Read the field as an own property in the kit, so every figure is covered and later figures cannot reintroduce the gap:

```ts
unplaced.push(Object.hasOwn(request, "stackedText") && typeof request.stackedText === "string" ? request.stackedText : request.text);
```

Add a test that pollutes `Object.prototype.stackedText` and checks that a stacked square label is unchanged; the current read fails it. This is a one-line kit change outside the ticket's Output. It can be fixed in resolution with the approval recorded in the delivery record's Post-Review Amendments, or deferred to a kit ticket with a Known Hazard.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `placeLabels` reads `stackedText` own-key, and only a string replaces the label's text, so every figure — the circle and the square included — is covered. `tests/layout/kit/figure-labels.test.ts` pollutes `Object.prototype.stackedText` and checks a stacked label is unchanged; reading through the prototype fails it (mutation-checked). Scenes unchanged (a 1,208-Scene probe hashes identically).

---

### SEC-002: The cube's recorded and pinned size ceiling uses only `"` texts; the true text-alternative ceiling is 978 UTF-16 units, which the test cannot see

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (resource bounds; no exploitable path)
**Location:**
- `tests/react/Graph.test.tsx:908-925` ("keeps the cube's text alternative and markup bounded at its limits"): `toBeLessThan(1_000)` at `:919`, `toBeLessThan(20_000)` at `:921`;
- the delivery record's Notes ("a 552-character text alternative, 12,047 characters of markup and 15 `<text>` nodes").

**Description:** The pin feeds every text as 200 × `"` and the unit as 20 × `"`. Those are BMP characters, one UTF-16 unit each, so the text alternative is 552 units. The validator caps texts by code points, though, so astral text (emoji, mathematical letters) doubles the units. A unit with sentence punctuation also adds quotation marks.

Measured on this branch, with every text at its limit:

| Measure | Recorded / pinned input | True ceiling | Test bound |
|---------|------------------------|--------------|------------|
| Text alternative | 552 | 978 UTF-16 units (emoji title and label, unit 19 emoji + `.`, edge 0.0010000000000000002, hidden edges omitted, three labels) | < 1,000 |
| Markup | 12,047 | 13,640 characters (200 × `'`, three labels) | < 20,000 |
| `<text>` nodes | 15 | 15 | ≤ 15 |
| Drawing height | — | 595.2 units | none |

Every true ceiling is inside its bound today. The text alternative has only 22 units to spare, though, and the test's own input sits 448 units below the bound. A wording change that adds about 25 characters, such as a longer hidden-edge or label sentence, would take the real worst case past 1,000 while the test still passes. The recorded figure also understates the ceiling by about 77%. All of these values are orders of magnitude below the x,y graph's ceiling, so CPSE TICKET-007's premise is unaffected.
**Attack Scenario:** N/A (Informational)
**Impact:** None today. The risk is that the ceiling drifts unnoticed, and that the delivery record states a smaller one than callers can reach.
**Recommendation:**
1. Add the worst-case inputs to the pin: `title` and `edgeLabelText` as 200 emoji (for example `String.fromCodePoint(0x1f600).repeat(200)`), `unit` as 19 emoji + `"."`, `edgeLength: 0.0010000000000000002`, `hiddenEdges: "omitted"` and `labelEdges: "three"`. Keep the `"` and `'` cases for the markup.
2. Either keep `< 1,000` and note the measured 978, or raise the bound to about 1,100 with the measured value in the comment.
3. Optionally bound `scene.height` (under 650).
4. Record the true ceiling in the delivery record's Post-Review Amendments: 978 UTF-16 units of text alternative, 13,640 characters of markup, 15 `<text>` nodes, a height of 595.2.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The pin in `tests/react/Graph.test.tsx` now covers `"`, `'` and emoji texts (with a unit ending in "."), hidden edges dashed and omitted, and edge lengths with up to 17 significant digits (0.0010000000000000002); the text-alternative bound is 1,100 with the measured 978 in the comment, and the height is bounded under 650 (measured 595.2). True ceiling: 978 UTF-16 units of text alternative, 13,640 characters of markup, 15 `<text>` nodes.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Own-key `stackedText` read in the kit; polluted-prototype test | No | `src/layout/kit/figure-labels.ts`, `tests/layout/kit/figure-labels.test.ts` |
| SEC-002 | Fix | Worst-case inputs in the size pin; bound 1,100; height under 650 | No | `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 and SEC-002 fixed during resolution and recorded in the delivery record's Post-Review Amendments.
- **Verdict basis.** The cube adds no injection, confidentiality or code-execution path:
  - its geometry never reads a caller number, so nothing overflows at 1,000,000 or below 0.001;
  - every caller text is cleaned and wrapped with a line cap;
  - its own reads ignore polluted `Object.prototype` keys and `Array.prototype` indices (except the pre-existing, fail-closed `[1]`);
  - its output is bounded (978 / 13,640 / 15 / 595.2);
  - the dependency audit is clean.
- **SEC-001** is a one-line own-key read in the shared kit. It protects the square and the circle, not the cube, and it can be fixed here or deferred to a kit ticket.
- **SEC-002** adds the worst-case inputs to the cube's pinned ceiling and corrects the recorded figure.
