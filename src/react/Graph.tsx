import type { ReactElement } from "react";
import { definitions } from "../core/definitions/index";
import { layouts } from "../layout/registry";
import { type GraphProps, type Registries, renderGraph } from "./createGraphComponent";

// Every graph type: the entry component is the one place that draws with all of them (AD-001).
const packageRegistries: Registries = { definitions, layouts };

/**
 * The entry component (CPSE-REQ-008): renders a description of any graph type as an accessible
 * SVG that scales to its container, or, for an invalid description, the chosen `fallback`
 * (default: a placeholder listing the issues). Pure, with no hooks, state or effects, so it works
 * as a React Server Component (AD-014, prd/IC-002). Never throws because of its description
 * (CPSE-REQ-018); its output for a valid description is exactly the per-type component's
 * (CPSE-REQ-010).
 *
 * Show a ruler at least about 330 px wide (30 cm; about 11 px per centimetre, so 164 px for 15 cm,
 * and about 210 px for 12 in marked to sixteenths): narrower, its finest marks render lighter than 3:1
 * contrast (WCAG 1.4.11). See the README's Styling section and `RulerGraph`.
 *
 * The validator bounds its own work, but it still reads the whole input object: a server that
 * renders descriptions from requests must keep its own request-body size limit (GSV TICKET-003
 * security review SEC-001).
 */
// @spec CPSE-REQ-008, CPSE-REQ-010, CPSE-REQ-014, CPSE-REQ-015, CPSE-REQ-016, CPSE-REQ-017, CPSE-REQ-018
export function Graph(props: GraphProps): ReactElement {
  // A fragment keeps the return type an element whatever the fallback returns; it adds no markup.
  return <>{renderGraph(props, packageRegistries)}</>;
}
