---
"@gener8v/graph-generator": patch
---

Fixed: triangles, rulers, axes and cubes no longer depend on the last digit of the engine's own math functions, so the server and every browser draw them the same way. Before, the last digit could decide some details. A triangle's label below its bottom side could fit beside the side or drop below the figure. An angle of 15°, 30°, 45° or another multiple of 15° could get one more arc piece. A ruler's mark width or an axis's tick end could be rounded the other way. Any of these could make a server-rendered graph fail to hydrate. Some triangles now draw differently from earlier versions: such a label now sits beside its side instead of below the figure, and such an angle's arc has one piece fewer.
