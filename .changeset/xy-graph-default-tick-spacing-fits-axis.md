---
"@gener8v/graph-generator": patch
---

Added: an x,y graph picks a coarser default tick spacing on a narrow or flat plot, so tick labels do not run together. For example, x from -2 to 2 beside a y-axis from -100 to 100 is ticked every 1, not every 0.5. The text alternative states the spacing drawn. A `tickSpacing` you supply is used as given.
