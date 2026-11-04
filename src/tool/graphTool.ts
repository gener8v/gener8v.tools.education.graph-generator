import { type DeepReadonly, type JsonSchema, getToolSchema } from "../core/schema";

/** The model tool's name, as a provider's tool definition and its tool calls carry it. */
export const TOOL_NAME = "generate_graph";

/** A tool definition in no provider's format: each provider's request takes these three values (AD-015). */
export interface GraphTool {
  readonly name: typeof TOOL_NAME;
  /** Plain English, for the model: what the tool does and how to call it. */
  readonly description: string;
  /**
   * The strict tool-profile schema (AD-006): an object whose `graph` property holds the
   * description; every object closed, every property required, `null` for "not given". Frozen.
   */
  readonly inputSchema: DeepReadonly<JsonSchema>;
}

const DESCRIPTION =
  "Draws one mathematical graph or figure for a lesson, worksheet or assessment: a number line, ruler, x,y or x,y,z " +
  "coordinate graph, line graph, bar graph, pictograph, circle, square, triangle, cube or cylinder. Put the graph's " +
  "description in the graph property: its type and the values that type accepts. Give null for anything you do not " +
  "want to set. The result says whether the graph was produced; if it was not, it lists each problem with where it " +
  "is and how to fix it, so correct those and call the tool again.";

/**
 * The model tool's definition: give it to any provider that accepts a JSON Schema for a tool's
 * input. The schema is the generated one (`getToolSchema`, `src/generated/tool-schema.json`), never
 * written here, and the package calls no model and depends on no provider's software. Feed each
 * call's input to `handleGraphToolCall`.
 */
// Marked pure so a bundle that imports only the handler does not build the schema.
// @spec CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-REQ-036
export const graphTool: GraphTool = /* @__PURE__ */ Object.freeze({
  name: TOOL_NAME,
  description: DESCRIPTION,
  inputSchema: /* @__PURE__ */ getToolSchema(),
});
