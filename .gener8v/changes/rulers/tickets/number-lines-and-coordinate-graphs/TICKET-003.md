# TICKET-003: Deliver the ruler: layout, component and entry point

**Change:** rulers
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Draw a validated ruler: its body, its graded marks and whole-unit numbers (TICKET-001's kit), and an optional object as a plain bar beside the marked edge from its start mark to its end mark, with its label and color and no length written. Wire it into the layout registry, a `<RulerGraph>` component and a `./ruler` entry point.
**Priority:** Must
**Value:** A curriculum developer can drop a centimetre or inch ruler, with an object to measure from any start mark, into a worksheet from one JSON description, including "broken ruler" questions.

**Requirements Covered:**
- NLC-REQ-040: Render a ruler from a unit and a whole-number length
- NLC-REQ-043: Every whole unit numbered from 0 to the length (drawn)
- NLC-REQ-044: A mark at every millimetre on a centimetre ruler (drawn)
- NLC-REQ-045: Half-centimetre and whole-centimetre marks progressively longer (drawn)
- NLC-REQ-047: A mark at every multiple of the smallest division on an inch ruler (drawn)
- NLC-REQ-048: Inch marks graded by fraction (drawn)
- NLC-REQ-050: The object drawn as a plain bar lying along the ruler, its ends aligned with its marks
- NLC-REQ-055: The object's length is never written on the figure

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Rulers requirements, Behaviors & Rules → Rulers (drawn to scale with itself, not at physical size; always starts at 0; the object beside the marked edge, carrying no number)
- Read: `.gener8v/technical-design/system-design.md` — AD-002, AD-007, AD-008 (no ids; accessible name through `aria-label` and `<title>`), AD-010 (label placement), AD-011 (presentation attributes, named colors, non-color cues), AD-014 (pure components, fallback)
- Read: TICKET-001 output at `src/core/ruler.ts` and `src/layout/kit/ruler.ts`, and TICKET-002 output at `src/core/definitions/ruler.ts`
- Read: `src/layout/registry.ts` (`Layout<D>`, `layout(normalized, provenance)`), `src/react/createGraphComponent.tsx`, `src/layout/kit/title.ts` (`titleBlock`), `src/layout/kit/labels.ts` (`placeLabel`), `src/layout/kit/text.ts` (`wrap`)
- Read: `src/layout/circle.ts`, `src/react/graphs/`, `src/entries/`, `package.json` `exports`, `.size-limit.json` — how a delivered type is laid out, wrapped as a component and given an entry point and a size budget

**Acceptance Criteria:**
- [ ] `examples/ruler.json` renders through `<RulerGraph>` and through `<Graph>` with identical markup, and through the `./ruler` entry point
- [ ] A centimetre ruler of length 15 draws 151 marks, three lengths of mark, and the numbers 0 to 15. An inch ruler of length 6 draws 97 marks at sixteenths, five lengths of mark, and the numbers 0 to 6. With a smallest division of a quarter it draws 25 marks and three lengths
- [ ] Every unit is drawn at the same length, and the ruler fills the fixed drawing width whatever its length (AD-007). It is drawn to scale with itself only
- [ ] The object is a filled bar beside the marked edge whose two ends lie within 0.5 units of its start and end marks' positions. An object starting at a mark other than 0 is drawn from that mark. Its color applies to the bar only, and its label (wrapped, cut to its line limit) is placed by `placeLabel` without hiding a number
- [ ] No text in the Scene states the object's length: the only numbers drawn are the whole-unit numbers
- [ ] A ruler with no object draws only the body, marks and numbers. The title, when given, is drawn with `titleBlock`
- [ ] The text alternative from TICKET-002's `describe` is the accessible name (`aria-label` and `<title>`)
- [ ] `./ruler` exists in `package.json` exports and in `.size-limit.json`, within its budget, and `pnpm check:dist`, `publint` and `attw` pass

**Output:**
- `src/layout/ruler.ts` — `layout(normalized, provenance) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/RulerGraph.tsx` — made with `createGraphComponent`
- `src/entries/ruler.ts`; `package.json` `exports["./ruler"]`; `.size-limit.json` entry
- `tests/layout/ruler.test.ts` — proves the mark-count, graded-length, numbering, equal-unit, object-alignment, no-length-text, no-object and title criteria (asserts on Scene data, no DOM)
- `tests/react/` or `tests/package/` additions — `<RulerGraph>` and `<Graph>` markup identical; the entry point resolves

**Constraints:**
- prd/TC-001, prd/TC-002, prd/TC-003: pure layout, `fmt()` on every number, no ids
- prd/TC-004, prd/TC-007: React 18 and 19 APIs only; a side-effect-free per-type entry
- prd/CC-002: text alternative (1.1.1), 3:1 contrast for the marks and the object (1.4.11), and the object not told apart by color alone (1.4.1)

**Known Hazards:**
- Never draw the object's length or a number for its ends (NLC-REQ-055, Product Owner decision 2026-10-20, `rulers` OQ-004). Its label is the caller's text only.
- The object sits beside the marks, not over them: the marks at its ends must stay readable. Keep the bar's ends exactly on the marks' positions (the same `linearScale`), not padded by a stroke width.
- The ruler is drawn to scale with itself, never at physical size (brief, Out of Scope). Do not convert units or try to make 1 cm measure 1 cm on screen.
- Since 301 marks exceed the axis kit's 100-tick bound, the layout uses TICKET-001's kit only, never `drawAxis` for marks (graph-library NLC TICKET-001 SEC-004).
- Carried from the graph-library hazards on every type (see `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md`): `layout(normalized, provenance)`, call the type's own `describe`, `titleBlock` for titles, `wrap` every label, and never spread a caller-sized array into function arguments.
- The documentation site (`graph-library/component-packaging-and-source-export/TICKET-008`, not yet delivered) promises a working example of every graph type. If it was delivered before this ticket, add the ruler to it here. If not, it picks the ruler up from the registry and `examples/ruler.json`. Record which in the delivery record.

**Depends On:** TICKET-001, TICKET-002
**Blocks:** TICKET-004

**Size:** Medium

**Notes:** Placement choices that the specification leaves open, such as the object above or below the ruler, the body's height and the number size, are delivery decisions (DEL-XXX). Base them on the default style.
