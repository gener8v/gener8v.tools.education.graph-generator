---
"@gener8v/graph-generator": patch
---

Changed: an x,y graph's default tick spacing can now be coarser on a narrow or flat plot, so its tick labels stand apart instead of running together (for example, x from -2 to 2 beside a y-axis from -100 to 100 is ticked every 1, not every 0.5). The text alternative states the spacing drawn. A supplied `tickSpacing` is used as given.
