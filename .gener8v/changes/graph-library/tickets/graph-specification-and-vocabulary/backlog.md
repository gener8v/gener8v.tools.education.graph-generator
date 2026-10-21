# Graph Specification & Vocabulary — Backlog (graph-library)

## Overview

Six tickets cover all 45 requirements and 5 NFRs this change adds to Graph Specification & Vocabulary (GSV-REQ-001..045, GSV-NFR-001..005). They build the shared description core every other area depends on: the definition format and default style, issue codes, the staged validator (two tickets), the schema generator, and a closing completeness check. All are Must (the change brief puts everything under Must); sizes are 2 Small, 2 Medium and 2 Large. A seventh ticket, added 2026-10-21, covers GSV-REQ-052..054, the caller text limits the Product Owner decided under GSV OQ-009 (200 characters for titles and labels, 20 for a unit); it closes the length findings deferred by graph-library GSS TICKET-002 SEC-002 and rulers NLC TICKET-002 SEC-002 and TICKET-003 SEC-001. The area sits in Phase 1 of the dependency map, after the package foundation (graph-library/component-packaging-and-source-export/TICKET-001, DEP-001); TICKET-006 belongs to Phase 3 because it waits on every rendering area's type tickets (DEP-005).

## Source Context

**Specification:** Graph Specification & Vocabulary Specification (Approved) · **Constraints Analysis:** Curricular Graph Generator — Constraints Analysis, `constraints/prd.md` (Approved) · **Dependency Map:** Curricular Graph Generator — Dependency Map (Approved) · **Technical Design:** Curricular Graph Generator — Technical Design, `technical-design/system-design.md` (Approved)
**Change brief:** changes/graph-library/change.md (Priority Cut applied)

## Ticket Dependency Chain

```
TICKET-001 ──┬──→ TICKET-003 ──→ TICKET-004 ──┐
TICKET-002 ──┘         │                      ├──→ TICKET-006   (also waits on every type ticket, DEP-005)
TICKET-001 ────────────┴──→ TICKET-005 ───────┘
TICKET-003, TICKET-005 ──→ TICKET-007   (caller text limits, added 2026-10-21)
```

## Suggested Ordering

1. **TICKET-001** and **TICKET-002** — no in-area dependencies, can run in parallel once the package foundation exists. TICKET-001 sets the RES-001 contract, the highest-risk shared item (RD-001), so start it first.
2. **TICKET-003** — the structural validator; unblocks every type ticket in the rendering areas and the CPSE entry and tool tickets.
3. **TICKET-004** and **TICKET-005** — can run in parallel after TICKET-003. TICKET-004 is needed by the circle vertical slice (graph-library/geometric-shapes-and-solids/TICKET-002), which proves the contract; TICKET-005 is needed by the tool (graph-library/component-packaging-and-source-export/TICKET-007).
4. **TICKET-007** — ready now (TICKET-003 and TICKET-005 are delivered). Deliver it before more graph types land, so each new type's text terms get the limit from the start.
5. **TICKET-006** — last, after every graph type in NLC, DGP and GSS is delivered. It checks every type's terms, so it runs after TICKET-007 too.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Definition format, shared presentation properties and default style | Must | Medium | None | Ready |
| TICKET-002 | Issue codes and validation result types | Must | Small | None | Ready |
| TICKET-003 | Validator — envelope and structure stages with term suggestions | Must | Large | TICKET-001, TICKET-002 | Blocked |
| TICKET-004 | Validator — derivation and domain stages, normalization and provenance | Must | Medium | TICKET-003 | Blocked |
| TICKET-005 | Schema generator — published schema, strict tool schema, types and vocabulary | Must | Large | TICKET-001, TICKET-003 | Blocked |
| TICKET-006 | All-types completeness checks | Must | Small | TICKET-004, TICKET-005 | Blocked |
| TICKET-007 | Limit caller text: 200 characters for titles and labels, 20 for a unit | Must | Medium | TICKET-003, TICKET-005 | Ready (added 2026-10-21) |

**Total Tickets:** 7
**Ready to Start:** 2 (both Must; each also needs the cross-area package foundation first)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*
