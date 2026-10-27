import { describe, expect, it } from "vitest";
import { defaultStyle } from "../../../src/core/style";
import { ELEMENT_LABEL_MAX_LINES, ELEMENT_LABEL_MAX_WIDTH, placeElementLabel, placeLabel, type Obstacle } from "../../../src/layout/kit/labels";
import { textBlock } from "../../../src/layout/kit/title";

const size = { width: 40, height: 20 };

describe("placeLabel (AD-010, prd/RF-001)", () => {
  it("returns the first candidate when nothing is in the way", () => {
    expect(placeLabel(size, [{ x: 10, y: 10 }, { x: 100, y: 100 }], [])).toEqual({ x: 10, y: 10, width: 40, height: 20 });
  });

  it("skips candidates that overlap a placed label", () => {
    const obstacles: Obstacle[] = [{ x: 0, y: 0, width: 50, height: 50 }];
    expect(placeLabel(size, [{ x: 10, y: 10 }, { x: 45, y: 0 }, { x: 60, y: 0 }], obstacles)).toEqual({
      x: 60,
      y: 0,
      width: 40,
      height: 20,
    });
  });

  it("treats boxes that only share an edge as not overlapping", () => {
    expect(placeLabel(size, [{ x: 50, y: 0 }], [{ x: 0, y: 0, width: 50, height: 50 }])).toBeDefined();
    expect(placeLabel(size, [{ x: 0, y: 50 }], [{ x: 0, y: 0, width: 50, height: 50 }])).toBeDefined();
  });

  it("skips candidates crossed by a figure line", () => {
    const diagonal: Obstacle = { x1: 0, y1: 0, x2: 100, y2: 100 };
    const horizontal: Obstacle = { x1: -50, y1: 110, x2: 500, y2: 110 };
    const vertical: Obstacle = { x1: 155, y1: -50, x2: 155, y2: 500 };
    const candidates = [
      { x: 30, y: 20 }, // diagonal passes through
      { x: 0, y: 100 }, // horizontal line at y=110 passes through
      { x: 140, y: 0 }, // vertical line at x=155 passes through
      { x: 60, y: 10 }, // clear: above the diagonal
    ];
    expect(placeLabel(size, candidates, [diagonal, horizontal, vertical])).toEqual({ x: 60, y: 10, width: 40, height: 20 });
  });

  it("detects a short segment entirely inside the box", () => {
    expect(placeLabel(size, [{ x: 0, y: 0 }], [{ x1: 10, y1: 10, x2: 12, y2: 12 }])).toBeUndefined();
  });

  it("does not count a line running along an edge or ending at the box", () => {
    const alongTop: Obstacle = { x1: -10, y1: 0, x2: 100, y2: 0 };
    const endingAtLeft: Obstacle = { x1: -30, y1: 10, x2: 0, y2: 10 };
    const touchingCorner: Obstacle = { x1: -10, y1: 10, x2: 10, y2: 30 }; // through (0, 20) only
    expect(placeLabel({ width: 40, height: 20 }, [{ x: 0, y: 0 }], [alongTop, endingAtLeft])).toBeDefined();
    expect(placeLabel({ width: 40, height: 20 }, [{ x: 0, y: 0 }], [touchingCorner])).toBeDefined();
  });

  it("ignores a line that misses the box", () => {
    expect(placeLabel(size, [{ x: 0, y: 0 }], [{ x1: 0, y1: 30, x2: 100, y2: 60 }])).toBeDefined();
  });

  it("returns undefined when every candidate is blocked", () => {
    const wall: Obstacle = { x: -1000, y: -1000, width: 3000, height: 3000 };
    expect(placeLabel(size, [{ x: 0, y: 0 }, { x: 200, y: 200 }], [wall])).toBeUndefined();
    expect(placeLabel(size, [], [])).toBeUndefined();
  });

  it("keeps clearance on every side when given padding, and returns the label's own box (QR-008)", () => {
    const line: Obstacle = { x1: 0, y1: 25, x2: 400, y2: 25 }; // 5 units below a label at y 0..20
    expect(placeLabel(size, [{ x: 0, y: 0 }], [line])).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(placeLabel(size, [{ x: 0, y: 0 }], [line], 6)).toBeUndefined();
    expect(placeLabel(size, [{ x: 0, y: 0 }, { x: 0, y: -10 }], [line], 4)).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(placeLabel(size, [{ x: 0, y: 0 }, { x: 0, y: -10 }], [line], 6)).toEqual({ x: 0, y: -10, width: 40, height: 20 });
  });
});

describe("placeElementLabel (quality review QR-002 on NLC TICKET-003)", () => {
  const fontSize = defaultStyle.fontSizes.label;

  it("places nothing, and adds no obstacle, for no label or one blank once cleaned", () => {
    const obstacles: Obstacle[] = [];
    expect(placeElementLabel(undefined, () => [{ x: 0, y: 0 }], obstacles)).toBeUndefined();
    expect(placeElementLabel("   ", () => [{ x: 0, y: 0 }], obstacles)).toBeUndefined();
    expect(obstacles).toEqual([]);
  });

  it("sizes the cleaned text at the label size, wrapped and cut to the shared limits, and offers candidates for that size", () => {
    const text = "a label long enough to wrap onto more lines than the cut allows, and then some";
    const block = textBlock(text, ELEMENT_LABEL_MAX_WIDTH, fontSize, ELEMENT_LABEL_MAX_LINES);
    const sizes: Array<[number, number]> = [];
    const placed = placeElementLabel(
      `  ${text}  `,
      (width, height) => {
        sizes.push([width, height]);
        return [{ x: 5, y: 7 }];
      },
      [],
    );
    expect(sizes).toEqual([[block.width, block.height]]);
    expect(placed).toEqual({ lines: block.lines, box: { x: 5, y: 7, width: block.width, height: block.height } });
    expect(placed!.lines).toHaveLength(ELEMENT_LABEL_MAX_LINES);
    expect(placed!.lines[ELEMENT_LABEL_MAX_LINES - 1]!.endsWith("…")).toBe(true);
  });

  it("takes the first clear candidate and adds its box to the obstacles, so the next label clears it", () => {
    const obstacles: Obstacle[] = [{ x: 0, y: 0, width: 50, height: 50 }];
    const candidates = () => [
      { x: 10, y: 10 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ];
    const first = placeElementLabel("A", candidates, obstacles);
    const second = placeElementLabel("B", candidates, obstacles);
    expect(first!.box).toMatchObject({ x: 100, y: 0 });
    expect(second!.box).toMatchObject({ x: 200, y: 0 });
    expect(obstacles.slice(1)).toEqual([first!.box, second!.box]);
  });

  it("falls back to the first candidate when none is clear (NLC OQ-005)", () => {
    const wall: Obstacle = { x: -1000, y: -1000, width: 3000, height: 3000 };
    const obstacles: Obstacle[] = [wall];
    const candidates = () => [
      { x: 3, y: 4 },
      { x: 300, y: 400 },
    ];
    const placed = placeElementLabel("Blocked", candidates, obstacles);
    expect(placed!.box).toMatchObject({ x: 3, y: 4 });
    expect(obstacles).toEqual([wall, placed!.box]);
  });
});
