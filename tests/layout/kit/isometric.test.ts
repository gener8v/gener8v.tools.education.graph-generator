import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ELLIPSE_RATIO, ISO_SCALE, type Point3, VIEW_DIRECTION, VISIBLE_FACES, faceVisible, isoEllipse, isometric } from "../../../src/layout/kit/isometric";

const AXES: Record<"x" | "y" | "z", Point3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const project = (p: Point3) => isometric(p[0], p[1], p[2]);
const drawnLength = (a: Point3, b: Point3) => {
  const [ax, ay] = project(a);
  const [bx, by] = project(b);
  return Math.hypot(bx - ax, by - ay);
};
/** The angle of a projected axis, in degrees counterclockwise from the page's right, with y up the page. */
const angleOf = (axis: Point3) => {
  const [x, y] = project(axis);
  return (Math.atan2(-y, x) * 180) / Math.PI;
};
const finite = fc.double({ min: -1e3, max: 1e3, noNaN: true });
const point = fc.tuple(finite, finite, finite);

describe("the isometric viewpoint (GSS-REQ-032, AD-009)", () => {
  it("draws z straight up, x toward the lower left and y toward the lower right, 120° apart", () => {
    expect(angleOf(AXES.z)).toBeCloseTo(90, 9);
    expect(angleOf(AXES.x)).toBeCloseTo(-150, 9);
    expect(angleOf(AXES.y)).toBeCloseTo(-30, 9);
  });

  it("puts the origin at (0, 0), with y down the page", () => {
    expect(isometric(0, 0, 0).map((n) => n + 0)).toEqual([0, 0]);
    expect(isometric(0, 0, 1)[1]).toBeLessThan(0);
  });

  it(`foreshortens every axis equally, by ISO_SCALE = √(2/3)`, () => {
    expect(ISO_SCALE).toBeCloseTo(0.816496580927726, 12);
    for (const axis of Object.values(AXES)) expect(Math.abs(drawnLength([0, 0, 0], axis) - ISO_SCALE)).toBeLessThan(1e-12);
  });

  it("draws equal lengths along any of the three axes equally long, within 1e-9, wherever they start", () => {
    fc.assert(
      fc.property(point, fc.double({ min: 0, max: 1e3, noNaN: true }), (start, length) => {
        const drawn = Object.values(AXES).map((axis) => drawnLength(start, [start[0] + axis[0] * length, start[1] + axis[1] * length, start[2] + axis[2] * length]));
        for (const d of drawn) expect(Math.abs(d / ISO_SCALE - length)).toBeLessThanOrEqual(1e-9 * Math.max(1, length));
      }),
    );
  });

  it("is linear, so a figure moved in space moves on the page by the projection of the move", () => {
    fc.assert(
      fc.property(point, point, (a, b) => {
        const [sx, sy] = project([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
        const [ax, ay] = project(a);
        const [bx, by] = project(b);
        expect(Math.abs(sx - (ax + bx))).toBeLessThan(1e-9);
        expect(Math.abs(sy - (ay + by))).toBeLessThan(1e-9);
      }),
    );
  });

  it("sends the view direction to a single point: the viewer looks along (1, 1, 1)", () => {
    const [x, y] = isometric(...VIEW_DIRECTION);
    expect(Math.abs(x)).toBeLessThan(1e-12);
    expect(Math.abs(y)).toBeLessThan(1e-12);
    expect(Math.hypot(...VIEW_DIRECTION)).toBeCloseTo(1, 12);
  });
});

describe("visible faces", () => {
  it("shows the +x, +y and +z faces and hides the other three", () => {
    expect(Object.values(VISIBLE_FACES).map((normal) => faceVisible(normal))).toEqual([true, true, true]);
    for (const hidden of [[-1, 0, 0], [0, -1, 0], [0, 0, -1]] as const) expect(faceVisible(hidden)).toBe(false);
    // A face seen exactly edge-on is not visible.
    expect(faceVisible([1, -1, 0])).toBe(false);
  });

  it("names each visible face for where it is drawn: left front, right front and top (quality review QR-002)", () => {
    expect(VISIBLE_FACES).toEqual({ left: [1, 0, 0], right: [0, 1, 0], top: [0, 0, 1] });
    // Each face's centre on a unit cube, relative to the cube's centre on the page.
    const [mx, my] = isometric(0.5, 0.5, 0.5);
    const placed = (normal: Point3) => {
      const [x, y] = isometric(0.5 + normal[0] / 2, 0.5 + normal[1] / 2, 0.5 + normal[2] / 2);
      return [x - mx, y - my] as const;
    };
    const [lx, ly] = placed(VISIBLE_FACES.left);
    expect(lx < 0 && ly > 0).toBe(true);
    const [rx, ry] = placed(VISIBLE_FACES.right);
    expect(rx > 0 && ry > 0).toBe(true);
    const [tx, ty] = placed(VISIBLE_FACES.top);
    expect(Math.abs(tx)).toBeLessThan(1e-12);
    expect(ty).toBeLessThan(0);
  });

  it("hides exactly the 3 edges of a unit cube that meet at its back bottom corner, the origin", () => {
    // Each of the 12 edges runs along one axis; the faces it joins are the ones its two fixed
    // coordinates lie on: −axis at 0, +axis at 1. An edge is hidden when both faces are.
    const hidden: string[] = [];
    for (let axis = 0; axis < 3; axis++) {
      const [p, q] = [0, 1, 2].filter((k) => k !== axis) as [number, number];
      for (const [vp, vq] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) {
        const face = (k: number, v: number): Point3 => [0, 1, 2].map((i) => (i === k ? (v === 1 ? 1 : -1) : 0)) as unknown as Point3;
        if (!faceVisible(face(p, vp)) && !faceVisible(face(q, vq))) {
          const start = [0, 0, 0];
          start[p] = vp;
          start[q] = vq;
          hidden.push(`${"xyz"[axis]} from (${start.join(", ")})`);
        }
      }
    }
    expect(hidden).toEqual(["x from (0, 0, 0)", "y from (0, 0, 0)", "z from (0, 0, 0)"]);
  });
});

describe("horizontal circles", () => {
  it("project to a level ellipse whose minor-to-major ratio is the sine of the isometric tilt, 35.264° (DEL-001)", () => {
    // The tilt is exactly atan(1/√2) = 35.26439°; the ticket's 35.264° is that angle rounded, and
    // its sine, 0.5773447, differs from the exact ratio by 5.55e-6 (code review CR-001).
    const tilt = Math.atan(1 / Math.SQRT2);
    expect((tilt * 180) / Math.PI).toBeCloseTo(35.264, 3);
    expect(Math.abs(ELLIPSE_RATIO - Math.sin(tilt))).toBeLessThan(1e-6);
    expect(Math.abs(ELLIPSE_RATIO - Math.sin((35.264 * Math.PI) / 180))).toBeLessThan(1e-5);
    const { rx, ry } = isoEllipse([0, 0, 0], 5);
    expect(ry / rx).toBe(ELLIPSE_RATIO);
  });

  it("put every point of the circle on the ellipse isoEllipse returns, and reach its four ends", () => {
    fc.assert(
      fc.property(point, // From 0.1: smaller radii against centres near 1,000 reach the 1e-9 bound's rounding floor
      // (quality review QR-001).
      fc.double({ min: 0.1, max: 1e3, noNaN: true }), (center, r) => {
        const { cx, cy, rx, ry } = isoEllipse(center, r);
        expect(isometric(...center)).toEqual([cx, cy]);
        let [widest, tallest] = [0, 0];
        for (let k = 0; k < 72; k++) {
          const t = (k * Math.PI) / 36;
          const [x, y] = isometric(center[0] + r * Math.cos(t), center[1] + r * Math.sin(t), center[2]);
          expect(Math.abs(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 - 1)).toBeLessThan(1e-9);
          widest = Math.max(widest, Math.abs(x - cx));
          tallest = Math.max(tallest, Math.abs(y - cy));
        }
        // The circle's diagonals, at 45° and 135°, are among the sampled points and reach the ends.
        expect(Math.abs(widest - rx)).toBeLessThan(1e-9 * Math.max(1, r));
        expect(Math.abs(tallest - ry)).toBeLessThan(1e-9 * Math.max(1, r));
      }),
    );
  });
});
