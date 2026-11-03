---
"@gener8v/graph-generator": patch
---

Added: `exportSource(description, { componentName? })` from `./export`, which turns a valid description into the source of one standalone React component file (`.tsx`) that depends on React alone, takes no props, uses no hooks and renders the same markup as the package's component. The file opens with a comment naming the package version and holding the description; a pictograph's image drawings are embedded, with their license notice. An invalid description, or a component name that is not a PascalCase identifier, returns the issues and no source.
