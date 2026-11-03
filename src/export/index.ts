// Source export entry point: exportSource (AD-013).
// Must never import react, react-dom or browser globals (AD-001, prd/TC-005).
// @spec CPSE-REQ-006
export { exportSource } from "./exportSource";
export type { ExportSourceOptions, ExportSourceResult } from "./exportSource";
export type { Issue, Issues } from "../core/result";
