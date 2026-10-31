// What the page bundle (./page-entry.ts) puts on `window` for the Playwright specs, and what it
// returns. Everything crosses as JSON text, so no string is changed on the way in or out.

/** What hydrating one server-rendered graph reported, and the container's markup after it. */
export interface HydrationResult {
  /** `onRecoverableError`, `onCaughtError` and `onUncaughtError` calls, and a hydration that never committed. */
  errors: string[];
  html: string;
}

/** Each description rendered in the page, in order. */
export interface RenderAllResult {
  /** `renderToStaticMarkup` in this engine: compared byte for byte with Node's. */
  staticMarkup: string[];
  /** A client render's `innerHTML` in this engine. */
  clientMarkup: string[];
  /** Node's markup parsed and printed by this engine: what `clientMarkup` must equal. */
  parsedNodeMarkup: string[];
}

export interface PageApi {
  /** Hydrates `<Graph description>` into `#containerId`; resolves to a `HydrationResult` as JSON. */
  hydrate(descriptionJson: string, containerId: string): Promise<string>;
  /** Renders every description; returns a `RenderAllResult` as JSON. */
  renderAll(descriptionsJson: string, nodeMarkupJson: string): string;
}

declare global {
  interface Window {
    graphE2E: PageApi;
  }
}
