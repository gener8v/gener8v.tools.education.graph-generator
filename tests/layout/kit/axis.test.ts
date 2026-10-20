import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { defaultStyle } from "../../../src/core/style";
import { type AxisOptions, type AxisSide, drawAxis } from "../../../src/layout/kit/axis";
import { checkScene } from "../../../src/layout/kit/check";
import { fmt } from "../../../src/layout/kit/format";
import { linearScale } from "../../../src/layout/kit/scale";
import { niceTicks } from "../../../src/layout/kit/ticks";
import type { SceneNode } from "../../../src/layout/scene";
import { attr, boundsOf } from "../../fixtures/scene-geometry";

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const lines = (nodes: SceneNode[]) => nodes.filter((node) => node.kind === "line");
const texts = (nodes: SceneNode[]) => nodes.flatMap((node) => (node.kind === "text" ? [node] : []));
const textOf = (node: SceneNode) => (node.kind === "text" ? node.text : "");

/** An axis's options from its range: ticks and spacing from `niceTicks`. */
function axisOf(from: [number, number], to: [number, number], min: number, max: number, extra: Partial<AxisOptions> = {}): AxisOptions {
  const { spacing, ticks } = niceTicks(min, max, extra.spacing);
  return { from, to, domain: [min, max], ticks, spacing, showTickLabels: true, side: "below", ...extra };
}

/** The point midway along a tick line. */
const middleOf = (node: SceneNode): [number, number] => [(num(node, "x1") + num(node, "x2")) / 2, (num(node, "y1") + num(node, "y2")) / 2];

describe("drawAxis (NLC-REQ-004, NLC-REQ-007)", () => {
  it("draws the axis line, then one tick per value, then the labels", () => {
    const nodes = drawAxis(axisOf([20, 100], [380, 100], -10, 10));
    const [axisLine, ...ticks] = lines(nodes);
    expect([num(axisLine!, "x1"), num(axisLine!, "y1"), num(axisLine!, "x2"), num(axisLine!, "y2")]).toEqual([20, 100, 380, 100]);
    expect(ticks).toHaveLength(11);
    expect(texts(nodes).map(textOf)).toEqual(["-10", "-8", "-6", "-4", "-2", "0", "2", "4", "6", "8", "10"]);
    // Labels come after every line, so no tick is drawn over a label.
    expect(nodes.findIndex((node) => node.kind === "text")).toBe(12);
    expect(checkScene({ width: 400, height: fmt(200), textAlternative: "An axis.", nodes })).toEqual([]);
  });

  it.each([
    ["horizontal", [20, 100], [380, 100]],
    ["vertical, upward", [60, 380], [60, 20]],
    ["diagonal", [200, 200], [40, 292.4]],
  ] as const)("puts each tick within 0.5 units of linearScale(value) along a %s axis", (_, from, to) => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), fc.double({ min: -3, max: 6, noNaN: true }), (min, logWidth) => {
        const max = min + 10 ** logWidth;
        const options = axisOf([from[0], from[1]], [to[0], to[1]], min, max);
        const xAt = linearScale([min, max], [from[0], to[0]]);
        const yAt = linearScale([min, max], [from[1], to[1]]);
        const ticks = lines(drawAxis(options)).slice(1);
        expect(ticks).toHaveLength(options.ticks.length);
        ticks.forEach((tick, i) => {
          const [x, y] = middleOf(tick);
          const value = options.ticks[i]!;
          expect(Math.hypot(x - xAt(value), y - yAt(value))).toBeLessThanOrEqual(0.5);
        });
      }),
      { numRuns: 100 },
    );
  });

  it("draws each tick across the line, perpendicular to it and centered on it", () => {
    const from: [number, number] = [200, 200];
    const to: [number, number] = [40, 292.4];
    const [axisLine, tick] = lines(drawAxis(axisOf(from, to, 0, 10)));
    const along = [to[0] - from[0], to[1] - from[1]];
    const across = [num(tick!, "x2") - num(tick!, "x1"), num(tick!, "y2") - num(tick!, "y1")];
    expect(Math.abs(along[0]! * across[0]! + along[1]! * across[1]!) / Math.hypot(along[0]!, along[1]!)).toBeLessThan(0.02);
    expect(Math.hypot(across[0]!, across[1]!)).toBeCloseTo(defaultStyle.tickLength, 1);
    expect(middleOf(tick!)).toEqual([num(axisLine!, "x1"), num(axisLine!, "y1")]);
  });

  it("passes every number through fmt(): at most two decimals", () => {
    const nodes = drawAxis(axisOf([13.3333333, 101.987654], [377.123456, 99.000001], -3.33333, 7.77777, { spacing: 0.7 }));
    for (const node of nodes) for (const [, value] of node.attrs) if (typeof value === "number") expect(fmt(value)).toBe(value);
    expect(checkScene({ width: 400, height: fmt(200), textAlternative: "An axis.", nodes })).toEqual([]);
  });
});

describe("tick labels", () => {
  it("draw no text when hidden, and still draw every tick (NLC-REQ-006)", () => {
    const shown = drawAxis(axisOf([20, 100], [380, 100], 0, 10));
    const hidden = drawAxis(axisOf([20, 100], [380, 100], 0, 10, { showTickLabels: false }));
    expect(texts(hidden)).toEqual([]);
    expect(lines(hidden)).toEqual(lines(shown));
  });

  it("show the decimals the spacing needs", () => {
    expect(texts(drawAxis(axisOf([20, 100], [380, 100], 0, 1, { spacing: 0.25 }))).map(textOf)).toEqual(["0", "0.25", "0.5", "0.75", "1"]);
  });

  it("write the caller's text at a tick in place of its value (NLC-REQ-019)", () => {
    const labels = new Map([[0.5, "½"]]);
    expect(texts(drawAxis(axisOf([20, 100], [380, 100], 0, 1, { spacing: 0.25, labels }))).map(textOf)).toEqual(["0", "0.25", "½", "0.75", "1"]);
  });

  it("match a custom label to the tick its value stands for, even when the tick is listed at 12 digits (code review CR-007)", () => {
    // The caller writes ⅔ to 12 digits; the tick holds 2 × the spacing.
    const options = axisOf([20, 100], [380, 100], 0, 1, { spacing: 1 / 3, labels: new Map([[0.666666666667, "⅔"]]) });
    expect(options.ticks[2]).not.toBe(0.666666666667);
    expect(texts(drawAxis(options)).map(textOf)[2]).toBe("⅔");
    // A label a hundredth of a spacing off its tick is not drawn there (quality review QR-004).
    const off = axisOf([20, 100], [380, 100], 0, 1, { spacing: 0.25, labels: new Map([[0.5025, "x"]]) });
    expect(texts(drawAxis(off)).map(textOf)).toEqual(["0", "0.25", "0.5", "0.75", "1"]);
  });

  it("are read own-key, so a polluted Object.prototype adds none and breaks no axis (security review SEC-002)", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    const plain = texts(drawAxis(axisOf([20, 100], [380, 100], -3, 3, { spacing: 1 }))).map(textOf);
    for (const polluted of [new Map([[0, "INJECTED"]]), [[0, "INJECTED"]], { notIterable: true }]) {
      Object.defineProperty(prototype, "labels", { value: polluted, configurable: true, writable: true });
      try {
        expect(texts(drawAxis(axisOf([20, 100], [380, 100], -3, 3, { spacing: 1 }))).map(textOf)).toEqual(plain);
      } finally {
        delete prototype["labels"];
      }
    }
  });

  it.each([
    ["below", [200, 200], [40, 292.4]],
    ["above", [200, 200], [40, 292.4]],
    ["below", [20, 300], [380, 92]],
    ["above", [20, 300], [380, 92]],
    ["left", [60, 380], [180, 20]],
    ["right", [60, 380], [180, 20]],
  ] as const)("keep every label clear of a sloping axis line, %s it (quality review QR-007)", (side: AxisSide, from, to) => {
    const nodes = drawAxis(axisOf([from[0], from[1]], [to[0], to[1]], -1000, 1000, { side }));
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
    // Which side of the line a point is on: the sign of the cross product.
    const sideOf = (x: number, y: number) => Math.sign(dx * (y - from[1]) - dy * (x - from[0]));
    const labels = texts(nodes);
    expect(labels.length).toBeGreaterThan(5);
    for (const label of labels) {
      const b = boundsOf(label);
      const corners = [sideOf(b.x0, b.y0), sideOf(b.x1, b.y0), sideOf(b.x0, b.y1), sideOf(b.x1, b.y1)];
      expect(new Set(corners).size, `${textOf(label)}: ${corners}`).toBe(1);
    }
  });

  it.each([
    ["below", [20, 100], [380, 100]],
    ["above", [20, 100], [380, 100]],
    ["left", [60, 380], [60, 20]],
    ["right", [60, 380], [60, 20]],
  ] as const)("sit %s the axis, clear of the ticks", (side: AxisSide, from, to) => {
    const nodes = drawAxis(axisOf([from[0], from[1]], [to[0], to[1]], 0, 10, { side }));
    const ticks = lines(nodes).slice(1);
    texts(nodes).forEach((label, i) => {
      const box = boundsOf(label);
      const tick = boundsOf(ticks[i]!);
      if (side === "below") expect(box.y0).toBeGreaterThanOrEqual(tick.y1);
      if (side === "above") expect(box.y1).toBeLessThanOrEqual(tick.y0);
      if (side === "left") expect(box.x1).toBeLessThanOrEqual(tick.x0);
      if (side === "right") expect(box.x0).toBeGreaterThanOrEqual(tick.x1);
    });
  });
});

describe("options no validated axis gives (security review SEC-004)", () => {
  const sound = () => axisOf([20, 100], [380, 100], 0, 10);
  it.each<[string, Partial<AxisOptions>]>([
    ["an end that is not finite", { from: [Number.NaN, 100] }],
    ["a domain that does not increase", { domain: [0, 0] }],
    ["a domain that is not finite", { domain: [Number.NaN, 10] }],
    ["a spacing of 0", { spacing: 0 }],
    ["an infinite spacing", { spacing: Number.POSITIVE_INFINITY }],
    ["a tick that is not finite", { ticks: [0, Number.NaN] }],
    ["more than 100 ticks", { ticks: Array.from({ length: 101 }, (_, i) => i / 10) }],
    ["labels that are not a Map", { labels: [[0, "a"]] as unknown as ReadonlyMap<number, string> }],
    ["more than 100 labels", { labels: new Map(Array.from({ length: 101 }, (_, i) => [i, "a"])) }],
  ])("throw on %s rather than drawing it", (_, extra) => {
    expect(() => drawAxis({ ...sound(), ...extra })).toThrow(RangeError);
  });

  it("draw a range near zero that excludes zero with no tick off the axis (security review SEC-001)", () => {
    const nodes = drawAxis(axisOf([20, 100], [380, 100], 0.001, 0.002, { spacing: 2e9 }));
    expect(lines(nodes)).toHaveLength(1);
    expect(texts(nodes)).toEqual([]);
  });
});
