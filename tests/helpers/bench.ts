import { expect } from "vitest";

/** What `bench(...).run()` resolves to, as far as the p95 needs it. */
interface BenchResult {
  latency: { samples?: readonly number[] | undefined };
}

export interface P95Check {
  /**
   * The requirement the benchmark verifies, printed first on its line, e.g. "NLC-NFR-008"; or, for a
   * bound no requirement states, the constraint or security finding it comes from, e.g. "GSS TICKET-002
   * SEC-001".
   */
  requirement: string;
  name: string;
  limitMs: number;
  /**
   * The fewest timed runs a p95 is taken over. The benchmarks run a fixed number of iterations
   * (`time: 0`), so this fails only on a misconfigured run, never on a slow runner (CPSE TICKET-010).
   */
  minSamples?: number;
  /** Printed after the measurement, for anything the log should explain. */
  note?: string;
}

/**
 * The run options that make a benchmark exactly `runs` timed runs long on any runner, however slow:
 * spread them into `.run({ ...fixedRuns(n), warmupTime: ... })`. In tinybench's sequential mode both
 * `time` and `iterations` are minimums (a task keeps running while `elapsed < time || samples <
 * iterations`), so `time: 0` is what makes `iterations` the exact count; with the default `time` a
 * fast task runs far more than `iterations` and a slow one is cut short of the samples a p95 needs
 * (CPSE TICKET-010). Keep `runs` at or above the `minSamples` of the `expectP95` that follows.
 */
export function fixedRuns(runs: number): { time: 0; iterations: number } {
  return { time: 0, iterations: runs };
}

/**
 * Asserts a benchmark's p95 is within its limit, and prints the measurement on every run so the CI
 * log records it. Latencies are in milliseconds, sorted ascending, kept by Vitest's
 * `benchmark.retainSamples`. The one p95 rule every benchmark uses (rulers NLC TICKET-004 quality
 * review QR-005).
 */
export function expectP95(result: BenchResult, { requirement, name, limitMs, minSamples = 100, note }: P95Check): number {
  const { p95, runs } = p95Of(result);
  const summary = `${name}: p95 ${p95.toFixed(4)} ms over ${runs} runs`;
  console.log(`${requirement} ${summary}${note === undefined ? "" : ` (${note})`}`);
  expect(runs, `${summary}: fewer than ${minSamples} runs`).toBeGreaterThanOrEqual(minSamples);
  expect(p95, summary).toBeLessThanOrEqual(limitMs);
  return p95;
}

export interface RatioCheck extends Omit<P95Check, "limitMs"> {
  /** The p95 of `referenceWork`, in milliseconds, timed on the same runner just before the benchmark. */
  referenceP95: number;
  /** The most the benchmark's p95 may be, as a multiple of `referenceP95`. */
  maxRatio: number;
}

/**
 * Asserts a benchmark's p95 is at most `maxRatio` times the reference's p95 on the same runner, and
 * prints both and their ratio on every run so the CI log records them. For bounds that must hold on
 * runners whose speed varies (CI run 41520497667): an absolute limit fails a sound build on a slow
 * runner, and a ratio to work that ran on the same runner does not.
 */
export function expectRatio(result: BenchResult, { requirement, name, referenceP95, maxRatio, minSamples = 100, note }: RatioCheck): number {
  const { p95, runs } = p95Of(result);
  const ratio = p95 / referenceP95;
  const summary = `${name}: p95 ${p95.toFixed(4)} ms over ${runs} runs, ${ratio.toFixed(2)} times the reference's ${referenceP95.toFixed(4)} ms (at most ${maxRatio})`;
  console.log(`${requirement} ${summary}${note === undefined ? "" : ` (${note})`}`);
  expect(runs, `${summary}: fewer than ${minSamples} runs`).toBeGreaterThanOrEqual(minSamples);
  expect(ratio, summary).toBeLessThanOrEqual(maxRatio);
  return ratio;
}

/** The p95 of the timed runs, and how many there were: the one rule both checks use. */
export function p95Of(result: BenchResult): { p95: number; runs: number } {
  const samples = result.latency.samples;
  if (samples === undefined || samples.length === 0) throw new Error("No latency samples were kept; set benchmark.retainSamples");
  return { p95: samples[Math.floor(samples.length * 0.95)]!, runs: samples.length };
}

/** What `referenceWork` returns: the same on every runner, as the work is deterministic. */
export const REFERENCE_CHECKSUM = 966_423_432;

/**
 * Fixed work that times how fast this runner is, to scale a time bound by (`expectRatio`). It is
 * plain JavaScript and calls none of the package's code, so a slower package cannot slow it and so
 * hide behind it. Its work is the kind the package's costly paths do, so a runner slow at that is
 * slow here too: labels placed at the first of a few spots clear of every line and label before
 * them, through `some`, each line test allocating its small arrays (the shape of label placement,
 * whose allocation keeps the collector busy); numbers in a typed array sorted and summed; and a long
 * string built and scanned (the shape of `wrap`). From a fixed seed, so every run does the same work;
 * the result is a checksum the caller compares to `REFERENCE_CHECKSUM`, so no step can be dropped as
 * unused.
 */
export function referenceWork(): number {
  let state = 1;
  const next = () => (state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0) / 4_294_967_296;
  const obstacles: Array<Rect | Line> = Array.from({ length: LINES }, () => ({ x1: next() * 400, y1: next() * 400, x2: next() * 400, y2: next() * 400 }));
  let moved = 0;
  for (let i = 0; i < LABELS; i++) {
    const [x, y, width, height] = [next() * 400, next() * 400, 2 + next() * 6, 2 + next() * 3];
    let rect: Rect | undefined;
    for (let tries = 0; tries < 4 && rect === undefined; tries++) {
      const candidate = { x: x + tries * width, y: y - tries * height, width, height };
      if (obstacles.some((obstacle) => ("x1" in obstacle ? lineCrosses(obstacle, candidate) : rectsOverlap(candidate, obstacle)))) moved++;
      else rect = candidate;
    }
    obstacles.push(rect ?? { x, y, width, height });
  }
  const values = new Float64Array(500_000);
  for (let i = 0; i < values.length; i++) values[i] = next();
  values.sort();
  let weighted = 0;
  for (let i = 0; i < values.length; i++) weighted += values[i]! * (i % 7);
  const text = Array.from({ length: 100_000 }, (_, i) => values[(i * 7_919) % values.length]!.toFixed(6)).join(" ");
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  return (moved ^ Math.floor(weighted) ^ hash) >>> 0;
}

const LINES = 300;
const LABELS = 3_500;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Whether a line passes through a rectangle (Liang–Barsky clipping), written apart from the package's own. */
function lineCrosses(line: Line, rect: Rect): boolean {
  const [dx, dy] = [line.x2 - line.x1, line.y2 - line.y1];
  let [enter, leave] = [0, 1];
  const sides: ReadonlyArray<readonly [number, number]> = [
    [-dx, line.x1 - rect.x],
    [dx, rect.x + rect.width - line.x1],
    [-dy, line.y1 - rect.y],
    [dy, rect.y + rect.height - line.y1],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q <= 0) return false;
    } else if (p < 0) {
      enter = Math.max(enter, q / p);
    } else {
      leave = Math.min(leave, q / p);
    }
  }
  return enter < leave;
}
