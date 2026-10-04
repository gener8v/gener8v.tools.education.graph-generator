# Component Packaging & Source Export — Backlog (graph-library)

## Overview

Nine tickets covering all 46 CPSE requirements and 8 NFRs added by the `graph-library` change, every one at Must. The area sits at both ends of the change (dependency map DEP-001, DEP-006..008): TICKET-001 is the package foundation that every ticket in every area builds on; TICKET-002 delivers the shared Scene and rendering core used by all graph types; TICKET-003..008 add the entry component, cross-environment checks, source export, the export command, the model tool and documentation; TICKET-009 is the release pipeline. Cross-area predecessors (the GSV validator and schema generator, and each graph type's example) are named in each ticket's Prior Art and Notes rather than in Depends On. Nothing is deferred by the Priority Cut.

## Source Context

**Specification:** Component Packaging & Source Export Specification · **Constraints Analysis:** Curricular Graph Generator — Constraints Analysis (constraints/prd.md) · **Dependency Map:** Curricular Graph Generator — Dependency Map · **Technical Design:** Curricular Graph Generator — Technical Design (system-design.md)
**Change brief:** changes/graph-library/change.md (Priority Cut applied)

## Ticket Dependency Chain

```
TICKET-001 ──→ TICKET-002 ──→ TICKET-003 ──→ TICKET-004
     │                │              ├──→ TICKET-008
     │                └──────────────┴──→ TICKET-005 ──→ TICKET-006
     ├──→ TICKET-007   (also needs GSV TICKET-003..005)
     └──→ TICKET-009

Cross-area: GSV TICKET-003/004 (validator) → TICKET-003, TICKET-007
            GSV TICKET-005 (schema generator) → TICKET-007, TICKET-008
            each graph type's examples/<type>.json → TICKET-004, TICKET-005, TICKET-008 (completion)
```

## Suggested Ordering

1. **TICKET-001** — Phase 0 foundation; blocks every ticket in every area of the change (DEP-001).
2. **TICKET-002** — Phase 1 shared rendering core (RES-002, RES-005, RES-007); every graph-type ticket in NLC, DGP and GSS builds on it. Run alongside GSV TICKET-001..004.
3. **TICKET-009** — Small, depends only on TICKET-001; doing it early surfaces the npm name and organization question (TQ-001, RD-005) while there is time to resolve it.
4. **TICKET-003** — once the GSV validator exists; unblocks the circle vertical slice (TQ-008).
5. **TICKET-007** — once GSV TICKET-005 exists; independent of renderers, and its provider re-verification (TQ-002) is the highest external risk in this area (RD-003, TR-001).
6. **TICKET-005**, then **TICKET-006** — prove export equality on the circle as soon as it lands.
7. **TICKET-008** and **TICKET-004** — build early, then close in Phase 3 once all eleven graph types have examples.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Set up the package foundation and public repository | Must | Medium | None | Ready |
| TICKET-002 | Build the Scene model and the shared rendering core | Must | Medium | TICKET-001 | Blocked |
| TICKET-003 | Provide the entry component, entry function, per-type component factory and fallback | Must | Medium | TICKET-002 | Blocked |
| TICKET-004 | Add cross-environment rendering, install and bundle-size checks | Must | Medium | TICKET-003 | Blocked |
| TICKET-005 | Export a description as a standalone React component source file | Must | Medium | TICKET-002, TICKET-003 | Blocked |
| TICKET-006 | Add the graph-generator export command | Must | Small | TICKET-005 | Blocked |
| TICKET-007 | Provide the model tool definition and the never-throwing tool handler | Must | Medium | TICKET-001 | Blocked |
| TICKET-008 | Publish the documentation site with a working example of every graph type | Must | Medium | TICKET-003 | Blocked |
| TICKET-009 | Set up the release pipeline with provenance and the versioning policy | Must | Small | TICKET-001 | Blocked |

**Total Tickets:** 9
**Ready to Start:** 1

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*
