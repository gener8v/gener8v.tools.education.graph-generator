import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Graph } from "../../src/react/Graph";
import { RulerGraph } from "../../src/react/graphs/RulerGraph";
import { loadExample } from "../fixtures/examples";
import { EVERY_RULER, rulerSpanned } from "../fixtures/rulers";
import { expectNoBrowserGlobalsTouched } from "../helpers/browser-globals";

// NLC-NFR-006 in its own file, which imports no jsdom and no axe-core, so nothing a browser library
// sets at import can reach these renders (rulers NLC TICKET-004 code review CR-001). The shape of
// graph-library NLC TICKET-005's NLC-NFR-002 test, which shares its global-object check (`expectNoBrowserGlobalsTouched`).
const example = loadExample("ruler");

describe("every ruler renders on a server, with no browser globals (NLC-NFR-006, prd/TC-005)", () => {
  it("runs with no window or document defined", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders the example and all 78 rulers, each with an object, to static markup through <RulerGraph> and <Graph>", () => {
    const descriptions = [example, ...EVERY_RULER.map(([unit, division, length]) => rulerSpanned(unit, division, length))];
    expect(descriptions).toHaveLength(79);
    // The renders add, remove or replace no global (the helper, shared with the NLC-NFR-002 test).
    expectNoBrowserGlobalsTouched(() => {
      for (const description of descriptions) {
        const markup = renderToStaticMarkup(<RulerGraph description={description} />);
        expect(markup, JSON.stringify(description)).toMatch(/^<svg role="img" aria-label="A ruler[ ,]/);
        expect(renderToStaticMarkup(<Graph description={description} />)).toBe(markup);
      }
    });
  });
});
