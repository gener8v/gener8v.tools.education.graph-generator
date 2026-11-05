---
"@gener8v/graph-generator": patch
---

Added: the `graph-generator` command. `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]` reads a description file and writes the component file that `exportSource` produces. The default output is `<Name>.tsx` next to the description. For an invalid description it prints the first 20 issues and writes nothing. It exits with 0 when the file is written, 1 when the description or a file cannot be used, and 2 for an invalid command line. It runs on Node.js 22 and later without React and makes no network requests.
