// Non-rendering entry point: validate, normalize, getSchema, getVocabulary, describe.
// Must never import react, react-dom or browser globals (AD-001, prd/TC-005).
// @spec CPSE-REQ-006
export {
  ISSUE_CODES,
  createIssue,
  describeRange,
  describeValue,
  escapePointerToken,
  issueDocs,
  issueMessage,
  pointer,
} from "./issues";
export type { IssueCode, IssueParams } from "./issues";
export { invalidResult, validResult } from "./result";
export type { Issue, Issues, Provenance, Range, ValidationResult } from "./result";
