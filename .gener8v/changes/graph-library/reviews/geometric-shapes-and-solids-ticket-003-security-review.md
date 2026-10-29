# TICKET-003: Square graph type — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-003` at HEAD of branch `ticket/graph-library-gss-003`, the delivery commit `2a5838e`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews.

The delivery adds the `square` type to `validate`, `normalize`, `describe` and `createGraph` (`./core`), to `<Graph>`, and to the new `<SquareGraph>` (`./square`). The caller controls one number (`sideLength`), one enum (`labelSides`), one boolean (`showRightAngles`), three texts (`title`, `sideLabelText`, `unit`) and a color (`lineColor`). There are no lists. The delivery also moves the circle's label placement into `src/layout/kit/figure-labels.ts`, and both figures now draw caller text through it.

Probed in memory, it holds up against injection, crashes, pollution and size:
- **Bounds.** `title` and `sideLabelText` are capped at 200 characters and `unit` at 20, by the validator and by both published schemas. Each over-limit text is refused as `too_large`. Hidden, control and direction characters are refused by the validator and by the `schema.json` pattern. `sideLength` is checked against 0.001 to 1,000,000, and `0`, `-1`, `5e-324`, `1e308` and the values just outside each end are all `out_of_range`. `"ALL"`, `"two"`, `"true"` and `"4"` are `wrong_kind`, and `null` is `wrong_kind` on the core path. Both schemas close the object (`additionalProperties: false`).
- **Unknown keys.** `onload`, `href`, `style`, `textAlternative`, `dangerouslySetInnerHTML`, `__proto__`, `constructor` and `side` are each refused as `unknown_property`. Hostile colors (`url(#a)`, `red;stroke:url(x)`, `#fff" onload="x`) are `unknown_color`.
- **Drawn text.** Every drawn caller text is cleaned and wrapped with a line cap:
  - the title through `titleBlock` (3 lines);
  - side labels through `measurementLabel` → `cleanText`, then `placeLabels` → `labelSize` → `textBlock` → `wrap` (4 lines).
  `textBlock` measures with a loop, so no caller-sized array is spread into arguments (GSS TICKET-002 SEC-001). Every number in the Scene goes through `fmt()`/`fmtPoints()`.
- **Text alternative.** `describe` states the side length with `stateMeasurement`, so a unit that is not unit-shaped is quoted (GSS TICKET-002 SEC-003). It quotes the title and custom text with `quoteText`, which neutralises lookalike closing quotes (SEC-004). A title that is blank after cleaning is left out, and blank custom text reads "left blank".
- **Markup.** 150 strings went through each of the three text terms: the shared benign, hostile and unsafe fixtures, tag-smuggled text, and ten markup and script payloads. 87 were accepted. The validator refused the other 63 (51 `wrong_kind` for forbidden characters, 12 `too_large`). Every accepted string rendered through `<SquareGraph>` and `<Graph>` (`renderToStaticMarkup`). The markup held only `svg`, `title`, `text`, `polygon` and `polyline` elements. A quote-aware parse found only the package's own attributes:
  - `aria-label`, `role`, `viewBox`, `width`;
  - `x`, `y`, `points`;
  - `fill`, `stroke`, `stroke-width`, `stroke-linejoin`;
  - `font-family`, `font-size`, `font-weight`, `text-anchor`.
  Caller text appears only as escaped text, and no unsafe character reached the markup or the text alternative.
- **Pollution.** I polluted `Object.prototype` with 21 keys and rendered four descriptions through `createGraph` and `<SquareGraph>`. The keys covered every square term, the provenance pointers `/sideLength` and `/labelSides`, and the internal field names `count`, `customText`, `text`, `candidates`, `top`/`left`/`bottom`/`right`, `textAlternative`, `nodes` and `kind`. The output hash was unchanged, whether the keys were enumerable or not. With enumerable keys, React logs unknown-prop warnings, but its markup is unchanged. That comes from React iterating props and is not specific to this delivery. `squareLabels` reads the frozen null-prototype normalized description, and `sourceOf` reads own keys only.
- **Fuzz.** I ran two fuzz passes through `createGraph`, with `checkScene` and a check of every `x`/`y`/`points` value:
  - **Mixed (seed 20261029).** 30,000 descriptions, 2,351 of them valid. There was no exception, no `internal_error`, no non-finite or off-drawing coordinate and no `NaN`/`Infinity`/`undefined` in a text alternative. The slowest took 1.9 ms.
  - **Valid only (seed 29102026).** 20,000 descriptions, with every text at its limit in wide (`W`) and wrapping forms. All were valid and none had a problem. At most 24 nodes, a 539-character text alternative, about 5.7 KB of markup and a 651-unit drawing height; the slowest took 1.1 ms. Its ceiling is far below the x,y graph's pinned ceiling, so CPSE TICKET-007's hazard ("the largest valid description is the x,y graph") still holds.
- **Built entry.** `dist/square.js` and its three chunks contain no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.`, `eval`, `new Function`, dynamic `import()`, `require()`, `process.env`, `localStorage`, `document.cookie`, `innerHTML` or `dangerouslySetInnerHTML` (CC-003).
- **Source export and tool.** `src/export/index.ts` and `src/tool/index.ts` are still empty entry points, so the square reaches neither.
- **Tests.** `npx vitest run --no-cache` over the nine files this delivery touches or relies on passed: 309 tests. The files were the square's core, layout and kit tests, the circle's layout test, `Graph`, `definitions`, `validate-structure`, `schema-agreement` and `per-type-bundle`.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean (see Configuration Security). The delivery leaves the lockfile and the dependency lists unchanged.

The one finding is a hardening gap with no runtime effect:
- **SEC-001 (Informational):** the new shared `unit` spec (`unitProperty`) is a mutable object with a prototype. The circle and the square each get their own frozen copy of it, not one shared spec. The obvious fix, `Object.freeze`, would make it worse.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-003-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-004, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/figure.ts` (new: `unitProperty`)
- `src/core/definitions/square.ts` (new: `Square`, `SideLabels`, `squareLabels`, `square`, `defineSquare` and its `describe`)
- `src/layout/kit/figure-labels.ts` (new: `GAP`, `LABEL_MAX_WIDTH`, `LABEL_MAX_LINES`, `labelSize`, `besideHorizontal`, `besideVertical`, `segmentNode`, `Bounds`, `LabelRequest`, `placeLabels`)
- `src/layout/square.ts` (new: `squareLayout`, `DRAWN_SIDE`, `RIGHT_ANGLE_MARK`)
- `src/core/definitions/circle.ts`, `src/layout/circle.ts` (modified: `unitProperty`; label placement moved to the kit)
- `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json` (registration and the `./square` entry)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (regenerated; the square's `additionalProperties`, `maxLength`, `pattern`, `minimum`/`maximum` and `enum` checked in both schemas)
- `examples/square.json`, `examples/invalid/square-zero-side.json`, `.changeset/square-graph.md` (new)
- `tests/core/square.test.ts`, `tests/layout/square.test.ts`, `tests/layout/kit/figure-labels.test.ts` (new); `tests/core/definitions.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/describe.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/format.ts` (`cleanText`, `quoteText`, `stateMeasurement`, `isUnitShaped`, `sourceOf`, the plain-text policy);
  - `src/layout/kit/measure.ts` (`measurementLabel`);
  - `src/layout/kit/title.ts` (`textLines`, `textBlock`, `titleBlock`);
  - `src/core/definitions/types.ts` (`defineProperties`, `withoutPrototype`, `deepFreeze`);
  - `src/core/definitions/shared.ts` (`CALLER_TEXT_LIMIT`, `UNIT_TEXT_LIMIT`, `title`, `lineColor`);
  - the built `dist/square.js`, `dist/chunk-IHD5W2IN.js`, `dist/chunk-EM5FLTKJ.js` and `dist/chunk-HMT27OYW.js`.

**Context read:**
- **The ticket** (`.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-003.md`) and its Known Hazards: the definition contract (RES-001), `maxItems`, domain checks, caller-sized text (GSS TICKET-002 SEC-001..003), caller-text limits (GSV TICKET-007) and per-type bundles. Its Constraints are prd/TC-001, prd/TC-011 and prd/CC-002.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). There is no `constraints/geometric-shapes-and-solids.md`.
- **`.gener8v/technical-design/system-design.md`** and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **CPSE TICKET-007's Known Hazards** (`.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md`), for the tool `summary` cap and the largest-description ceiling.
- **The earlier security reviews in this change,** chiefly GSS TICKET-002's (the circle). Their accepted or settled risks are not raised again:
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost (the square places at most four labels against at most 12 obstacles);
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSS TICKET-002 SEC-004: quotation marks in a text alternative are not a boundary;
  - GSS TICKET-002 and DGP TICKET-003: caller colors are the caller's contrast choice;
  - DGP TICKET-001 and GSV TICKET-007: blank-looking characters the plain-text policy allows, such as the Hangul fillers U+3164 and U+FFA0.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **Coverage.** Every square term has a spec the validator enforces, mirrored in `schema.json` and `tool-schema.json`:
  - `sideLength`: number, 0.001 to 1,000,000;
  - `labelSides`: enum, `"one"` or `"all"`;
  - `sideLabelText`: string, at most `CALLER_TEXT_LIMIT`;
  - `showRightAngles`: boolean;
  - `unit`: string, at most `UNIT_TEXT_LIMIT`;
  - the shared `title` and `lineColor`, added through `appliesTo`.
- **Schemas.** The tool schema leaves out the plain-text `pattern`, as it does for every type (GSV TICKET-005 DEL-007, CPSE TICKET-007 hazard), and `validate` stays the gate.
- **Domain checks.** The square has none, and needs none: custom text cannot contradict a single value (DEL-001).
- **Numbers.** `sideLength` never reaches a coordinate: the square is always drawn at `DRAWN_SIDE` (200), so an extreme valid value cannot overflow the layout. Values appear only as text, through `formatSupplied`/`formatDerived` (`measurementLabel`, `stateMeasurement`).
- **Injection vectors.** There is no SQL, shell, file path, template or dynamic code. The only sink is React's SVG rendering. Caller text reaches it as escaped text children and as the escaped `aria-label`/`<title>`. Caller color reaches it as the `stroke` attribute, after the color pattern, and React escapes attribute values as well.
- **Probes.** The 150-string markup probe, the unknown-key probe and the 50,000-description fuzz found no gap (see Summary).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a client- and server-side rendering library with no accounts, sessions, tokens or protected resources (`.gener8v/context.md`). The square adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data handling.** The square collects, stores and sends nothing (CC-003). The built entry and its chunks contain no network, storage or cookie API.
- **Logging.** There is none.
- **Errors.** Issues use fixed messages built by `createIssue`. The square adds no exception path; every fuzzed input returned a result or issues, never a throw.
- **Text alternative.** It states caller text in full, which is intended (CC-002). At the limits it is 539 characters at most.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets.** There are no secrets, credentials, keys or environment reads in the delivered files.
- **Registration.** The definition and layout tables use `satisfies` and are frozen with a null prototype. The square's definition is built by a side-effect-free factory (`/* @__PURE__ */ defineSquare()`), so other entries drop it. Its `properties` map comes from `defineProperties`, frozen with a null prototype.
- **Shared spec.** `src/core/definitions/figure.ts` is the one exception to that pattern (SEC-001).
- **Dependency audit:**
  - Run on 2026-10-29 at 16:15:40 UTC (12:15:40 EDT), from the repository root, with pnpm 10.28.2.
  - `pnpm audit`: exit 0, "No known vulnerabilities found".
  - `pnpm audit --prod`: exit 0, "No known vulnerabilities found".
  - `2a5838e` changes neither `pnpm-lock.yaml` nor any dependency list. Its only `package.json` change is the `./square` entry in `exports`.
- **Rebuilt `dist/`.** Running `tests/package/per-type-bundle.test.ts` rebuilt `dist/`, which is gitignored. No tracked file changed.

## Findings

### SEC-001: The shared `unit` spec is mutable and has a prototype, so each figure gets its own copy, and the obvious fix would weaken it

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** A02:2025 Security Misconfiguration (defense in depth; no exploitable path)
**Location:** `src/core/definitions/figure.ts:9-15` (`unitProperty`); used at `src/core/definitions/circle.ts:133` and `src/core/definitions/square.ts:93`; copied by `src/core/definitions/types.ts:193-201` (`withoutPrototype`)
**Description:** DEL-002 makes `unitProperty` "the one definition of the `unit` term", shared by the circle and the square (and, per the delivery's Notes, the cube and cylinder). It is a plain `as const` object literal. That leaves it unfrozen, with `Object.prototype` as its prototype.

`defineProperties` keeps an already-frozen spec as the same object (`withoutPrototype`, `types.ts:188-201`: "shared specs stay the same object wherever they are used"). An unfrozen one it copies onto a null prototype and freezes. Probed after load:
- `Object.isFrozen(unitProperty)` is `false`;
- `definitions.circle.properties.unit !== definitions.square.properties.unit`;
- neither copy is `unitProperty`;
- both copies are frozen with a null prototype.

So at runtime:
- the vocabulary holds one *text* for `unit`, not one spec object;
- the exported module binding stays mutable.

Mutating `unitProperty.maxLength` after load changed nothing: a 21-character unit was still `too_large`. The module is not reachable from any `package.json` export, so only package code could touch it. This is a gap against RES-001's "frozen all the way down" pattern, not a vulnerability.

The obvious fix makes it worse. `export const unitProperty = Object.freeze({ … })` would make `withoutPrototype` keep the object *as is*, prototype included. Every type's `unit` spec would then inherit from `Object.prototype`. Spec fields the validator reads without `Object.hasOwn` (for example `spec.maxLength` at `src/core/validate/structure.ts:128`, and `spec.min`/`spec.max` at `src/core/validate/derive.ts:72-78`) could then come from a polluted prototype when the spec does not set them itself. The null-prototype rule exists to prevent exactly that.
**Attack Scenario:** N/A (Informational)
**Impact:** None today: the registries hold frozen, null-prototype copies, and the probe shows a later mutation has no effect. The risks are two:
- A later change makes the spec frozen but keeps its prototype, and spec reads become pollution-sensitive for every figure that shares it.
- A later change reads `unitProperty` directly instead of through `propertiesOf`, and gets a mutable object.

**Recommendation:** Build the shared spec with the same helper as every other shared spec, so it is frozen and prototype-free before any definition uses it, and is then shared by identity:

```ts
// src/core/definitions/figure.ts
const figureTerms = defineProperties({
  unit: { term: "unit", kind: "string", required: false, maxLength: UNIT_TEXT_LIMIT, description: `…` },
});
export const unitProperty = figureTerms.unit;
```

Then add an identity assertion to `tests/core/definitions.test.ts`:
- `expect(definitions.square.properties.unit).toBe(definitions.circle.properties.unit)`;
- `expect(Object.getPrototypeOf(unitProperty)).toBeNull()`.

Do not use a bare `Object.freeze` on the literal.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed as recommended (Engineer — Thomas Eaves, 2026-10-29). `src/core/definitions/figure.ts` builds the term with `/* @__PURE__ */ defineProperties({ unit: … })` and exports `unitProperty = figureTerms.unit`, so it is frozen with a null prototype before any definition uses it and `withoutPrototype` keeps it by identity. `tests/core/definitions.test.ts` asserts the square's and the circle's `unit` are the same object as `unitProperty`, frozen, with a null prototype; a spread copy of `unitProperty` fails it (mutation-checked). Bundle sizes unchanged (`./square` 16.51 kB, `./circle` 16.85 kB); the per-type bundle tests pass. Full verification loop re-run, all exit 0.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | `unitProperty` built by `defineProperties` (pure), shared by identity; identity and null-prototype assertions added | No | `src/core/definitions/figure.ts`, `tests/core/definitions.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 fixed during resolution and recorded in the delivery record's Post-Review Amendments. Findings-phase notes:
- **Verdict.** The square adds no exploitable path. Its inputs are bounded and closed, its drawn text is cleaned and capped, its text alternative quotes caller text, and it resisted the markup, pollution and fuzz probes. The dependency audit is clean.
- **SEC-001.** It is a hardening note with no runtime effect. If it is fixed, use `defineProperties`, not `Object.freeze`, and since the cube (TICKET-006) and cylinder (TICKET-007) are expected to reuse `unitProperty`, fixing it before them keeps one shared, prototype-free spec.
