import { describe, expect, it } from "vitest";
import { placeLabel, type Obstacle } from "../../../src/layout/kit/labels";

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
});
