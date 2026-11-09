---
"@gener8v/graph-generator": patch
---

Fixed: the package's `bin` entry is written as `dist/cli.js`, the form npm keeps as is, so publishing no longer warns that the `graph-generator` command's path was invalid. The command works the same.
