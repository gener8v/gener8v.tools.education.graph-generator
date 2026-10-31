---
"@gener8v/graph-generator": patch
---

Fixed: a cube with its three front-corner edges labeled now places those labels the same way in every JavaScript engine. Safari placed them on the other side of each edge from Node.js and Chrome, so a server-rendered cube failed to hydrate in Safari. The labels may move to the other side of their edges compared with earlier versions.
