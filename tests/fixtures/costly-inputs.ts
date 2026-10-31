// The package's costliest hostile inputs, bounded twice: the tests count the work they cause
// (tests/react/Graph.test.tsx, tests/layout/kit/text.test.ts) and tests/layout/hostile-cost.bench.ts
// times it as a p95. Both build them from here, so the input counted and the input timed cannot drift
// apart (graph-library CPSE TICKET-010 code review CR-001, security review SEC-001).

/**
 * The x,y graph's costliest labels: 1,000 labeled points stacked at one spot and 700 labeled
 * segments there, each label tried against every obstacle placed before it (NLC TICKET-003
 * security review SEC-003).
 */
export function costlyXyDescription() {
  const points = Array.from({ length: 1000 }, () => ({ x: 5, y: 5, label: "a" }));
  const segments = Array.from({ length: 700 }, (_, i) => ({ from: { x: 5, y: 5 }, to: { x: 5 + (i + 1) / 1000, y: 5 }, label: "a" }));
  return { type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 }, points, segments };
}

/** The x,y,z graph's costliest labels: 1,000 labeled points stacked at one spot, with guide lines (NLC TICKET-004). */
export function costlyXyzDescription() {
  const points = Array.from({ length: 1000 }, () => ({ x: 3, y: 2, z: 4, label: "a" }));
  return { type: "xyz-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 0, max: 5 }, zAxis: { min: 0, max: 5 }, guideLines: true, points };
}

/** What caller text is made of in the "stops early" checks: many words, or one unbroken word. */
export const CALLER_TEXT_UNITS = ["word ", "@"] as const;

/** `characters` characters of `unit` repeated: caller text far past any label's lines (GSS TICKET-002 security review SEC-001). */
export const callerText = (unit: string, characters: number): string => unit.repeat(characters / unit.length);

/** The text `wrap` must handle in linear time: 100,000 words, then one 200,000-character word. */
export const LONG_TEXT = "word ".repeat(100_000) + "x".repeat(200_000);
