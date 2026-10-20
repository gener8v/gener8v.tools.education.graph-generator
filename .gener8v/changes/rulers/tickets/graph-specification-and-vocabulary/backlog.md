# Graph Specification & Vocabulary — Backlog (rulers)

## Overview

Two tickets cover this change's part of the shared vocabulary. TICKET-001 prepares the mechanism before the ruler definition exists:
- the type list;
- the measured object's shared label and color;
- fixed-list reporting;
- terms that apply only when another term has a given value.

TICKET-002 checks the published vocabulary, schema and types once the ruler definition (from Number Lines & Coordinate Graphs) is registered. Every in-scope requirement has a ticket: GSV-REQ-003 and GSV-REQ-040 (modified) and GSV-REQ-046..051 (added). All are Must under the brief's Priority Cut, and none is left out.

## Source Context

**Specification:** Graph Specification & Vocabulary Specification (amended by `rulers`, approved 2026-10-20) · **Constraints Analysis:** `.gener8v/constraints/prd.md` (no area-level analysis) · **Dependency Map:** `.gener8v/dependencies/dependency-map.md` (written for graph-library; DEP-002 and DEP-005 apply to the ruler as to every type) · **Technical Design:** `.gener8v/technical-design/system-design.md`
**Change brief:** changes/rulers/change.md (Priority Cut applied)

## Ticket Dependency Chain

```
TICKET-001 ──→ (rulers/number-lines-and-coordinate-graphs/TICKET-002, the ruler definition) ──→ TICKET-002
     └──────────────────────────────────────────────────────────────────────────────↗
```

Cross-area: TICKET-001 must be delivered before the ruler definition (`rulers/number-lines-and-coordinate-graphs/TICKET-002`), and TICKET-002 needs that definition registered. Neither link is on a `Depends On` line, because cross-area links are not. The tickets' Known Hazards say so.

## Suggested Ordering

1. **TICKET-001** — can start now, in parallel with `rulers/number-lines-and-coordinate-graphs/TICKET-001` (the mark rule); both must land before the ruler definition.
2. **TICKET-002** — after the ruler definition is registered; closes the vocabulary side of the change.

Across the change: NLC TICKET-001 and GSV TICKET-001 (in parallel) → NLC TICKET-002 → GSV TICKET-002 and NLC TICKET-003 (in parallel) → NLC TICKET-004.

## Backlog Summary

| Ticket | Title | Priority | Size | Depends On | Status |
|--------|-------|----------|------|------------|--------|
| TICKET-001 | Open the vocabulary to rulers: type list, object options, value lists and conditional terms | Must | Medium | None | Ready |
| TICKET-002 | Publish the ruler's vocabulary terms and schema | Must | Small | TICKET-001 | Blocked (and on the ruler definition, cross-area) |

**Total Tickets:** 2
**Ready to Start:** 1 (TICKET-001, Must)

*Status here is as of this breakdown. Live status (delivered, reviewed, done) is derived from delivery records and reviews into `.gener8v/pipeline-state.yaml`; this table is not updated as tickets progress.*

## Open Questions Affecting Tickets

- GSV OQ-002 (strict vocabulary) is assumed strict, so "centimetres" and "cm" are reported rather than accepted. A Product Owner decision to accept synonyms would change TICKET-001's enum handling.
- NLC OQ-009 (maximum lengths) changes only the limits stated in TICKET-002's published definitions, which come from the ruler definition's constants.
