import { describe, expect, test, type Bench } from "vitest";
import { createGraph } from "../../src/graph";
import { wrap } from "../../src/layout/kit/text";
import { CALLER_TEXT_UNITS, LONG_TEXT, callerText, costlyXyDescription, costlyXyzDescription } from "../fixtures/costly-inputs";
import { REFERENCE_CHECKSUM, expectRatio, fixedRuns, p95Of, referenceWork } from "../helpers/bench";

// The package's costliest hostile inputs stay within their time bound at p95 on a CI runner
// (graph-library CPSE TICKET-010 code review CR-001, security review SEC-001). The tests count the
// work these inputs cause (tests/react/Graph.test.tsx, tests/layout/kit/text.test.ts), which pins its
// shape but not what each step costs. This times the whole call, so a slower overlap test or a scan
// outside the label placer fails here. Runs through `pnpm bench`, not `pnpm test`.
//
// Each bound is a multiple of the reference work's p95 (`referenceWork`), timed on the same runner
// just before the case, not a number of milliseconds: GitHub's runners vary about 2 times in speed,
// and the x,y,z case's absolute bound failed a sound build (CI run 41520497667: p95 2,336 to 2,549 ms
// against 1,500, where runs 41513107700 and 41516519565 measured 1,067 to 1,338 ms of the same code).
// The reference is plain JavaScript and calls none of the package's code, so a slower placer or
// `wrap` cannot slow it too and hide behind it. The bounds were these limits, now `maxRatio`:
// - 1,500 ms for each layout: the bound NLC TICKET-003 security review SEC-003 was resolved on
//   (2026-10-27), which keeps the accepted cost of placeLabel (CPSE TICKET-002 SEC-004) checked;
// - 1,000 ms for caller text cut to its lines: the "stops early" check made when GSS TICKET-002
//   security review SEC-001 was resolved (2026-10-13);
// - 2,000 ms for wrapping LONG_TEXT whole: the linear-time check of CPSE TICKET-002's delivery, made
//   for the GSV TICKET-001 security review's note that the layout kit bounds the work on long text.
// Each case's ratio measured here (2026-11-02, 14 cores): quiet and loaded, two benches at once,
// beside a whole `pnpm bench` or test run, and beside 14 to 28 busy loops (the reference then 1.6 to
// 3.3 times slower): x,y 2.68 to 3.72; x,y,z 2.25 to 3.84, and 6.04 in one run whose x,y,z runs
// alone took 514 to 941 ms; words 0.11 to 0.16; one word 1.35 to 2.25; whole text 0.38 to 0.53. CI
// ran each case 1.9 to 4.6 times slower than here (runs 41513107700, 41516519565, 41520497667); if
// the reference slows only 2 times there, a ratio there is up to half that factor times its typical
// ratio here: x,y 4.8, x,y,z 8.5, words 0.24, one word 3.2, whole text 0.76. Each `maxRatio` is at
// least twice the larger of that and the worst here. At the reference's 150 ms here, the x,y and
// one-word bounds are about the old limits; the x,y,z bound is wider, for its runs that take twice
// as long with the reference unchanged; the words and whole-text bounds are narrower.
//
// Run by iterations alone (`fixedRuns`): exactly 21 timed runs, after 2 warm-up runs, the reference
// as well. The p95 of 21 runs is the second slowest, so one stray run (a collection, a load spike)
// cannot decide it alone. The reference's p95, not its median, so both sides of the ratio are the
// same statistic of as many runs on the same runner, and a runner whose slow runs come in bursts
// raises both. Timed again before each case, not once for the file, as the runner's speed drifts
// while the file runs.
const SAMPLES = 21;
const WARMUP = 2;
const REFERENCE = "reference work, plain JavaScript (runner speed)";
// Vitest may warn that a case reads module export getters many times: the package's own modules, as
// Vitest transforms them. Each line says so, so the log explains itself.
const GETTERS = "Vitest's export-getter warning above, if any, only adds to this time";
/**
 * Every case's time-out, a backstop only: a case over its bound stops at its second timed run over
 * it (`stopOnceOver`), so the time-out need not bound the cost as well, which no fixed number of
 * milliseconds can do on runners of every speed.
 */
const BACKSTOP_MS = 600_000;

/**
 * Before each run, untimed: lets timers fire between the runs, so a case past its time-out is
 * stopped there. Each run is one synchronous call, so without this no timer would fire until the
 * last one ended: a layout about 20 times slower ran for 4 to 6 minutes before failing.
 */
const betweenRuns = { beforeEach: () => new Promise<void>((resolve) => setImmediate(resolve)) };

const runs = { ...fixedRuns(SAMPLES), warmupTime: 0, warmupIterations: WARMUP };

/** The reference's p95 on this runner now, checked to do the same work it always does. */
async function referenceP95(bench: Bench): Promise<number> {
  expect(referenceWork(), "the reference work's result changed: it no longer does the same work").toBe(REFERENCE_CHECKSUM);
  const result = await bench(REFERENCE, betweenRuns, () => {
    if (referenceWork() !== REFERENCE_CHECKSUM) throw new Error("The reference work's result changed between runs");
  }).run(runs);
  const { p95, runs: timed } = p95Of(result);
  expect(timed, `${REFERENCE}: fewer than ${SAMPLES} runs`).toBeGreaterThanOrEqual(SAMPLES);
  return p95;
}

/**
 * `run`, stopped at its second timed run slower than `maxRatio` times the reference. The p95 of 21
 * runs is the second slowest, so it is then over the bound whatever the other runs take: a case 30
 * times slower fails there, on its bound, rather than running every run to a time-out.
 */
function stopOnceOver(name: string, maxRatio: number, referenceP95: number, run: () => void): () => void {
  const limitMs = maxRatio * referenceP95;
  let calls = 0;
  const over: number[] = [];
  return () => {
    const start = performance.now();
    run();
    const ms = performance.now() - start;
    if (++calls <= WARMUP || ms <= limitMs || over.push(ms) < 2) return;
    const times = over.map((t) => `${t.toFixed(0)} ms (${(t / referenceP95).toFixed(2)} times)`).join(" and ");
    throw new Error(`${name}: two timed runs took ${times} the reference's ${referenceP95.toFixed(0)} ms, over the bound of ${maxRatio} times, so the p95 is over it too`);
  };
}

interface Case {
  requirement: string;
  name: string;
  /** The most the case's p95 may be, as a multiple of the reference's p95. */
  maxRatio: number;
  /** Where the bound comes from, printed on the measurement's line. */
  note: string;
  /** One call, checked: the timed call must do the work named, not fall back to something cheaper. */
  prove: () => void;
  run: () => void;
}

const layouts: Case[] = [
  { name: "x,y graph, 1,000 points and 700 segments labeled at one spot", description: costlyXyDescription(), maxRatio: 10 },
  { name: "x,y,z graph, 1,000 points labeled at one spot, with guide lines", description: costlyXyzDescription(), maxRatio: 18 },
].map(({ name, description, maxRatio }) => ({
  requirement: "CPSE-REQ-018",
  name,
  maxRatio,
  note: `was 1,500 ms, the bound of NLC TICKET-003 security review SEC-003; ${GETTERS}`,
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
      // Words: 1, not the 0.5 first set — CI run 41565297993 measured 0.13 to 0.35, too little
      // headroom for a case this short (57 to 85 ms); still about five times tighter than 1,000 ms.
      maxRatio: unit === "@" ? 7 : 1,
      note: `was 1,000 ms, the bound of its stops-early check; ${GETTERS}`,
      prove: () => expect(wrap(text, 160, 14, 4)).toHaveLength(4),
      run: () => {
        wrap(text, 160, 14, 4);
      },
    };
  }),
  {
    requirement: "prd/TC-011",
    name: `wrap, ${LONG_TEXT.length.toLocaleString("en-US")} characters whole`,
    maxRatio: 2,
    note: `was 2,000 ms, the bound of its linear-time check, CPSE TICKET-002; ${GETTERS}`,
    prove: () => expect(wrap(LONG_TEXT, 200, 14).length).toBeGreaterThan(1000),
    run: () => {
      wrap(LONG_TEXT, 200, 14);
    },
  },
];

describe("hostile inputs' cost (CPSE-REQ-018; GSS TICKET-002 security review SEC-001; prd/TC-011)", () => {
  for (const { requirement, name, maxRatio, note, prove, run } of [...layouts, ...texts]) {
    test(`${name}: p95 at most ${maxRatio} times the reference's`, { timeout: BACKSTOP_MS }, async ({ bench }) => {
      prove();
      const reference = await referenceP95(bench);
      const result = await bench(name, betweenRuns, stopOnceOver(name, maxRatio, reference, run)).run(runs);
      expectRatio(result, { requirement, name, referenceP95: reference, maxRatio, minSamples: SAMPLES, note });
    });
  }
});
