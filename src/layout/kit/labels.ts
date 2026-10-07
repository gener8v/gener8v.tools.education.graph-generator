/** An axis-aligned box in drawing units; `x`, `y` is the top-left corner. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A straight figure line from (`x1`, `y1`) to (`x2`, `y2`). */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Something a label must not cover: a placed label's box or a figure line. */
export type Obstacle = Box | Segment;

const isSegment = (obstacle: Obstacle): obstacle is Segment => "x1" in obstacle;

/** Whether two boxes share interior area. Boxes that only touch along an edge do not overlap. */
function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Whether a segment passes through the interior of a box (Liang–Barsky clipping). A segment that
 * only runs along an edge or touches a corner does not.
 */
function segmentCrossesBox(s: Segment, box: Box): boolean {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  let t0 = 0;
  let t1 = 1;
  // Each pair is (p, q) for one box edge: the segment is inside that edge where p·t < q.
  const edges: ReadonlyArray<readonly [number, number]> = [
    [-dx, s.x1 - box.x],
    [dx, box.x + box.width - s.x1],
    [-dy, s.y1 - box.y],
    [dy, box.y + box.height - s.y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false; // parallel to this edge and on or outside it
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  if (t0 >= t1) return false; // only touches at a point
  // The clipped part must lie strictly inside the box, not along its boundary.
  const mx = s.x1 + dx * ((t0 + t1) / 2);
  const my = s.y1 + dy * ((t0 + t1) / 2);
  return mx > box.x && mx < box.x + box.width && my > box.y && my < box.y + box.height;
}

function overlaps(box: Box, obstacle: Obstacle): boolean {
  return isSegment(obstacle) ? segmentCrossesBox(obstacle, box) : boxesOverlap(box, obstacle);
}

/**
 * The first candidate position, in the order given, at which a label of `size` overlaps no
 * obstacle (AD-010, prd/RF-001); `undefined` when every candidate is blocked, so the layout
 * decides what to do. Candidates are top-left corners.
 */
// @spec CPSE-REQ-011
export function placeLabel(
  size: { readonly width: number; readonly height: number },
  candidates: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  obstacles: readonly Obstacle[],
): Box | undefined {
  for (const { x, y } of candidates) {
    const box: Box = { x, y, width: size.width, height: size.height };
    if (!obstacles.some((obstacle) => overlaps(box, obstacle))) return box;
  }
  return undefined;
}
