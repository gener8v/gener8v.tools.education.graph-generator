---
"@gener8v/graph-generator": minor
---

Added: the issue code `too_few_ticks`. A tick spacing that leaves fewer than two ticks inside an axis range is rejected at the axis's `tickSpacing`, and the message names a spacing that fits. For example, a number line from 1 to 9 with a tick spacing of 10 is rejected. An axis without a tick spacing is not affected.
