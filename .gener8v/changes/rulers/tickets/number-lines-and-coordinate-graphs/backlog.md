# Number Lines & Coordinate Graphs — Backlog (rulers)

## Overview

Four tickets deliver the ruler graph type. TICKET-001 sets the one mark rule (where marks fall, how long each is, whether a value is a mark) and the kit that draws graded marks. TICKET-002 defines and validates the type. TICKET-003 draws it and packages it. TICKET-004 adds the measurable checks. The chain is linear, because the definition's off-mark check and the drawing must share TICKET-001's rule. Every in-scope requirement has a ticket: NLC-REQ-001 (ruler part), NLC-REQ-040..056 and NLC-NFR-005..008. Every requirement is Must under the brief's Priority Cut, and none is left out.

## Source Context

**Specification:** Number Lines & Coordinate Graphs Specification (amended by `rulers`, approved 2026-10-20) · **Constraints Analysis:** `.gener8v/constraints/prd.md` (no area-level analysis) · **Dependency Map:** `.gener8v/dependencies/dependency-map.md` (written for graph-library; DEP-002, NLC needs GSV's mechanism, applies to the ruler too) · **Technical Design:** `.gener8v/technical-design/system-design.md`
**Change brief:** changes/rulers/change.md (Priority Cut applied)

## Ticket Dependency Chain

```
TICKET-001 ──→ TICKET-002 ──→ TICKET-003 ──→ TICKET-004
     └──────────────────────────↗
```

Cross-area: TICKET-002 needs the `rulers` Graph Specification & Vocabulary tickets (type list, shared object label and color, unit and division lists, the division applying only to inch rulers). Cross-change: everything builds on `graph-library/number-lines-and-coordinate-graphs/TICKET-001`, which is delivered and reviewed. TICKET-004 relates to the undelivered `graph-library/number-lines-and-coordinate-graphs/TICKET-005`, without depending on it.

## Suggested Ordering

1. **TICKET-001** — the riskiest arithmetic (decimal millimetres, graded ranks) and the rule both later tickets share. It can start now: its only predecessor, graph-library NLC TICKET-001, is done.
2. **TICKET-002** — after TICKET-001 and the `rulers` GSV tickets; gives validation and the text alternative before anything is drawn.
3. **TICKET-003** — the first demonstrable ruler.
4. **TICKET-004** — closes the change's NFRs.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Build the ruler mark rule and the graded-mark drawing kit | Must | Medium | None | Ready |
| TICKET-002 | Define the ruler graph type: terms, checks and text alternative | Must | Medium | TICKET-001 | Blocked |
| TICKET-003 | Deliver the ruler: layout, component and entry point | Must | Medium | TICKET-001, TICKET-002 | Blocked |
| TICKET-004 | Verify ruler accuracy, server rendering, accessibility and performance | Must | Small | TICKET-003 | Blocked |

**Total Tickets:** 4
**Ready to Start:** 1 (TICKET-001, Must)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*

## Open Questions Affecting Tickets

- NLC OQ-009 (are 30 cm and 12 in the right maximum lengths?) is unresolved. The maximums are named constants (TICKET-001), so a later decision is one edit plus its tests.
- Brief OQ-005 (whether rulers wait for graph-library) is unresolved. Nothing here depends on an undelivered graph-library ticket, so the rulers tickets can start now.
