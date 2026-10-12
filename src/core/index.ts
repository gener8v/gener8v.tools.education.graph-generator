// Non-rendering entry point. The public contract so far: the graph types (GSV TICKET-001), issue
// codes, their documentation and the result types (GSV TICKET-002), validate (GSV TICKET-003),
// normalize and describe (GSV TICKET-004), and getSchema, getToolSchema and getVocabulary (GSV
// TICKET-005) (AD-001). Construction and formatting helpers stay internal: package code imports
// them by path.
// Must never import react, react-dom or browser globals (AD-001, prd/TC-005).
// @spec CPSE-REQ-006
export { GRAPH_TYPES } from "./definitions/types";
export type { GraphType } from "./definitions/types";
export { ISSUE_CODES, formatIssue, isIssueCode, issueDocs } from "./issues";
export type { IssueCode } from "./issues";
export type { Issue, Issues, Provenance, Range, ValidationResult } from "./result";
export { describe } from "./describe";
export { normalize, validate } from "./validate/index";
export { getSchema, getToolSchema, getVocabulary } from "./schema";
export type { JsonSchema, TermUse, Vocabulary } from "./schema";
