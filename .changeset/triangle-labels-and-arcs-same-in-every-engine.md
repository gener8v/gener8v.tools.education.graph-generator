---
"@gener8v/graph-generator": patch
---

Added: triangles, rulers, axes and cubes do not depend on the last digit of the engine's math functions, so the server and every browser draw them the same way and server-rendered graphs hydrate. This covers whether a triangle's label below its bottom side fits beside the side, how many arc pieces an angle that is a multiple of 15° gets, how a ruler mark's width is rounded and how an axis tick's end is rounded.
