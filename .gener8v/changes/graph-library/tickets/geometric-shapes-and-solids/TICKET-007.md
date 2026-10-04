# TICKET-007: Cylinder graph type

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `cylinder` graph type: definition from radius or diameter plus height, isometric upright layout with the hidden half of the base dashed (or omitted), optional radius/diameter and height labels, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A developer can show a labeled, to-scale cylinder for volume lessons without drawing it.

**Requirements Covered:**
- GSS-REQ-026: Draw a cylinder from radius and height so it reads as 3D
- GSS-REQ-027: Accept a diameter in place of a radius
- GSS-REQ-028: Hidden half of the base dashed by default, optionally omitted
- GSS-REQ-029: Optionally draw and label radius or diameter on the top face, and height along the side

**Prior Art:**
- Read: `src/layout/kit/isometric.ts` — produced by TICKET-001 (`isoEllipse`, `ISO_SCALE`)
- Read: `src/core/definitions/circle.ts`, `src/layout/kit/measure.ts` — produced by TICKET-002 (radius/diameter derivation pattern, measurement labels)
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — Behaviors (cylinder: radius and diameter mutually determining, height independent and required), Edge Cases (very tall or very wide cylinder)

**Acceptance Criteria:**
- [ ] `{ "type": "cylinder", "radius": 2, "height": 5 }` renders an upright cylinder: top ellipse, two side lines, front half of the base solid, back half dashed
- [ ] A cylinder given `diameter` instead of `radius` validates and derives the radius; both supplied and disagreeing returns `contradiction`; missing height returns `missing_property`
- [ ] With the hidden base omitted, the back half of the base is not drawn
- [ ] Radius (or diameter) can be drawn and labeled on the top face, height along the side, using measurement labels
- [ ] Drawn radius-to-height ratio, measured along projected axes after removing `ISO_SCALE`, is within 1% of the measurement ratio, for a very tall and a very wide cylinder as well as the example
- [ ] The text alternative names the figure as a cylinder and states each shown measurement
- [ ] `CylinderGraph`, `./cylinder` entry, size-limit entry and example exist; Scene numbers pass through `fmt()`

**Output:**
- `src/core/definitions/cylinder.ts`, `src/layout/cylinder.ts` (registered), `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts`, `./cylinder` export, size-limit entry
- `examples/cylinder.json`, `examples/invalid/cylinder-missing-height.json`
- `tests/core/cylinder.test.ts` — derivation, contradiction, missing height
- `tests/layout/cylinder.test.ts` — base halves, labels, proportions, text alternative

**Constraints:** prd/TC-010 (fixed projection; elliptical faces drawn as SVG ellipses/arcs)

**Known Hazards:**
- The hidden half of the base is an arc of an ellipse: draw the two halves as separate `path` arcs (no clip paths or ids, AD-008).
- Compare the radius along the projected axis, not the ellipse's on-screen semi-axes; the ellipse's minor axis is foreshortened differently (AD-009).

**Depends On:** TICKET-001, TICKET-002
**Blocks:** TICKET-008

**Size:** Medium
