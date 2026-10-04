# TICKET-001: Definition format, shared presentation properties and default style

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Create the in-house definition format every graph type is written in (AD-003), the definitions registry, the shared presentation properties, the default style with its named-color list and accessible palette, and the text-alternative dispatcher.
**Priority:** Must
**Value:** Every graph type has one place to declare its vocabulary, and every graph gets the same readable, accessible default look.

**Requirements Covered:**
- GSV-REQ-003: Exactly the eleven supported graph types (declared as the `GraphType` union; completed by TICKET-006)
- GSV-REQ-012: Fixed vocabulary; every property name is a vocabulary term
- GSV-REQ-040: Line color, line label, axis labels, title and point labels where they apply
- GSV-REQ-042: Colors as published named colors or hexadecimal codes
- GSV-REQ-043: Labels and titles as plain text, never markup
- GSV-REQ-044: One published default style applied when options are omitted
- GSV-REQ-045: A presentation option applies only to the element it names
- GSV-NFR-004: Every default-style color has ≥ 3:1 contrast against the default background — verified by an automated contrast check in CI

**Prior Art:**
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Vocabulary and Presentation Options subsections, Behaviors & Rules › Presentation
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (definition format), AD-005 (naming), AD-011 (presentation attributes, palette, series markers and dashes), Data Model › GraphTypeDefinition and PropertySpec
- Read: `.gener8v/constraints/prd.md` — prd/CC-002 (contrast, color not the only cue), prd/CC-001 (no bundled font)
- Read: `.gener8v/dependencies/dependency-map.md` — RES-001 (per-type definition contract), RES-004 (default style and palette)
- Read: graph-library/component-packaging-and-source-export/TICKET-001 output — `package.json`, `tsconfig.json`, `eslint.config.js` (import-boundary rule: `src/core` may not import React), `src/core/index.ts`

**Acceptance Criteria:**
- [ ] `GraphType` is a union of exactly `number-line`, `xy-graph`, `xyz-graph`, `line-graph`, `bar-graph`, `pictograph`, `circle`, `square`, `triangle`, `cube`, `cylinder`
- [ ] `GraphTypeDefinition` carries `type`, `title`, `description`, `properties`, `derivations`, `checks` and `describe`; `PropertySpec` carries `term`, `kind`, nested `items`/`properties`, `min`/`max`/`exclusiveMin`, `required`, `description` and `presentation`
- [ ] Property names in definitions are camel-cased vocabulary terms (AD-005); a unit test fails if any definition declares a property whose name is not a declared term
- [ ] `src/core/definitions/index.ts` exports a `definitions` registry keyed by `GraphType`, to which each type ticket adds its definition
- [ ] Shared presentation properties (`title`, `lineColor`, `lineLabel`, axis labels, point labels) are defined once in `shared.ts`, each declaring which graph types it applies to
- [ ] Label and title properties accept plain strings only; text is never interpreted as markup (React text nodes only, asserted by a test rendering `<b>x</b>` as literal text once a renderer exists — here, by the property kind `string` with no markup flag)
- [ ] `src/core/style.ts` exports the default style (colors, line widths, text sizes, font stack per AD-010), the named-color list (plain-English names → fixed hex values) and the default series palette with distinct point-marker shapes and dash patterns (AD-011)
- [ ] Style is expressed as values for SVG presentation attributes only — no CSS, class names or stylesheet
- [ ] Every color in the default style has a contrast ratio ≥ 3:1 against the default background, verified by `tests/core/style.test.ts` run in CI (GSV-NFR-004)
- [ ] `describe(normalized)` in `src/core/describe.ts` dispatches to the type's `describe` and provides shared helpers (number and list formatting)
- [ ] No file under `src/core/` imports React or a browser global (lint passes)

**Output:**
- `src/core/definitions/types.ts` — `GraphType`, `GraphTypeDefinition`, `PropertySpec`, `Derivation`, `DomainCheck` types consumed by every type ticket, TICKET-003, TICKET-004 and TICKET-005
- `src/core/definitions/shared.ts` — `sharedProperties` map
- `src/core/definitions/index.ts` — `definitions` registry (empty of types until type tickets register theirs)
- `src/core/style.ts` — `defaultStyle`, `namedColors`, `seriesStyles`
- `src/core/describe.ts` — `describe(normalized)` and formatting helpers
- `tests/core/style.test.ts` — contrast check (GSV-NFR-004), named-color and hex acceptance list
- `tests/core/definitions.test.ts` — term/property-name and registry shape checks

**Constraints:** prd/CC-002 (3:1 contrast, non-color cue between series); prd/CC-001 (system font stack, no bundled font); prd/TC-008 (no runtime schema-library dependency)

**Known Hazards:**
- RES-001 contract churn (RD-001): every rendering area builds on `GraphTypeDefinition`. Keep it minimal now and expect it to be adjusted once by the circle vertical slice (graph-library/geometric-shapes-and-solids/TICKET-002); after that slice lands, treat changes to the type as breaking for all type tickets and record them as a delivery decision.
- AD-005 supersedes GSV OQ-001: property names are camel case (`lineColor`), not phrases with spaces — implement camel case and do not leave the question open.
- Okabe–Ito yellow and some light hues fail 3:1 on white; adjust or drop those hues rather than relaxing the check (AD-011).

**Depends On:** None
**Blocks:** TICKET-003, TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessor: graph-library/component-packaging-and-source-export/TICKET-001 (package foundation, DEP-001) must exist first. Named-color list content is open (GSV OQ-006) — choose a short list of common names (black, gray, red, orange, green, blue, purple, brown) and record the choice in the delivery record.
