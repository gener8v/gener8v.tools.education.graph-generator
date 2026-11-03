import type { GraphType } from "./types";

/**
 * The component name for a graph type: "circle" → "CircleGraph", "bar-graph" → "BarGraph". The
 * package's per-type components and source export's default name both use it, so an exported line
 * graph is `LineGraph`, like the package's (CPSE-REQ-024). React-free, so `./export` can import it.
 */
// @spec CPSE-REQ-024
export function componentName(type: GraphType): string {
  const pascal = type.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  return pascal.endsWith("Graph") ? pascal : `${pascal}Graph`;
}
