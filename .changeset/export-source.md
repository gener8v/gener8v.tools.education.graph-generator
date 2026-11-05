---
"@gener8v/graph-generator": patch
---

Added: `exportSource(description, { componentName? })` from `./export`. It turns a valid description into the source of one standalone React component file (`.tsx`). The component depends only on React, takes no props, uses no hooks and renders the same markup as the package's component. The file opens with a comment that names the package version and contains the description. Pictograph images are embedded with their license notice. For an invalid description, or a component name that is not a PascalCase identifier, it returns the issues and no source. A valid result also includes `componentName`, the name the component was given.
