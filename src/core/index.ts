// Non-rendering entry point. The public contract so far: the graph types (GSV TICKET-001), issue
// codes, their documentation and the result types (GSV TICKET-002). validate, normalize,
// getSchema, getVocabulary and describe join it in later tickets (AD-001). Construction and
// formatting helpers stay internal: package code imports them by path.
// Must never import react, react-dom or browser globals (AD-001, prd/TC-005).
// @spec CPSE-REQ-006
export { GRAPH_TYPES } from "./definitions/types";
export type { GraphType } from "./definitions/types";
export { ISSUE_CODES, isIssueCode, issueDocs } from "./issues";
export type { IssueCode } from "./issues";
export type { Issue, Issues, Provenance, Range, ValidationResult } from "./result";
