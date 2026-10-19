/** A point or direction in the solids' space: x, y and z, in drawing units before projection. */
export type Point3 = readonly [number, number, number];

/** The drawn length of one unit along any of the three axes: √(2/3) ≈ 0.8165. */
export const ISO_SCALE = Math.sqrt(2 / 3);

/**
 * The minor-to-major ratio of a horizontal circle's ellipse: 1/√3 ≈ 0.57735, the sine of the
 * angle between the line of sight and the horizontal plane, atan(1/√2) ≈ 35.264° (equivalently,
 * the cosine of the page's 54.74° tilt from the horizontal; code review CR-002).
 */
export const ELLIPSE_RATIO = 1 / Math.sqrt(3);

const COS_30 = Math.sqrt(3) / 2;

/**
 * The one fixed viewpoint of every 3D figure: cubes, cylinders and x,y,z coordinate graphs (AD-009,
 * GSS-REQ-032, NLC-REQ-035; dependency-map RES-003). A true isometric projection, looking down at
 * a corner from the positive octant:
 * - z points straight up the page;
 * - x points toward the viewer's lower left, and y toward the lower right, each 30° below the
 *   horizontal, so the three axes are drawn 120° apart;
 * - all three are foreshortened equally, by `ISO_SCALE`, so equal lengths along any axis draw
 *   equal, and drawn ratios along an axis are the measurements' ratios (GSS-REQ-030);
 * - the faces facing +x (left front), +y (right front) and +z (top) are visible, and the faces
 *   facing −x, −y and −z are hidden: a cube shows 9 edges and hides the 3 that meet at its back
 *   bottom corner (`VISIBLE_FACES`, `faceVisible`);
 * - the line of sight runs along a cube's main diagonal, so its front top corner and its hidden
 *   back bottom corner land on the same point: the cube draws as a regular hexagon whose centre
 *   joins the three visible edges and the three hidden ones, alternating 60° apart (code review
 *   CR-004).
 *
 * Returns drawing coordinates with the origin at (0, 0) and y pointing down the page, as in a
 * Scene. The result is not rounded: rounding once, with `fmt()`, when it is written into a Scene
 * keeps errors from compounding (AD-007, prd/TC-002).
 */
// @spec GSS-REQ-032
export function isometric(x: number, y: number, z: number): [number, number] {
  return [ISO_SCALE * COS_30 * (y - x), ISO_SCALE * ((x + y) / 2 - z)];
}

/** The direction from a figure toward the viewer: the unit vector (1, 1, 1) / √3. */
export const VIEW_DIRECTION: Point3 = Object.freeze([ELLIPSE_RATIO, ELLIPSE_RATIO, ELLIPSE_RATIO] as const);

/** The outward normals of the three faces the viewpoint shows: left front (+x), right front (+y) and top (+z). */
export const VISIBLE_FACES = Object.freeze({
  left: Object.freeze([1, 0, 0] as const),
  right: Object.freeze([0, 1, 0] as const),
  top: Object.freeze([0, 0, 1] as const),
});

/**
 * Whether a flat face with outward normal `normal` faces the viewer, so its edges are drawn solid
 * (AD-009: hidden edges are found analytically, prd/TC-010). A face seen exactly edge-on is not.
 */
// @spec GSS-REQ-032
export function faceVisible(normal: Point3): boolean {
  return normal[0] * VIEW_DIRECTION[0] + normal[1] * VIEW_DIRECTION[1] + normal[2] * VIEW_DIRECTION[2] > 0;
}

/** An SVG ellipse's center and radii, unrounded. */
export interface IsoEllipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/**
 * The ellipse a horizontal circle (in a plane of constant z, such as a cylinder's top or base)
 * projects to: centered on its projected center, level on the page, so an SVG `<ellipse>` draws it
 * with no rotation. Its horizontal radius is `r` itself, since the circle's widest extent runs
 * across the page, where the √(3/2) stretch of the diagonal undoes `ISO_SCALE`; its vertical
 * radius is `r × ELLIPSE_RATIO`. Not rounded (AD-007).
 */
// @spec GSS-REQ-032
export function isoEllipse(center: Point3, r: number): IsoEllipse {
  const [cx, cy] = isometric(center[0], center[1], center[2]);
  return { cx, cy, rx: r, ry: r * ELLIPSE_RATIO };
}
