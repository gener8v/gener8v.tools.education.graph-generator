import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import type { NumberLine } from "../../src/core/definitions/number-line";
import { type XyGraph, planeRooms } from "../../src/core/definitions/xy-graph";
import { type XyzGraph, xyzRooms } from "../../src/core/definitions/xyz-graph";
import { defaultStyle } from "../../src/core/style";
import { niceTicks } from "../../src/core/value-scale";
import { isometric } from "../../src/layout/kit/isometric";
import { linearScale } from "../../src/layout/kit/scale";
import { numberLineLayout } from "../../src/layout/number-line";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { xyGraphLayout } from "../../src/layout/xy-graph";
import { AXIS_LENGTH, xyzGraphLayout } from "../../src/layout/xyz-graph";
import { numberLineArb, xyGraphArb, xyzGraphArb } from "../fixtures/nlc-generators";
import { attr } from "../fixtures/scene-geometry";

// NLC-NFR-001: every tick, point and segment endpoint of a number line, x,y graph or x,y,z graph is
// drawn within 0.5 px of the position computed from its value, at the default size (one Scene unit
// is one pixel at the 400-unit default width). Positions are read from the Scene; the expected ones
// are computed here from the values: a linear scale over the drawn axis, or `isometric()` of the
// scaled value for the x,y,z graph. The existing per-type tests pin examples; these run generated
// descriptions (graph-library NLC TICKET-005).
const RUNS = 200;
const TOLERANCE = 0.5;

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const lengthOf = (node: SceneNode) => Math.hypot(num(node, "x2") - num(node, "x1"), num(node, "y2") - num(node, "y1"));
const circles = (scene: Scene) => scene.nodes.filter((node) => node.kind === "circle");
/** The axes and their ticks: not grid lines, dashed guide lines or segments (a figure line is wider than an axis). */
const axisNodes = (scene: Scene) =>
  lines(scene).filter((node) => attr(node, "stroke") !== defaultStyle.colors.grid && attr(node, "stroke-dasharray") === undefined && num(node, "stroke-width") !== defaultStyle.lineWidths.figure);
const isTick = (node: SceneNode) => lengthOf(node) <= defaultStyle.tickLength + 0.02;
const near = (got: number, want: number, what: string) => expect(Math.abs(got - want), `${what}: drawn ${got}, computed ${want}`).toBeLessThanOrEqual(TOLERANCE);

function normalized<T>(description: unknown): { description: T; provenance: ReturnType<typeof validate> extends infer R ? (R extends { valid: true; provenance: infer P } ? P : never) : never } {
  const result = validate(description);
  if (!result.valid) throw new Error(`the generator gave an invalid description: ${JSON.stringify(result.issues)}`);
  return { description: result.description as T, provenance: result.provenance };
}

/** Runs a property over `RUNS` valid samples and returns how many it checked. */
function check<T>(arbitrary: fc.Arbitrary<T>, property: (sample: T) => void): number {
  let seen = 0;
  fc.assert(
    fc.property(arbitrary, (sample) => {
      property(sample);
      seen++;
    }),
    { numRuns: RUNS },
  );
  return seen;
}

describe("a number line is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts every tick and point within ${TOLERANCE} of its linearly scaled value, over ${RUNS} generated descriptions`, () => {
    const seen = check(numberLineArb, (input) => {
      const { description, provenance } = normalized<NumberLine>(input);
      const scene = numberLineLayout(description, provenance);
      const { min, max } = description.axis;
      const axis = lines(scene).find((node) => num(node, "y1") === num(node, "y2") && num(node, "x2") - num(node, "x1") > 100)!;
      const xOf = linearScale([min, max], [num(axis, "x1"), num(axis, "x2")]);
      const marks = lines(scene).filter((node) => node !== axis && num(node, "x1") === num(node, "x2"));
      const expected = niceTicks(min, max, Object.hasOwn(description.axis, "tickSpacing") ? description.axis.tickSpacing : undefined).ticks;
      expect(marks, JSON.stringify(input)).toHaveLength(expected.length);
      marks.forEach((mark, i) => near(num(mark, "x1"), xOf(expected[i]!), `tick ${expected[i]}`));
      const points = description.points ?? [];
      const drawn = circles(scene);
      expect(drawn, JSON.stringify(input)).toHaveLength(points.length);
      drawn.forEach((marker, i) => near(num(marker, "cx"), xOf(points[i]!.value), `point ${points[i]!.value}`));
    });
    expect(seen).toBeGreaterThanOrEqual(RUNS);
  });
});

describe("an x,y graph is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts every tick, point and segment endpoint within ${TOLERANCE} of its linearly scaled value, over ${RUNS} generated descriptions`, () => {
    const seen = check(xyGraphArb, (input) => {
      const { description, provenance } = normalized<XyGraph>(input);
      const scene = xyGraphLayout(description, provenance);
      const { xAxis, yAxis } = description;
      const [xLine, yLine] = axisNodes(scene).filter((node) => !isTick(node));
      // The x-axis is drawn first, level; the y-axis second, upright, from its min (bottom) to its max (top).
      expect([xLine && num(xLine, "y1") === num(xLine, "y2"), yLine && num(yLine, "x1") === num(yLine, "x2")], JSON.stringify(input)).toEqual([true, true]);
      const xOf = linearScale([xAxis.min, xAxis.max], [num(xLine!, "x1"), num(xLine!, "x2")]);
      const yOf = linearScale([yAxis.min, yAxis.max], [num(yLine!, "y1"), num(yLine!, "y2")]);
      const rooms = planeRooms(description);
      const own = (axis: { tickSpacing?: number }) => (Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined);
      const [xTicks, yTicks] = [niceTicks(xAxis.min, xAxis.max, own(xAxis), rooms.x).ticks, niceTicks(yAxis.min, yAxis.max, own(yAxis), rooms.y).ticks];
      const marks = axisNodes(scene).filter(isTick);
      const across = marks.filter((mark) => num(mark, "y1") === num(mark, "y2"));
      const upright = marks.filter((mark) => num(mark, "x1") === num(mark, "x2"));
      expect(upright, JSON.stringify(input)).toHaveLength(xTicks.length);
      expect(across, JSON.stringify(input)).toHaveLength(yTicks.length);
      upright.forEach((mark, i) => near(num(mark, "x1"), xOf(xTicks[i]!), `x tick ${xTicks[i]}`));
      across.forEach((mark, i) => near(num(mark, "y1"), yOf(yTicks[i]!), `y tick ${yTicks[i]}`));
      const points = description.points ?? [];
      const drawn = circles(scene);
      expect(drawn, JSON.stringify(input)).toHaveLength(points.length);
      drawn.forEach((marker, i) => {
        near(num(marker, "cx"), xOf(points[i]!.x), `point ${i} x`);
        near(num(marker, "cy"), yOf(points[i]!.y), `point ${i} y`);
      });
      const segments = description.segments ?? [];
      const drawnSegments = lines(scene).filter((node) => num(node, "stroke-width") === defaultStyle.lineWidths.figure);
      expect(drawnSegments, JSON.stringify(input)).toHaveLength(segments.length);
      drawnSegments.forEach((node, i) => {
        const { from, to } = segments[i]!;
        near(num(node, "x1"), xOf(from.x), `segment ${i} from x`);
        near(num(node, "y1"), yOf(from.y), `segment ${i} from y`);
        near(num(node, "x2"), xOf(to.x), `segment ${i} to x`);
        near(num(node, "y2"), yOf(to.y), `segment ${i} to y`);
      });
    });
    expect(seen).toBeGreaterThanOrEqual(RUNS);
  });
});

describe("an x,y,z graph is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts every axis end, tick and point within ${TOLERANCE} of isometric() of its scaled value, over ${RUNS} generated descriptions`, () => {
    const seen = check(xyzGraphArb, (input) => {
      const { description, provenance } = normalized<XyzGraph>(input);
      const scene = xyzGraphLayout(description, provenance);
      const axes = { x: description.xAxis, y: description.yAxis, z: description.zAxis };
      const names = ["x", "y", "z"] as const;
      // The axes meet at zero, or at the nearest end of a range that excludes it; each value is
      // scaled from there, AXIS_LENGTH for the whole range, and projected by isometric() alone.
      const meet = Object.fromEntries(names.map((name) => [name, Math.min(axes[name].max, Math.max(axes[name].min, 0))])) as Record<(typeof names)[number], number>;
      const unit = (name: (typeof names)[number], value: number) => ((value - meet[name]) * AXIS_LENGTH) / (axes[name].max - axes[name].min);
      const raw = (x: number, y: number, z: number) => isometric(unit("x", x), unit("y", y), unit("z", z));
      const nodes = axisNodes(scene);
      const starts = nodes.flatMap((node, i) => (isTick(node) ? [] : [i]));
      expect(starts, JSON.stringify(input)).toHaveLength(3);
      // The one translation: the page position of the x-axis's min end, which the layout centers.
      const [rx, ry] = raw(axes.x.min, meet.y, meet.z);
      const [dx, dy] = [num(nodes[starts[0]!]!, "x1") - rx, num(nodes[starts[0]!]!, "y1") - ry];
      const at = (name: (typeof names)[number], value: number): [number, number] => {
        const [px, py] = raw(name === "x" ? value : meet.x, name === "y" ? value : meet.y, name === "z" ? value : meet.z);
        return [px + dx, py + dy];
      };
      const rooms = xyzRooms(description);
      names.forEach((name, k) => {
        const line = nodes[starts[k]!]!;
        const axis = axes[name];
        const [fromX, fromY] = at(name, axis.min);
        const [toX, toY] = at(name, axis.max);
        near(num(line, "x1"), fromX, `${name} min end x`);
        near(num(line, "y1"), fromY, `${name} min end y`);
        near(num(line, "x2"), toX, `${name} max end x`);
        near(num(line, "y2"), toY, `${name} max end y`);
        const ticks = niceTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined, rooms[name]).ticks;
        const marks = nodes.slice(starts[k]! + 1, starts[k + 1] ?? nodes.length);
        expect(marks, `${name} ticks of ${JSON.stringify(input)}`).toHaveLength(ticks.length);
        marks.forEach((mark, i) => {
          const [wantX, wantY] = at(name, ticks[i]!);
          near((num(mark, "x1") + num(mark, "x2")) / 2, wantX, `${name} tick ${ticks[i]} x`);
          near((num(mark, "y1") + num(mark, "y2")) / 2, wantY, `${name} tick ${ticks[i]} y`);
        });
      });
      const points = description.points ?? [];
      const drawn = circles(scene);
      expect(drawn, JSON.stringify(input)).toHaveLength(points.length);
      drawn.forEach((marker, i) => {
        const [wantX, wantY] = raw(points[i]!.x, points[i]!.y, points[i]!.z);
        near(num(marker, "cx"), wantX + dx, `point ${i} x`);
        near(num(marker, "cy"), wantY + dy, `point ${i} y`);
      });
    });
    expect(seen).toBeGreaterThanOrEqual(RUNS);
  });
});
