# TICKET-002: Build the Scene model and the shared rendering core

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Define the framework-neutral Scene (AD-002), the single rounding function (AD-007), the scale, text-width and label-placement helpers (AD-010), and the `SceneSvg` React component that prints a Scene as accessible, container-scaled SVG with no ids (AD-008).
**Priority:** Must
**Value:** Every graph type draws through one deterministic core, so server, browser and exported output can match and every graph is announced to assistive technology.

**Requirements Covered:**
- CPSE-REQ-011: Render on server and in browser with identical output, using no browser-only facilities during render
- CPSE-REQ-012: Accept a text alternative, defaulting to one generated from the description
- CPSE-REQ-013: Scale to container width while keeping proportions

**Prior Art:**
- Read: TICKET-001 output — `package.json`, `eslint.config.js` (boundary rule covers `src/layout`), `vitest.config.ts`
- Read: `.gener8v/technical-design/system-design.md` — AD-002 (Scene node kinds and ordered, pre-rounded attrs), AD-007 (400-unit space, `fmt()`), AD-008 (no ids, `role="img"`, `aria-label`, `<title>`), AD-010 (system font stack, width table × 1.1, label candidates), AD-011 (presentation attributes only); Component "Layout kit" and "React renderer"; Data Model "Scene and SceneNode"
- Read: `.gener8v/constraints/prd.md` — prd/TC-001, prd/TC-002, prd/TC-003, prd/TC-011, prd/RF-001, prd/RF-003
- Read: `.gener8v/dependencies/dependency-map.md` — RES-002, RES-005, RES-007

**Acceptance Criteria:**
- [ ] `src/layout/scene.ts` exports `Scene` (`width: 400`, `height`, `textAlternative`, `nodes`) and `SceneNode` (`kind` in line, polyline, polygon, path, circle, ellipse, rect, text, group, svg; ordered `attrs`; optional `children`, `text`)
- [ ] `fmt(n)` rounds to 2 decimal places and normalizes `-0` to `0`; `displayValue(n, supplied)` returns a supplied value as given and a derived value at the documented display precision; unit tests cover boundaries, negatives and `-0`
- [ ] `linearScale(domain, range)` maps values into the 400-unit space; `textWidth` estimates from a Helvetica/Arial per-character table × 1.1; `wrap` breaks on word boundaries at a maximum width; `placeLabel` returns the first candidate whose box overlaps no obstacle
- [ ] `SceneSvg` renders `<svg role="img" aria-label={textAlternative} viewBox="0 0 400 {height}" width="100%">` with a `<title>` first child and maps each node one-to-one to an SVG element with attributes in Scene order; it uses no hooks, state, effects, ids or `url(#…)`
- [ ] A caller-supplied text alternative replaces the Scene's generated one in `aria-label` and `<title>`
- [ ] `renderToString` of a sample Scene in Node.js with no browser globals equals the markup produced in a jsdom render (server/browser parity at unit level; full hydration is TICKET-004)
- [ ] A lint rule or test fails when a layout writes a raw number into Scene attrs without `fmt()`

**Output:**
- `src/layout/scene.ts` — Scene and SceneNode types (consumed by every layout, by TICKET-005's printer)
- `src/layout/kit/format.ts` — `fmt`, `displayValue`
- `src/layout/kit/scale.ts` — `linearScale`
- `src/layout/kit/text.ts` — `textWidth`, `wrap`, default font stack constant
- `src/layout/kit/labels.ts` — `placeLabel`
- `src/react/SceneSvg.tsx` — the Scene printer component (TICKET-005's JSX printer must mirror it exactly)
- `tests/layout/kit/format.test.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/kit/labels.test.ts` — kit criteria
- `tests/react/SceneSvg.test.tsx` — markup shape, accessible name, no ids, server/jsdom parity

**Constraints:** prd/TC-001 (no measuring), prd/TC-002 (round every emitted number), prd/TC-003 (resolved by having no ids, AD-008), prd/TC-011 (package wraps text), prd/CC-002 (text alternative on every graph)

**Known Hazards:**
- AD-008 supersedes any instinct to use `<marker>`, `<clipPath>`, `useId` or `aria-labelledby`: none may appear in a Scene or in `SceneSvg`. Arrowheads are polygons; partial images use a nested `svg` node.
- `SceneSvg` and TICKET-005's printer are a matched pair: attribute order and names must be identical or CPSE-NFR-001 fails. Keep the node-to-element mapping in one table that both can import.
- The 400-unit width is a contract (AD-007); downstream accuracy tests compute tolerances in those units.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-007 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-003: build `displayValue(n, supplied)` on `formatSupplied` and `formatDerived` from `src/core/format.ts`, not on a second rounding rule, so labels and text alternatives state the same numbers. AD-007's `fmt()` for drawing coordinates is separate.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-001: render every Scene string as a React text child or attribute value only, and assert that every string in `tests/fixtures/plain-text.ts` (`BENIGN_TEXT`, `HOSTILE_TEXT`) renders literally (GSV-REQ-043).

**Depends On:** TICKET-001
**Blocks:** TICKET-003, TICKET-005

**Size:** Medium

**Notes:** Dependency-map RES-002, RES-005 and RES-007 are delivered here. Graph-type tickets in the NLC, DGP and GSS areas (for example `graph-library/geometric-shapes-and-solids/TICKET-001`, `graph-library/number-lines-and-coordinate-graphs/TICKET-001`) build on these files.
