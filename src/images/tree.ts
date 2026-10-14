import { shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

const leaves = /* @__NO_SIDE_EFFECTS__ */ (cx: number, cy: number, r: number) =>
  shape("circle", [
    ["cx", cx],
    ["cy", cy],
    ["r", r],
    ["fill", "#2e7d32"],
  ]);

// @spec DGP-REQ-033
export const tree = /* @__PURE__ */ defineImage({
  name: "tree",
  description: "A tree with a brown trunk and a round green crown.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("rect", [
      ["x", 44],
      ["y", 60],
      ["width", 12],
      ["height", 34],
      ["fill", "#6d4c41"],
    ]),
    leaves(32, 52, 18),
    leaves(68, 52, 18),
    leaves(50, 36, 26),
  ],
});
