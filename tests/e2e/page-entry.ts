import { type ReactNode, createElement, useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Graph } from "../../src/index";
import type { HydrationResult, PageApi, RenderAllResult } from "./page-api";

// The code each Playwright page runs (graph-library CPSE TICKET-004): the package's React entry
// (`src/index.ts`) with React, bundled for the browser by `browserBundle()` in ./bundle.ts and
// injected into a page built with `page.setContent`. It puts `graphE2E` on `window`; the specs call
// it with descriptions passed as JSON text, and get JSON text back, so no string is changed on the
// way in or out. This file is test code: the hook below is not in the package.

/** Calls `onCommit` once the tree around it has been committed, hydration included. */
function Committed({ onCommit, children }: { onCommit: () => void; children?: ReactNode }): ReactNode {
  useEffect(onCommit, [onCommit]);
  return children;
}

const describeError = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** How long a hydration may take before the page reports it never committed. */
const HYDRATION_TIMEOUT_MS = 10_000;

const api: PageApi = {
  hydrate(descriptionJson: string, containerId: string): Promise<string> {
    const container = document.getElementById(containerId);
    if (container === null) return Promise.resolve(JSON.stringify({ errors: [`no #${containerId}`], html: "" } satisfies HydrationResult));
    const errors: string[] = [];
    const record = (kind: string) => (error: unknown) => errors.push(`${kind}: ${describeError(error)}`);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (extra: string[]) => {
        if (settled) return;
        settled = true;
        // One more task, so anything React reports after the commit is recorded too.
        setTimeout(() => resolve(JSON.stringify({ errors: [...errors, ...extra], html: container.innerHTML } satisfies HydrationResult)), 0);
      };
      setTimeout(() => finish([`hydration did not commit within ${HYDRATION_TIMEOUT_MS} ms`]), HYDRATION_TIMEOUT_MS);
      hydrateRoot(container, createElement(Committed, { onCommit: () => finish([]) }, createElement(Graph, { description: JSON.parse(descriptionJson) })), {
        onRecoverableError: record("onRecoverableError"),
        // React 19 only; React 18 ignores options it does not know.
        onCaughtError: record("onCaughtError"),
        onUncaughtError: record("onUncaughtError"),
      } as Parameters<typeof hydrateRoot>[2]);
    });
  },

  renderAll(descriptionsJson: string, nodeMarkupJson: string): string {
    const descriptions = JSON.parse(descriptionsJson) as unknown[];
    const nodeMarkup = JSON.parse(nodeMarkupJson) as string[];
    const container = document.createElement("div");
    document.body.append(container);
    const template = document.createElement("template");
    const result: RenderAllResult = { staticMarkup: [], clientMarkup: [], parsedNodeMarkup: [] };
    descriptions.forEach((description, i) => {
      result.staticMarkup.push(renderToStaticMarkup(createElement(Graph, { description })));
      const root = createRoot(container);
      flushSync(() => root.render(createElement(Graph, { description })));
      result.clientMarkup.push(container.innerHTML);
      root.unmount();
      // Node's markup as this engine parses and prints it: equal to the client render's printout
      // exactly when the two DOM trees are equal.
      template.innerHTML = nodeMarkup[i] ?? "";
      result.parsedNodeMarkup.push(template.innerHTML);
    });
    container.remove();
    return JSON.stringify(result);
  },
};

window.graphE2E = api;
