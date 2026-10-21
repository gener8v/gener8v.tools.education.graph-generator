import type { ReactElement, ReactNode } from "react";
import type { Registry } from "../core/definitions/index";
import type { DescriptionBase, GraphType, GraphTypeDefinition } from "../core/definitions/types";
import { describeValue } from "../core/issues";
import type { Issue, Issues } from "../core/result";
import type { Layout, LayoutRegistry } from "../layout/registry";
import { createGraphWith } from "../graph";
import { Placeholder } from "./Placeholder";
import { SceneSvg } from "./SceneSvg";

/**
 * What a component renders for an invalid description (AD-014): `"placeholder"` (the default) a
 * visible box listing the issues, `"none"` nothing, or a function that receives every issue and
 * returns what to render. The function is how the consumer is told the issues (CPSE-REQ-017): it
 * is called during render, with no side effect. A consumer who needs a side effect, such as
 * logging, calls `validate()` from `./core` itself. An error thrown by the function is the
 * consumer's own and is not caught. An issue's `path` is the caller's keys verbatim: print issues
 * with `formatIssue` from `./core`, never the raw path (security review SEC-003).
 */
export type Fallback = "placeholder" | "none" | ((issues: Issue[]) => ReactNode);

/** The props of `Graph` and of every per-type component. */
export interface GraphProps {
  /**
   * The graph description: any value; an invalid one renders the fallback.
   *
   * It is validated on every render (the components are pure, with no memoization; DEL-001). A
   * page that re-renders often with a large description should keep the element stable, for
   * example by memoizing it, or validate once with `createGraph` and render the result
   * (security review SEC-005). The validator bounds its own work but reads the whole input
   * object: a server rendering descriptions from requests must keep its own request-body size
   * limit (GSV TICKET-003 security review SEC-001; CPSE TICKET-003 security review SEC-006).
   */
  description: unknown;
  /** The accessible name; when absent or blank the generated text alternative is used. */
  textAlternative?: string;
  fallback?: Fallback;
}

/** @internal The definitions and layouts a component draws with. */
export interface Registries {
  definitions: Registry;
  layouts: LayoutRegistry;
}

// @spec CPSE-REQ-014, CPSE-REQ-015, CPSE-REQ-016, CPSE-REQ-017
function renderFallback(issues: Issues, fallback: unknown): ReactNode {
  if (fallback === "none") return null;
  // A fresh array: the consumer may keep or change it without touching anything of ours.
  if (typeof fallback === "function") return (fallback as (issues: Issue[]) => ReactNode)([...issues]);
  return <Placeholder issues={issues} />;
}

/**
 * What a component renders, drawing with the given definitions and layouts: the graph, or the
 * fallback. Pure: no hooks, state or effects (AD-014, prd/IC-002). Never throws because of the
 * description (CPSE-REQ-018). Reads only the props the consumer passed. The registries are always passed, never defaulted, so a per-type
 * component reaches no other type's code (AD-001, CPSE-REQ-004; code review CR-002).
 */
// @spec CPSE-REQ-008, CPSE-REQ-014, CPSE-REQ-018
export function renderGraph(props: GraphProps, registries: Registries): ReactNode {
  // Own props only: a prop the consumer did not pass is never read from a polluted
  // `Object.prototype`, so it cannot rename every graph or hide its fallback (rulers NLC TICKET-003
  // security review SEC-002).
  const own = (key: keyof GraphProps): unknown => (typeof props === "object" && props !== null && Object.hasOwn(props, key) ? props[key] : undefined);
  const [description, textAlternative, fallback] = [own("description"), own("textAlternative"), own("fallback")];
  const result = createGraphWith(description, registries.definitions, registries.layouts);
  if (!result.ok) return renderFallback(result.issues, fallback);
  return <SceneSvg scene={result.scene} textAlternative={textAlternative as string | undefined} />;
}

/** What a per-type component draws with: its type's definition and layout, and nothing else. */
export interface GraphTypeParts<D extends DescriptionBase = DescriptionBase> {
  definition: GraphTypeDefinition<D>;
  layout: Layout<D>;
}

/** A per-type component, carrying the graph type it draws. */
export type GraphComponent<T extends GraphType = GraphType> = ((props: GraphProps) => ReactElement) & {
  readonly graphType: T;
  displayName?: string;
};

/** The component name for a graph type: "circle" → "CircleGraph", "bar-graph" → "BarGraph". */
export function componentName(type: GraphType): string {
  const pascal = type.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  return pascal.endsWith("Graph") ? pascal : `${pascal}Graph`;
}

/** A frozen one-entry record on a null prototype, like the package tables. */
const only = <V,>(type: GraphType, value: V): Readonly<Partial<Record<GraphType, V>>> =>
  Object.freeze(Object.assign(Object.create(null) as Partial<Record<GraphType, V>>, { [type]: value }));

/**
 * The React component for one graph type (CPSE-REQ-007), drawing with that type's own definition
 * and layout, so importing it brings in no other graph type (AD-001, CPSE-REQ-004). It accepts the
 * type's description, `textAlternative` and `fallback`. A description of another type, or with no
 * `type`, is invalid: the validator, checking against this one type, reports a graph-type mismatch
 * as `unknown_graph_type` at `/type` naming this type as the only one allowed. For a valid
 * description it renders exactly what `Graph` renders (CPSE-REQ-010). Every
 * `src/react/graphs/<Pascal>Graph.tsx` is made with this, marked pure so a bundler drops a
 * component nothing imports (quality review QR-003):
 * `export const CircleGraph = /* @__PURE__ *\/ createGraphComponent("circle", { definition: circle, layout: circleLayout });`
 */
// @spec CPSE-REQ-007, CPSE-REQ-010, CPSE-REQ-014, CPSE-REQ-016, CPSE-REQ-017, CPSE-REQ-018
export function createGraphComponent<T extends GraphType, D extends DescriptionBase = DescriptionBase>(
  type: T,
  parts: GraphTypeParts<D>,
): GraphComponent<T> {
  if (parts.definition.type !== type) {
    throw new Error(`createGraphComponent: the definition is for ${describeValue(parts.definition.type)}, not ${describeValue(type)}`);
  }
  // A type's own definition and layout fit the shared table types with no cast: their methods are
  // bivariant (GSS TICKET-002 quality review QR-005).
  const registries: Registries = {
    definitions: only(type, parts.definition),
    layouts: only(type, parts.layout),
  };
  function TypedGraph(props: GraphProps): ReactElement {
    // A fragment keeps the return type an element whatever the fallback returns; it adds no markup.
    return <>{renderGraph(props, registries)}</>;
  }
  // A name per type for React DevTools and error stacks (quality review QR-007).
  TypedGraph.displayName = componentName(type);
  // The type it draws, so the package test can pair each shipped component with its type's
  // example (code review CR-003).
  return Object.assign(TypedGraph, { graphType: type } as const);
}
