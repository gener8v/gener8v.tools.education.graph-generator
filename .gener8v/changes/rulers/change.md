# Rulers

**Status:** Approved
**Approved by:** Product Owner — Thomas Eaves, 2026-10-19
**Opened:** 2026-10-19
**Slug:** rulers

## Why
Measuring length is a core strand of early-grade mathematics, and worksheets ask students to read a length off a ruler, including "broken ruler" questions where the object does not start at zero. The graph-library change covers number lines but no ruler, so authors still draw rulers by hand. Rulers share their marks and numbering with number lines, so they can follow soon after that work.

## Outcome
- A developer can render a ruler of a given length in centimetres (with millimetre and half-centimetre marks) or in inches (with half, quarter, eighth and sixteenth marks), from the same unified description and entry point as every other graph type
- An object can be drawn lying along a ruler from any start mark to any end mark, and its length reads correctly from the drawn ruler
- Rulers are validated like every other graph type: an object outside the ruler, a non-positive length or an unknown unit is reported with an actionable message
- Rulers have a component, an entry point, a text alternative, an example and documentation, like every other graph type

## Affected Capability Areas

| Area | Kind | Requirements |
|------|------|--------------|
| Number Lines & Coordinate Graphs | modifies | Adds NLC-REQ-040..056, NLC-NFR-005..008; Modifies NLC-REQ-001; Withdraws — |
| Graph Specification & Vocabulary | modifies | Adds GSV-REQ-046..051; Modifies GSV-REQ-003, GSV-REQ-040; Withdraws — |

## Priority Cut
- **Must:** centimetre rulers with millimetre and half-centimetre marks; inch rulers with half, quarter, eighth and sixteenth marks; an object lying along a ruler from any start mark to any end mark
- **Should:** none stated by the Product Owner
- **Could / later:** none stated by the Product Owner

## Out of Scope
- Rulers drawn at true physical size on screen or paper; a ruler is drawn to scale with itself
- One ruler showing both centimetres and inches; a worksheet that wants both shows two rulers
- Converting between metric and imperial units
- Other measuring tools: protractors, measuring tapes, weighing scales
- Student interaction, such as dragging the object or answering on the ruler
- Any change to the graph-library change's scope or tickets

## Open Questions
- [x] **OQ-001**: Is an inch ruler always marked to sixteenths, or can a description choose a coarser smallest division (halves, quarters, eighths) for younger grades? — Answered 2026-10-20: choosable (halves, quarters, eighths, sixteenths), sixteenths by default (NLC-REQ-046)
- [x] **OQ-002**: Can a measured object's ends fall between marks (for example, at 3.25 cm, for estimation questions), or must each end sit on a drawn mark? — Answered 2026-10-20: each end must be a drawn mark (NLC-REQ-053)
- [x] **OQ-003**: What does a measured object look like: a plain bar only, or a choice of simple pictures (a pencil, a crayon, a ribbon)? Pictures would reuse the pictograph image set (graph-library DGP OQ-001) — Answered 2026-10-20: a plain bar with an optional color and label (NLC-REQ-050, NLC-REQ-054)
- [x] **OQ-004**: Is the object's length ever written on the figure, or always left for the student to read? — Answered 2026-10-20: never written; the text alternative states the start and end marks (NLC-REQ-055, NLC-REQ-056)
- [ ] **OQ-005**: Does this change wait for graph-library to finish, or start once the number-line axis and tick foundation (graph-library NLC TICKET-001) is delivered?

## Change Log
- 2026-10-19 — opened (Planning)
- 2026-10-19 — approved by Product Owner (Planning)
- 2026-10-20 — NLC specification amended: adds NLC-REQ-040..056 and NLC-NFR-005..008, modifies NLC-REQ-001, withdraws none; OQ-001..004 answered by the Product Owner (Specification)
- 2026-10-20 — GSV specification amended: adds GSV-REQ-046..051, modifies GSV-REQ-003 and GSV-REQ-040, withdraws none (Specification)
