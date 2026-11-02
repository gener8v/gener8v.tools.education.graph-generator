import { describe, expect, test } from "vitest";
import { createGraph } from "../../src/graph";
import { wrap } from "../../src/layout/kit/text";
import { CALLER_TEXT_UNITS, LONG_TEXT, callerText, costlyXyDescription, costlyXyzDescription } from "../fixtures/costly-inputs";
import { expectP95, fixedRuns } from "../helpers/bench";

// The package's costliest hostile inputs stay within their time bound at p95 on a CI runner
// (graph-library CPSE TICKET-010 code review CR-001, security review SEC-001). The tests count the
// work these inputs cause (tests/react/Graph.test.tsx, tests/layout/kit/text.test.ts), which pins its
// shape but not what each step costs. This times the whole call, so a slower overlap test or a scan
// outside the label placer fails here. Runs through `pnpm bench`, not `pnpm test`.
//
// The bounds are the wall-clock limits those tests had before they were counted:
// - 1,500 ms for each layout: the bound NLC TICKET-003 security review SEC-003 was resolved on
//   (2026-10-27), which keeps the accepted cost of placeLabel (CPSE TICKET-002 SEC-004) checked;
// - 1,000 ms for caller text cut to its lines: the "stops early" check made when GSS TICKET-002
//   security review SEC-001 was resolved (2026-10-13);
// - 2,000 ms for wrapping LONG_TEXT whole: the linear-time check of CPSE TICKET-002's delivery, made
//   for the GSV TICKET-001 security review's note that the layout kit bounds the work on long text.
// Measured p95s over four runs, load averages 7 to 11 (2026-10-31): 450 to 500 ms (x,y), 570 to
// 860 ms (x,y,z), 21 to 60 ms (words), 235 to 575 ms (one word) and 59 to 97 ms (whole text). The
// words and whole-text bounds are wide: splitting the text 40 times over still passed them (code
// review CR-001).
//
// Run by iterations alone (`fixedRuns`): exactly 21 timed runs, after 2 warm-up runs. The p95 of 21
// runs is the second slowest, so one stray run (a collection, a load spike) cannot decide it alone.
const SAMPLES = 21;
const WARMUP = 2;
// Vitest may warn that a case reads module export getters many times: the package's own modules, as
// Vitest transforms them. Each line says so, so the log explains itself.
const GETTERS = "Vitest's export-getter warning above, if any, only adds to this time";

/**
 * Before each run, untimed: lets timers fire between the runs, so a case past its time-out is
 * stopped there. Each run is one synchronous call, so without this no timer would fire until the
 * last one ended: a layout about 20 times slower ran for 4 to 6 minutes before failing.
 */
const betweenRuns = { beforeEach: () => new Promise<void>((resolve) => setImmediate(resolve)) };

interface Case {
  requirement: string;
  name: string;
  limitMs: number;
  /** Where the limit comes from, printed on the measurement's line. */
  note: string;
  /** One call, checked: the timed call must do the work named, not fall back to something cheaper. */
  prove: () => void;
  run: () => void;
}

const layouts: Case[] = [
  { name: "x,y graph, 1,000 points and 700 segments labeled at one spot", description: costlyXyDescription() },
  { name: "x,y,z graph, 1,000 points labeled at one spot, with guide lines", description: costlyXyzDescription() },
].map(({ name, description }) => ({
  requirement: "CPSE-REQ-018",
  name,
  limitMs: 1_500,
  note: `the bound of NLC TICKET-003 security review SEC-003; ${GETTERS}`,
  prove: () => {
    const graph = createGraph(description);
    if (!graph.ok) throw new Error(JSON.stringify(graph.issues));
  },
  run: () => {
    createGraph(description);
  },
}));

const texts: Case[] = [
  ...CALLER_TEXT_UNITS.map((unit) => {
    const text = callerText(unit, 2_000_000);
    return {
      requirement: "GSS TICKET-002 SEC-001",
      name: `wrap, 2,000,000 characters of ${JSON.stringify(unit)} cut to 4 lines`,
      limitMs: 1_000,
      note: `the bound of its stops-early check; ${GETTERS}`,
      prove: () => expect(wrap(text, 160, 14, 4)).toHaveLength(4),
      run: () => {
        wrap(text, 160, 14, 4);
      },
    };
  }),
  {
    requirement: "prd/TC-011",
    name: `wrap, ${LONG_TEXT.length.toLocaleString("en-US")} characters whole`,
    limitMs: 2_000,
    note: `the bound of its linear-time check, CPSE TICKET-002; ${GETTERS}`,
    prove: () => expect(wrap(LONG_TEXT, 200, 14).length).toBeGreaterThan(1000),
    run: () => {
      wrap(LONG_TEXT, 200, 14);
    },
  },
];

describe("hostile inputs' cost (CPSE-REQ-018; GSS TICKET-002 security review SEC-001; prd/TC-011)", () => {
  for (const { requirement, name, limitMs, note, prove, run } of [...layouts, ...texts]) {
    // Twice what every call takes at the limit; a case slower than that fails as a time-out.
    test(`${name}: p95 at most ${limitMs} ms`, { timeout: 2 * (1 + WARMUP + SAMPLES) * limitMs }, async ({ bench }) => {
      prove();
      const result = await bench(name, betweenRuns, run).run({ ...fixedRuns(SAMPLES), warmupTime: 0, warmupIterations: WARMUP });
      expectP95(result, { requirement, name, limitMs, minSamples: SAMPLES, note });
    });
  }
});
