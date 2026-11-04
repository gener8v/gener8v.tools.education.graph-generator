// The export command's limits, apart from the command so the documentation site can show them
// without bundling Node.js modules (graph-library CPSE TICKET-008 code review CR-002).

/** The most issues printed; the rest are counted (GSV TICKET-002 security review SEC-002). */
export const MAX_ISSUES_PRINTED = 20;

/**
 * The most bytes read from the description file: 3 MiB. The largest valid description, pretty-
 * printed, is 1,649,745 bytes (the x,y graph at its limits: 1,000 labeled points and 740 labeled
 * segments, every label 200 astral characters, measured 2026-11-04), so this is 1.9 times that
 * (GSV CPSE TICKET-006 security review SEC-002).
 */
export const MAX_INPUT_BYTES = 3 * 1024 * 1024;
