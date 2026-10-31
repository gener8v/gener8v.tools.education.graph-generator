# Geometric Shapes & Solids — Backlog (graph-library)

## Overview

Eight tickets cover every requirement and NFR the `graph-library` change adds for this area (GSS-REQ-001..036, GSS-NFR-001..004); all are Must per the change brief's Priority Cut, so nothing is deferred. The work forms three short chains: the circle (the change's vertical slice) leads the 2D figures, the triangle solver leads triangle layout, and the isometric kit leads the two solids; a final verification ticket closes proportions, label overlap and text alternatives across all figures. Every ticket also depends on cross-area foundation work — the package and rendering core (component-packaging-and-source-export TICKET-001..003) and the description core (graph-specification-and-vocabulary TICKET-001..004), per DEP-001 and DEP-004 — expressed in each ticket's Prior Art rather than its Depends On line.

## Source Context

**Specification:** Geometric Shapes & Solids Specification · **Constraints Analysis:** Curricular Graph Generator — Constraints Analysis (prd) · **Dependency Map:** Curricular Graph Generator — Dependency Map · **Technical Design:** Curricular Graph Generator — Technical Design (system-design)
**Change brief:** changes/graph-library/change.md (Priority Cut applied)

**Added 2026-10-31:** TICKET-009 removes the one cross-engine residual accepted under AD-007 in graph-library/component-packaging-and-source-export-ticket-004-code-review/CR-002: a three-sides triangle's third vertex is placed from the sides, not with trigonometry (amends TR-008).

## Ticket Dependency Chain

```
TICKET-002 (circle) ──┬──→ TICKET-003 (square) ─────────────────┐
                      ├──→ TICKET-005 (triangle layout) ────────┤
TICKET-004 (solver) ──┘                                         ├──→ TICKET-008 (checks)
TICKET-001 (isometric) ──┬──→ TICKET-006 (cube) ────────────────┤
TICKET-002 ──────────────┴──→ TICKET-007 (cylinder) ────────────┘
```

Cross-area: all tickets wait on component-packaging-and-source-export TICKET-001..003 and graph-specification-and-vocabulary TICKET-001..004; TICKET-001's output is also consumed by number-lines-and-coordinate-graphs TICKET-004.

## Suggested Ordering

1. **TICKET-002** — the vertical slice (TQ-008): proves the definition contract (RES-001), layout registry and measurement labels on one type before everything else copies the pattern. Highest risk to the rest of the change, so first.
2. **TICKET-004** and **TICKET-001** — no in-area dependencies, can run in parallel with TICKET-002. The solver is the largest and most numerically risky piece (TR-008) and sits on the critical path; the isometric kit unblocks both solids and the x,y,z graph in another area.
3. **TICKET-003** — small, follows the circle pattern immediately.
4. **TICKET-005**, **TICKET-006**, **TICKET-007** — in parallel once their predecessors land.
5. **TICKET-008** — last; verifies every figure together.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Isometric projection kit | Must | Small | None | Ready |
| TICKET-002 | Circle graph type (vertical slice) | Must | Medium | None | Ready |
| TICKET-003 | Square graph type | Must | Small | TICKET-002 | Blocked |
| TICKET-004 | Triangle definition and solver | Must | Large | None | Ready |
| TICKET-005 | Triangle layout and labels | Must | Medium | TICKET-004, TICKET-002 | Blocked |
| TICKET-006 | Cube graph type | Must | Medium | TICKET-001, TICKET-002 | Blocked |
| TICKET-007 | Cylinder graph type | Must | Medium | TICKET-001, TICKET-002 | Blocked |
| TICKET-008 | Proportion, label-overlap and text-alternative checks across figures | Must | Small | TICKET-003, TICKET-005, TICKET-006, TICKET-007 | Blocked |
| TICKET-009 | Build a three-sides triangle's third vertex without trigonometry | Must | Small | TICKET-004, TICKET-005 | Ready |

**Total Tickets:** 9
**Ready to Start:** 3 (in-area; all wait on cross-area foundation tickets first)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*
