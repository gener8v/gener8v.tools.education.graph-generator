# Number Lines & Coordinate Graphs — Backlog (graph-library)

## Overview

Eight tickets cover all 39 requirements and 4 NFRs this change adds for the area (NLC-REQ-001..039, NLC-NFR-001..004); all are Must, per the change brief. TICKET-006..008 were added on 2026-10-26 from the layout kit text and axis defect sweep (`.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`), one ticket per finding: DS-001 → TICKET-006, DS-002 → TICKET-007 (a Product Owner decision), DS-003 → TICKET-008. They add no requirement; each names the requirement its bug violates. TICKET-001 builds the shared axis and tick foundation; the three graph types (number line, x,y graph, x,y,z graph) then proceed in parallel; TICKET-005 adds the measurable checks across all three. NLC-REQ-001, NLC-REQ-010 and NLC-REQ-012 are split across the three type tickets, each covering its own type. Every ticket also depends on cross-area work that the Depends On field cannot express: the CPSE Scene model, layout kit and component factory (component-packaging-and-source-export TICKET-002, TICKET-003) and the GSV definition format, issue codes and validator (graph-specification-and-vocabulary TICKET-001..004) — DEP-002 — and TICKET-004 additionally needs the GSS isometric kit (geometric-shapes-and-solids TICKET-001, RES-003).

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

TICKET-006 ──→ TICKET-003   (sweep fix DS-001: tick label noise; also a predecessor of TICKET-004)
           └─→ TICKET-004
TICKET-007     (sweep fix DS-002: no dependencies, blocks nothing; TICKET-003 and TICKET-004 pick the rule up through the shared axis checks)
TICKET-008     (sweep fix DS-003: documentation, no dependencies, blocks nothing)
```

## Suggested Ordering

1. **TICKET-001** — Foundational; every graph type in the area needs axes and ticks. Start as soon as the CPSE layout kit and GSV validator exist.
2. **TICKET-002** — Smallest graph type; establishes the point, label and `outside_axis_range` patterns the other two reuse.
3. **TICKET-003** — Can run in parallel with TICKET-002; the largest and riskiest ticket in the area (quadrants, axis placement, equal units), so start it early.
4. **TICKET-004** — Can run in parallel once the GSS isometric kit is delivered; blocked on that cross-area ticket, not on TICKET-002 or TICKET-003.
5. **TICKET-005** — Last of the original five; needs all three graph types to measure.

Sweep fixes (2026-10-26):

- **TICKET-006** — Do before TICKET-003 and TICKET-004, which build the x,y and x,y,z graphs on the same tick rule. Small, no dependencies, so it can run now, in parallel with TICKET-001's successors.
- **TICKET-007** — Small, no dependencies; any time. Best before TICKET-003 and TICKET-004 are delivered, so their tests need no later change, but they do not wait for it.
- **TICKET-008** — Documentation only, no dependencies; the sweep says it can wait. Do it last, or when the ruler's documentation is next touched.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Build the axis and tick foundation shared by all three axis-based graph types | Must | Medium | None | Ready (after cross-area CPSE TICKET-002, GSV TICKET-001..003) |
| TICKET-002 | Deliver the number line graph type | Must | Medium | TICKET-001 | Blocked |
| TICKET-003 | Deliver the x,y coordinate graph type | Must | Large | TICKET-001, TICKET-006 | Blocked |
| TICKET-004 | Deliver the x,y,z coordinate graph type | Must | Medium | TICKET-001, TICKET-006 | Blocked |
| TICKET-005 | Verify accuracy, server rendering, accessibility and performance for all axis-based graphs | Must | Small | TICKET-002, TICKET-003, TICKET-004 | Blocked |
| TICKET-006 | Keep floating-point noise out of axis tick labels when the tick spacing is computed | Must | Small | None | Ready |
| TICKET-007 | Report a tick spacing that leaves fewer than two ticks in the axis range | Must | Small | None | Ready |
| TICKET-008 | Document the minimum shown width of a ruler for 3:1 mark contrast where `<Graph>` users read it | Must | Small | None | Ready |

**Total Tickets:** 8
**Ready to Start:** 3 (TICKET-006, TICKET-007, TICKET-008; TICKET-001 and TICKET-002 are already delivered)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*

## Open Questions Affecting Tickets

- Spec OQ-004 (turning off equal units) — TICKET-003 implements equal units only and records the gap; no property added
- Spec OQ-001, OQ-002 (fraction labels, inequality markers) — out of TICKET-002; custom tick labels cover fractions as text
- Spec OQ-006, OQ-007, OQ-008 (full lines, xyz segments, axis-break symbol) — not built
- Spec OQ-003 resolved by AD-009 (isometric)
- TICKET-007: the specification states no lower bound on the number of ticks (NLC-REQ-008 and NLC-REQ-009 set only the 100-tick and zero-or-negative bounds). The Product Owner decision of 2026-10-26 (Thomas Eaves) stands in; the specification needs a new requirement through the Specification skill
