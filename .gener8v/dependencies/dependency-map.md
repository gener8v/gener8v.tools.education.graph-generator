# Curricular Graph Generator — Dependency Map

## Overview

Five capability areas form a hub-and-spoke shape around Graph Specification & Vocabulary. The three rendering areas (Number Lines & Coordinate Graphs, Data Graphs & Pictographs, Geometric Shapes & Solids) hard-depend on its description and validation mechanism and are independent of one another, so they can run in parallel. Component Packaging & Source Export appears at both ends: its package foundation (repository, build, entry-point layout, CI) comes before everything, and its entry component, source export, model tool and documentation come after the renderers. One soft cycle exists — the published schema cannot be complete until every rendering area has contributed its parameters — and it is resolved by a shared per-type definition contract (RES-001) rather than by ordering. The critical path runs through the package foundation, the description core, the slowest rendering area and source export.

## Source Context

**Analyzed Documents:** Curricular Graph Generator PRD; specifications for all five capability areas (Approved); PRD-level constraints `constraints/prd.md` (Approved); system context `.gener8v/context.md`
**Capability Areas:** Graph Specification & Vocabulary (GSV), Number Lines & Coordinate Graphs (NLC), Data Graphs & Pictographs (DGP), Geometric Shapes & Solids (GSS), Component Packaging & Source Export (CPSE)
**Status:** Approved
**Approved by:** Architect — Thomas, 2026-10-04

## Internal Dependencies

### All areas → Component Packaging & Source Export (package foundation)

- **DEP-001**: Every area needs the package foundation in place before any code can be delivered: repository, build producing ES modules with per-type entry points, separate non-rendering entry points, type declarations, test runner, and the CI matrix
  - *Type:* Hard
  - *Nature:* Infrastructure
  - *Detail:* CPSE-REQ-001..006 and CPSE-REQ-037..040; prd/TC-005, prd/TC-007, prd/OC-004. Only this slice of CPSE is needed first; the rest of the area comes last (DEP-006..008). Splitting CPSE across phases is what keeps it from forming a cycle with the other areas

### Number Lines & Coordinate Graphs → Graph Specification & Vocabulary

- **DEP-002**: NLC needs the single definition mechanism, validation pipeline, issue reporting, presentation options and default style before its graph types can be defined, validated or rendered
  - *Type:* Hard
  - *Nature:* Behavior / Shared Resource
  - *Detail:* NLC-REQ-001 defines its parameters inside GSV-REQ-015's single definition; NLC-REQ-008..010, NLC-REQ-020 and NLC-REQ-033 report through GSV-REQ-027..034; NLC-REQ-011, NLC-REQ-030 and NLC-REQ-031 rely on GSV-REQ-040..045

### Data Graphs & Pictographs → Graph Specification & Vocabulary

- **DEP-003**: DGP needs the same mechanism, validation, issue reporting, presentation options and default style; its pictograph image names must enter the vocabulary and schema
  - *Type:* Hard
  - *Nature:* Behavior / Shared Resource
  - *Detail:* DGP-REQ-007, DGP-REQ-008, DGP-REQ-016, DGP-REQ-021, DGP-REQ-029..031 report through GSV-REQ-027..034; DGP-REQ-014 uses the default style (GSV-REQ-044); DGP-REQ-035 lists image names in the vocabulary and schema (GSV-REQ-013, GSV-REQ-007)

### Geometric Shapes & Solids → Graph Specification & Vocabulary

- **DEP-004**: GSS needs the derived-value mechanism and tolerance rule before circles, cylinders and triangles can accept alternative defining values and check contradictions
  - *Type:* Hard
  - *Nature:* Behavior
  - *Detail:* GSS-REQ-002, GSS-REQ-014..018 and GSS-REQ-027 build on GSV-REQ-035..039 and the 1% tolerance in the GSV specification's Behaviors & Rules; GSS-REQ-034 depends on GSV-REQ-039 (supplied versus derived)

### Graph Specification & Vocabulary → the three rendering areas

- **DEP-005**: GSV's published schema, vocabulary and graph-type list are complete only when NLC, DGP and GSS have contributed every type's parameters
  - *Type:* Soft
  - *Nature:* Data
  - *Detail:* GSV-REQ-003, GSV-REQ-007, GSV-REQ-014, GSV-NFR-003 and GSV-NFR-005 cover all eleven graph types. Together with DEP-002..004 this is a cycle; it is resolved by RES-001 — GSV delivers the mechanism and shared properties first, each rendering area adds its types through the per-type contract, and GSV's all-types checks close at the end (Phase 3)

### Component Packaging & Source Export → Graph Specification & Vocabulary

- **DEP-006**: The entry function, tool definition and tool handler need GSV's validation result format and published schema
  - *Type:* Hard
  - *Nature:* Behavior / Data
  - *Detail:* CPSE-REQ-009 returns GSV's normalized description; CPSE-REQ-028 derives the tool input schema from GSV-REQ-007; CPSE-REQ-033 returns GSV-REQ-029..032 issues; CPSE-REQ-025 refuses invalid descriptions via GSV validation

### Component Packaging & Source Export → the three rendering areas

- **DEP-007**: The entry component and source export need each graph type's renderer; each type can be wired in as soon as its renderer exists
  - *Type:* Hard (per graph type)
  - *Nature:* Behavior
  - *Detail:* CPSE-REQ-008 and CPSE-REQ-010 dispatch to every type's component; CPSE-REQ-019..022 and CPSE-NFR-001 export markup identical to each renderer's output (prd/TC-009). The dependency is incremental: the first type to land unblocks the first end-to-end path

- **DEP-008**: Documentation needs a working example and rendered graph for every graph type
  - *Type:* Soft
  - *Nature:* Data
  - *Detail:* CPSE-REQ-044..046 and CPSE-NFR-003 iterate over every type's documented example; the documentation site can be built early and filled per type

## External Dependencies

- **EXT-001**: Data Graphs & Pictographs depends on a pictograph image set that is clean, non-branded and licensed for redistribution
  - *Type:* Hard
  - *Nature:* Data Source / Decision
  - *Detail:* DGP-REQ-023..035 cannot be completed without images; who supplies them is an open PRD question. Line graphs and bar graphs do not depend on it
  - *Related Constraints:* prd/CC-001, prd/CC-004, prd/RF-004

- **EXT-002**: Component Packaging & Source Export depends on an npm package name and, for a scoped name, a gener8v npm organization with trusted publishing configured
  - *Type:* Hard (for release only)
  - *Nature:* Service / Decision
  - *Detail:* CPSE-REQ-001, CPSE-NFR-008; needed before the first publish, not before development
  - *Related Constraints:* prd/IC-003, prd/OQ-003

- **EXT-003**: Component Packaging & Source Export depends on a public source repository with CI that can publish with provenance
  - *Type:* Hard
  - *Nature:* Service
  - *Detail:* CPSE-REQ-038, CPSE-REQ-040, CPSE-NFR-008; the CI matrix is part of DEP-001. GitHub and GitHub Actions are assumed
  - *Related Constraints:* prd/IC-003, prd/OC-002, prd/OC-004

- **EXT-004**: Component Packaging & Source Export depends on the decision of which model providers' tool formats the tool schema must satisfy, and on their current documentation
  - *Type:* Hard (for CPSE-REQ-027..029 shape)
  - *Nature:* Decision / API
  - *Detail:* The shape of the tool schema (object root wrapping the graph-type union) must be settled before the tool definition is built; provider limits change and must be re-checked
  - *Related Constraints:* prd/IC-001, prd/RF-002, prd/OQ-002

- **EXT-005**: Component Packaging & Source Export depends on the license decision
  - *Type:* Hard (for release only)
  - *Nature:* Decision
  - *Detail:* CPSE-REQ-037 and the license notice carried by exported files with embedded images; MIT assumed
  - *Related Constraints:* prd/CC-001, prd/OQ-001

- **EXT-006**: Every area depends on the supported runtimes: React 18 and 19, Node.js 22 and 24
  - *Type:* Soft
  - *Nature:* Service
  - *Detail:* All are available today; the dependency is on staying within APIs common to both React majors
  - *Related Constraints:* prd/TC-004, prd/TC-006

- **EXT-007**: The rendering areas depend on Product Owner answers to open questions that change their parameters: number-line inequality markers (NLC), rotation of 3D views (NLC, GSS), units in values (GSS), image supplier (DGP)
  - *Type:* Soft
  - *Nature:* Decision
  - *Detail:* Each area can start on the assumptions in its specification; a different answer adds or amends requirements later

## Shared Resources

- **RES-001**: Per-type definition contract — the single definition of GSV-REQ-015 and the shape in which each graph type contributes its parameters, defining and dependent values, applicable presentation options and domain checks
  - *Used By:* GSV (owns the mechanism), NLC, DGP, GSS (each contributes types), CPSE (derives the tool schema and entry dispatch from it)
  - *Nature:* Data Contract
  - *Implication:* Every rendering area builds against it, so a change to its shape after Phase 2 starts reworks all three. It must be settled in Technical Design and proven on one graph type before the others start

- **RES-002**: Shared geometry and number formatting — coordinate scaling into a fixed drawing space, rounding of emitted coordinates, display rounding of derived values
  - *Used By:* NLC, DGP, GSS, CPSE (source export emits the same numbers)
  - *Nature:* Service (internal library)
  - *Implication:* prd/TC-002 and prd/RF-003 require one rounding function used everywhere; markup equality (CPSE-NFR-001) and hydration (CPSE-NFR-005) fail if any renderer formats numbers its own way

- **RES-003**: Fixed 3D projection
  - *Used By:* NLC (x,y,z graphs, NLC-REQ-035), GSS (cubes and cylinders, GSS-REQ-032)
  - *Nature:* Concept / Service
  - *Implication:* GSS-REQ-032 requires one viewpoint shared by both solids; using the same projection for x,y,z graphs avoids two 3D conventions in one curriculum. A decision for Technical Design, needed before either area draws in 3D

- **RES-004**: Default style and named-color palette
  - *Used By:* GSV (owns, GSV-REQ-042, GSV-REQ-044), NLC, DGP (series colors, DGP-REQ-014), GSS
  - *Nature:* Configuration
  - *Implication:* Contrast and greyscale targets (GSV-NFR-004, DGP-NFR-004) and the non-color series cue required by prd/CC-002 are checked against this palette; changing it after renderers exist reruns their visual tests

- **RES-005**: Label layout and text-width estimation
  - *Used By:* NLC (tick and point labels), DGP (category names, value labels), GSS (measurement labels, GSS-NFR-003)
  - *Nature:* Service (internal library)
  - *Implication:* prd/TC-001, prd/TC-011 and prd/RF-001 require one estimation and wrapping approach; three separate approaches would give inconsistent results

- **RES-006**: Text alternative generation
  - *Used By:* NLC (NLC-REQ-012..013), DGP (DGP-REQ-004), GSS (GSS-REQ-036), CPSE (CPSE-REQ-012)
  - *Nature:* Concept
  - *Implication:* Four requirements describe the same behavior from different sides; a shared pattern keeps the wording consistent and satisfies prd/CC-002 once

- **RES-007**: SVG id and marker scheme
  - *Used By:* NLC (arrowheads), DGP (clip paths for partial pictograph images), CPSE (exported components)
  - *Nature:* Concept
  - *Implication:* prd/TC-003 requires per-instance ids stable across server and browser; exported components must follow the same scheme without the package

- **RES-008**: Issue-code set
  - *Used By:* GSV (owns, GSV-REQ-030, GSV-REQ-034), NLC, DGP, GSS (add domain checks such as tick count, ambiguous triangle, unknown image), CPSE (tool handler returns them)
  - *Nature:* Data Contract
  - *Implication:* Codes are stable across non-major releases, so each area's new codes must be agreed before the first release; the set is documented as a whole (GSV-NFR-005)

- **RES-009**: Published image set
  - *Used By:* DGP (renders), GSV (lists names in vocabulary and schema), CPSE (embeds images in exported source)
  - *Nature:* Data Store (package assets)
  - *Implication:* Image names are part of the public contract once released; each image must be its own module to respect the bundle budget (CPSE-NFR-002)

## Sequencing Analysis

### Dependency Graph

```
                       ┌──→ [NLC] ──┐
[CPSE: foundation] ──→ [GSV: core] ─┼──→ [DGP] ──┼──→ [GSV: all-types checks] ──→ [CPSE: entry, export, tool, docs] ──→ release
                       └──→ [GSS] ──┘
                       (RES-001..008 settled with GSV core)

EXT-001 (image set) ─────────────→ [DGP pictographs]
EXT-004 (tool formats) ──────────→ [CPSE tool]
EXT-002, EXT-003, EXT-005 ───────→ release
```

### Suggested Sequence

1. **Phase 0** (no dependencies): CPSE package foundation — repository, build, entry-point layout, type declarations, test harness including server rendering, CI matrix, license and contribution guidelines (DEP-001)
2. **Phase 1** (depends on Phase 0): GSV core — single definition mechanism and per-type contract (RES-001), validation, issue codes (RES-008), derived values, presentation options and default style (RES-004); in the same phase, the shared rendering core: geometry and formatting (RES-002), label layout (RES-005), text alternatives (RES-006), id scheme (RES-007), 3D projection (RES-003)
3. **Phase 2** (depends on Phase 1): NLC, DGP and GSS in parallel, each contributing its graph types through RES-001; DGP pictographs additionally wait on EXT-001
4. **Phase 3** (depends on Phase 2): GSV all-types checks (complete schema, vocabulary documentation, schema–validation property tests across all types); CPSE entry component, source export with markup equality, tool definition and handler (also EXT-004), documentation; release (EXT-002, EXT-003, EXT-005)

The change brief puts every item at Must, so there is no conflict between this order and the Priority Cut.

### Parallelization Opportunities

- NLC, DGP and GSS share no internal dependencies on one another; they share RES-002..007, which Phase 1 delivers, so they can proceed fully in parallel
- A vertical slice of one graph type (for example, the circle or the number line) can run from GSV core through its renderer, the entry function, the tool handler and source export during Phase 2. This proves RES-001 and the export equality approach before the other types are built, and lets CPSE's Phase 3 work start early
- Within each rendering area, graph types are independent: line graphs and bar graphs need not wait for the pictograph image set (EXT-001); squares and circles need not wait for the triangle solver or the solids
- The CPSE tool definition and handler depend only on GSV (DEP-006), not on renderers; they can be built once GSV core and the tool-format decision (EXT-004) exist
- The documentation site skeleton can be built in Phase 0 and filled per type (DEP-008)
- Release prerequisites (EXT-002, EXT-003, EXT-005) are decisions and accounts, and can be resolved at any time before Phase 3

### Critical Path

CPSE foundation → GSV core and shared rendering core → GSS (slowest rendering area) → CPSE source export and markup equality → release

*Rationale:* Nothing can be delivered without the foundation (DEP-001). Every renderer depends on GSV core and the shared resources (DEP-002..004). GSS is likely the longest rendering area, because the triangle solver (four defining sets, ambiguity, contradiction checks, GSS-REQ-010..022) and the two solids with hidden lines (GSS-REQ-023..029) carry the most geometry; NLC's x,y,z graph is a close second and shares the 3D projection. Source export must produce markup identical to every renderer (CPSE-NFR-001), so it closes only after the last renderer. If the image set (EXT-001) arrives late, DGP pictographs can displace GSS on the critical path.

## Risk Dependencies

- **RD-001**: Every rendering area depends on the per-type definition contract (RES-001) being stable
  - *Risk:* A change to the contract after Phase 2 starts reworks three areas at once
  - *Mitigation:* Settle it in Technical Design and prove it with the vertical slice before the other graph types start

- **RD-002**: DGP pictographs depend on an image set that does not exist yet and is a content task, not an engineering one (EXT-001)
  - *Risk:* Pictographs slip, or images with unclear licenses enter the package
  - *Mitigation:* Decide the supplier now; build pictographs against two or three placeholder images drawn in-house under the package license; record provenance per image (DGP-NFR-005)

- **RD-003**: The CPSE tool depends on provider tool-schema limits outside the project's control (EXT-004)
  - *Risk:* A provider rejects or weakens the tool schema after release, or the schema shape must change after GSV's published schema is fixed
  - *Mitigation:* Decide target providers before Technical Design; design the tool schema shape at the same time as the published schema; validate against each provider's documented subset in CI (prd/RF-002)

- **RD-004**: NLC and GSS both depend on the fixed 3D projection (RES-003)
  - *Risk:* Choosing it inside one area forces the other to adopt it or rework
  - *Mitigation:* Decide it once in Technical Design as part of the shared rendering core

- **RD-005**: Release depends on the npm name, organization, repository and license (EXT-002, EXT-003, EXT-005)
  - *Risk:* The preferred package name is taken, or the organization is not available, at release time
  - *Mitigation:* Check name availability and create the organization now; reserve with a placeholder publish only if the team accepts that

## Open Questions

- [ ] **OQ-001**: Who owns the shared rendering core (RES-002, RES-003, RES-005..007) — GSV, a rendering area, or a component of its own? A component boundary for Technical Design
- [ ] **OQ-002**: Should x,y,z coordinate graphs use the same projection as cubes and cylinders (RES-003)? Recommended, but not required by the NLC specification
- [ ] **OQ-003**: Which graph type is the vertical slice? The circle exercises derived values and contradictions; the number line exercises ticks, ranges and arrowhead markers
- [ ] **OQ-004**: Does the documentation site have to be complete before the first release, or can it be published after? (CPSE-REQ-044..046)

## Assumptions

- Assumption: Technical Design will make the shared rendering core a distinct component used by the three rendering areas, rather than duplicating it
- Assumption: The package foundation slice of CPSE can be delivered and reviewed on its own, before any graph type exists
- Assumption: Relative effort between rendering areas (GSS longest) is a judgment from requirement count and geometric complexity; Ticket Breakdown sizes it properly
