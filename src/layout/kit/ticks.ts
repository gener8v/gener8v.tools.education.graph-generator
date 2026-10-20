// An axis's ticks and their labels, for the number line and coordinate graph layouts. The rule
// lives in core, beside the data graphs' value scale, because the validator counts ticks with it
// (DGP TICKET-001 quality review QR-005); this module gives the layouts its names.
export { AXIS_DEFAULT_INTERVALS, axisTickLabel as tickLabel, isTickValue, niceTicks, tickCount } from "../../core/value-scale";
