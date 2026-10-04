# Data Graphs & Pictographs — Backlog (graph-library)

## Overview

Six tickets decomposed from DGP-REQ-001..037 and DGP-NFR-001..005, all Must per the change brief's Priority Cut. A shared categories-and-scale foundation (TICKET-001) unblocks the three graph types; the image set (TICKET-004) is independent and unblocks the pictograph; a final verification ticket (TICKET-006) proves accuracy and text alternatives across all three types. Every in-scope requirement and NFR is covered; DGP-REQ-004 is delivered per type in TICKET-002, TICKET-003 and TICKET-005 and proved in TICKET-006. All six tickets also wait on cross-area predecessors (DEP-003): graph-library/component-packaging-and-source-export/TICKET-001..003 and graph-library/graph-specification-and-vocabulary/TICKET-001..004.

## Source Context

**Specification:** Data Graphs & Pictographs Specification · **Constraints Analysis:** Curricular Graph Generator — Constraints Analysis (`constraints/prd.md`) · **Dependency Map:** Curricular Graph Generator — Dependency Map · **Technical Design:** Curricular Graph Generator — Technical Design (`technical-design/system-design.md`)
**Change brief:** changes/graph-library/change.md (Priority Cut applied)

## Ticket Dependency Chain

```
TICKET-001 ──┬──→ TICKET-002 ──────────────┐
             ├──→ TICKET-003 ──────────────┼──→ TICKET-006
             └──→ TICKET-005 ──────────────┘
TICKET-004 ──────→ TICKET-005
```

## Suggested Ordering

1. **TICKET-001** and **TICKET-004** — no in-area dependencies; start in parallel. TICKET-004 carries the content risk (EXT-001, RD-002: images must be drawn in-house and approved), so start it early.
2. **TICKET-003** — bar graph; simplest consumer of the foundation, proves proportional drawing first.
3. **TICKET-002** — line graph; adds series, legend and the non-color cues required by prd/CC-002.
4. **TICKET-005** — pictograph; needs both the foundation and the image set, and is the likeliest to strain the bundle budget (TR-004).
5. **TICKET-006** — accuracy and text-alternative suites across all three types.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Categories and value scale foundation | Must | Medium | None | Ready |
| TICKET-002 | Line graph | Must | Medium | TICKET-001 | Blocked |
| TICKET-003 | Bar graph | Must | Medium | TICKET-001 | Blocked |
| TICKET-004 | Published image set | Must | Medium | None | Ready |
| TICKET-005 | Pictograph | Must | Medium | TICKET-001, TICKET-004 | Blocked |
| TICKET-006 | Accuracy and text-alternative checks | Must | Small | TICKET-002, TICKET-003, TICKET-005 | Blocked |

**Total Tickets:** 6
**Ready to Start:** 2 (in this area; both also need the cross-area foundation tickets delivered first)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*
