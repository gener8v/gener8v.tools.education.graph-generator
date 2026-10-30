---
"@gener8v/graph-generator": patch
---

Added: the `cylinder` type, an upright cylinder drawn to scale from its radius or diameter and its height in the solids' one isometric viewpoint, the hidden half of its base dashed or omitted, its radius or diameter optionally drawn and labeled on the top face and its height labeled beside its side, with the value and unit or custom text, as `<CylinderGraph>` and the `./cylinder` entry. The `radius`, `diameter`, `showRadius`, `showDiameter`, `labelRadius`, `labelDiameter`, `radiusLabelText` and `diameterLabelText` terms are now shared by the circle and the cylinder, so their descriptions cover both figures; the circle's behaviour is unchanged.
