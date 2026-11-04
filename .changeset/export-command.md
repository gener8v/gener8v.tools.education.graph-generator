---
"@gener8v/graph-generator": patch
---

Added: the `graph-generator` command. `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]` reads a description file and writes the component file `exportSource` produces, `<Name>.tsx` next to the description by default. An invalid description prints its first 20 issues and writes nothing; the command exits 0 when the file is written, 1 when the description or a file is not usable, and 2 for a command line it cannot use. It runs on Node.js 22 and later with no React installed and makes no network requests.
