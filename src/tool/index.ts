// Model tool entry point: graphTool and handleGraphToolCall (AD-015).
// Must never import react, react-dom or browser globals (AD-001, prd/TC-005), nor any model
// provider's software (CPSE-REQ-029).
// @spec CPSE-REQ-006, CPSE-REQ-029, CPSE-REQ-036
export { TOOL_NAME, graphTool } from "./graphTool";
export type { GraphTool } from "./graphTool";
export { TEXT_ALTERNATIVE_LIMIT, TOOL_INPUT_LIMIT, handleGraphToolCall } from "./handleGraphToolCall";
export type { ToolResult } from "./handleGraphToolCall";
export type { Issue, Issues, Provenance } from "../core/result";
export type { DeepReadonly, JsonSchema } from "../core/schema";
