import type { ReactElement, ReactNode } from "react";
import { type Registry, definitions } from "../core/definitions/index";
import type { GraphType } from "../core/definitions/types";
import { createIssue, pointer } from "../core/issues";
import type { Issue, Issues } from "../core/result";
import { type LayoutRegistry, layouts } from "../layout/registry";
import { type CreateGraphResult, createGraphWith } from "../graph";
import { Placeholder } from "./Placeholder";
import { SceneSvg } from "./SceneSvg";

/**
 * What a component renders for an invalid description (AD-014): `"placeholder"` (the default) a
 * visible box listing the issues, `"none"` nothing, or a function that receives every issue and
 * returns what to render. The function is how the consumer is told the issues (CPSE-REQ-017): it
 * is called during render, with no side effect. A consumer who needs a side effect, such as
 * logging, calls `validate()` from `./core` itself. An error thrown by the function is the
 * consumer's own and is not caught.
 */
export type Fallback = "placeholder" | "none" | ((issues: Issue[]) => ReactNode);

/** The props of `Graph` and of every per-type component. */
export interface GraphProps {
  /** The graph description: any value; an invalid one renders the fallback. */
  description: unknown;
  /** The accessible name; when absent or blank the generated text alternative is used. */
  textAlternative?: string;
  fallback?: Fallback;
}

/** @internal The definitions and layouts a component draws with; the tests supply their own. */
export interface Registries {
  definitions: Registry;
  layouts: LayoutRegistry;
}

const packageRegistries: Registries = { definitions, layouts };

// @spec CPSE-REQ-014, CPSE-REQ-015, CPSE-REQ-016, CPSE-REQ-017
function renderFallback(issues: Issues, fallback: unknown): ReactNode {
  if (fallback === "none") return null;
  // A fresh array: the consumer may keep or change it without touching anything of ours.
  if (typeof fallback === "function") return (fallback as (issues: Issue[]) => ReactNode)([...issues]);
  return <Placeholder issues={issues} />;
}

/** The graph, or the fallback, for a result of `createGraph`. */
function renderResult(result: CreateGraphResult, textAlternative: unknown, fallback: unknown): ReactNode {
  if (!result.ok) return renderFallback(result.issues, fallback);
  return <SceneSvg scene={result.scene} textAlternative={textAlternative as string | undefined} />;
}

/**
 * What `Graph` renders, with the given definitions and layouts. Pure: no hooks, state or effects
 * (AD-014, prd/IC-002). Never throws because of the description (CPSE-REQ-018).
 */
// @spec CPSE-REQ-008, CPSE-REQ-014, CPSE-REQ-018
export function renderGraph(props: GraphProps, registries: Registries = packageRegistries): ReactNode {
  const { description, textAlternative, fallback } = props ?? ({} as GraphProps);
  return renderResult(createGraphWith(description, registries.definitions, registries.layouts), textAlternative, fallback);
}

/**
 * The issue for a description object given to another type's component: a graph-type mismatch,
 * reported as `unknown_graph_type` at `/type` with this component's type as the only one allowed.
 * `undefined` when the description is not an object (the validator reports that) or is this type.
 */
function mismatch(description: unknown, type: GraphType): Issue | undefined {
  if (typeof description !== "object" || description === null || Array.isArray(description)) return undefined;
  let got: unknown;
  try {
    got = (description as { type?: unknown }).type;
  } catch {
    // A getter or Proxy that throws: the validator reports it as internal_error.
    return undefined;
  }
  if (got === type) return undefined;
  return createIssue("unknown_graph_type", pointer("type"), got === undefined ? { allowed: [type] } : { got, allowed: [type] });
}

/** @internal `createGraphComponent` with the given definitions and layouts. */
export function createGraphComponentWith(type: GraphType, registries: Registries) {
  // @spec CPSE-REQ-007, CPSE-REQ-010, CPSE-REQ-014, CPSE-REQ-016, CPSE-REQ-017, CPSE-REQ-018
  function TypedGraph(props: GraphProps): ReactElement {
    const { description, fallback } = props ?? ({} as GraphProps);
    const wrongType = mismatch(description, type);
    const node = wrongType === undefined ? renderGraph(props, registries) : renderFallback([wrongType], fallback);
    // A fragment keeps the return type an element whatever the fallback returns; it adds no markup.
    return <>{node}</>;
  }
  return TypedGraph;
}

/**
 * The React component for one graph type (CPSE-REQ-007). It accepts that type's description,
 * `textAlternative` and `fallback`; a description of another type is invalid, reported as a
 * graph-type mismatch. It renders exactly what `Graph` renders for the same valid description
 * (CPSE-REQ-010). Every `src/react/graphs/<Pascal>Graph.tsx` is made with this.
 */
// @spec CPSE-REQ-007, CPSE-REQ-010
export function createGraphComponent(type: GraphType) {
  return createGraphComponentWith(type, packageRegistries);
}
