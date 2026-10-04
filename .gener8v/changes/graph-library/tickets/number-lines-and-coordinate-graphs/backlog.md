# Number Lines & Coordinate Graphs — Backlog (graph-library)

## Overview

Five tickets cover all 39 requirements and 4 NFRs this change adds for the area (NLC-REQ-001..039, NLC-NFR-001..004); all are Must, per the change brief. TICKET-001 builds the shared axis and tick foundation; the three graph types (number line, x,y graph, x,y,z graph) then proceed in parallel; TICKET-005 adds the measurable checks across all three. NLC-REQ-001, NLC-REQ-010 and NLC-REQ-012 are split across the three type tickets, each covering its own type. Every ticket also depends on cross-area work that the Depends On field cannot express: the CPSE Scene model, layout kit and component factory (component-packaging-and-source-export TICKET-002, TICKET-003) and the GSV definition format, issue codes and validator (graph-specification-and-vocabulary TICKET-001..004) — DEP-002 — and TICKET-004 additionally needs the GSS isometric kit (geometric-shapes-and-solids TICKET-001, RES-003).

## Source Context

**Specification:** Number Lines & Coordinate Graphs Specification · **Constraints Analysis:** Curricular Graph Generator — Constraints Analysis (`constraints/prd.md`) · **Dependency Map:** Curricular Graph Generator — Dependency Map · **Technical Design:** Curricular Graph Generator — Technical Design (`technical-design/system-design.md`)
**Change brief:** changes/graph-library/change.md (Priority Cut applied — everything Must)

## Ticket Dependency Chain

```
TICKET-001 ──→ TICKET-002 ──┐
           ├─→ TICKET-003 ──┼──→ TICKET-005
           └─→ TICKET-004 ──┘
                  ↑
   (cross-area: geometric-shapes-and-solids/TICKET-001 isometric kit)
```

## Suggested Ordering

1. **TICKET-001** — Foundational; every graph type in the area needs axes and ticks. Start as soon as the CPSE layout kit and GSV validator exist.
2. **TICKET-002** — Smallest graph type; establishes the point, label and `outside_axis_range` patterns the other two reuse.
3. **TICKET-003** — Can run in parallel with TICKET-002; the largest and riskiest ticket in the area (quadrants, axis placement, equal units), so start it early.
4. **TICKET-004** — Can run in parallel once the GSS isometric kit is delivered; blocked on that cross-area ticket, not on TICKET-002 or TICKET-003.
5. **TICKET-005** — Last; needs all three graph types to measure.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Build the axis and tick foundation shared by all three axis-based graph types | Must | Medium | None | Ready (after cross-area CPSE TICKET-002, GSV TICKET-001..003) |
| TICKET-002 | Deliver the number line graph type | Must | Medium | TICKET-001 | Blocked |
| TICKET-003 | Deliver the x,y coordinate graph type | Must | Large | TICKET-001 | Blocked |
| TICKET-004 | Deliver the x,y,z coordinate graph type | Must | Medium | TICKET-001 | Blocked |
| TICKET-005 | Verify accuracy, server rendering, accessibility and performance for all axis-based graphs | Must | Small | TICKET-002, TICKET-003, TICKET-004 | Blocked |

**Total Tickets:** 5
**Ready to Start:** 1

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*

## Open Questions Affecting Tickets

- Spec OQ-004 (turning off equal units) — TICKET-003 implements equal units only and records the gap; no property added
- Spec OQ-001, OQ-002 (fraction labels, inequality markers) — out of TICKET-002; custom tick labels cover fractions as text
- Spec OQ-006, OQ-007, OQ-008 (full lines, xyz segments, axis-break symbol) — not built
- Spec OQ-003 resolved by AD-009 (isometric)
