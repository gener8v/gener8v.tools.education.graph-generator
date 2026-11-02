---
"@gener8v/graph-generator": minor
---

Changed: a tick spacing that leaves fewer than two ticks inside an axis range is now rejected with the new issue code `too_few_ticks`, reported at the axis's `tickSpacing` and naming a spacing that fits. A number line from 1 to 9 with a tick spacing of 10 used to be accepted and drawn with no tick and no number, while its text alternative said "ticked every 10". An axis with no tick spacing is not affected.
