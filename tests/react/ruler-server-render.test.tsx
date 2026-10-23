import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Graph } from "../../src/react/Graph";
import { RulerGraph } from "../../src/react/graphs/RulerGraph";
import { EVERY_RULER, rulerSpanned } from "../fixtures/rulers";

// NLC-NFR-006 in its own file, which imports no jsdom and no axe-core, so nothing a browser library
// sets at import can reach these renders (rulers NLC TICKET-004 code review CR-001). The shape of
// graph-library NLC TICKET-005's NLC-NFR-002 test, which can absorb it.
const example: unknown = JSON.parse(readFileSync(new URL("../../examples/ruler.json", import.meta.url), "utf8"));

describe("every ruler renders on a server, with no browser globals (NLC-NFR-006, prd/TC-005)", () => {
  it("runs with no window or document defined", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders the example and all 78 rulers, each with an object, to static markup through <RulerGraph> and <Graph>", () => {
    const descriptions = [example, ...EVERY_RULER.map(([unit, division, length]) => rulerSpanned(unit, division, length))];
    expect(descriptions).toHaveLength(79);
    // The global object's own keys and values, before and after: the renders add, remove or replace
    // none (rulers NLC TICKET-004 security review SEC-001). Reading the descriptors once first lets
    // Node.js create what its lazy globals create on a first read (undici's dispatcher symbol).
    const snapshot = () => new Map(Reflect.ownKeys(globalThis).map((key) => [key, Reflect.getOwnPropertyDescriptor(globalThis, key)?.value]));
    snapshot();
    const globalsBefore = snapshot();
    for (const description of descriptions) {
      const markup = renderToStaticMarkup(<RulerGraph description={description} />);
      expect(markup, JSON.stringify(description)).toMatch(/^<svg role="img" aria-label="A ruler[ ,]/);
      expect(renderToStaticMarkup(<Graph description={description} />)).toBe(markup);
    }
    const globalsAfter = Reflect.ownKeys(globalThis);
    expect(globalsAfter.map(String).sort()).toEqual([...globalsBefore.keys()].map(String).sort());
    for (const key of globalsAfter) expect(Object.is(Reflect.getOwnPropertyDescriptor(globalThis, key)?.value, globalsBefore.get(key)), String(key)).toBe(true);
    expect(typeof window).toBe("undefined");
  });
});
