import { IN_HOUSE, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

const leaves = (cx: number, cy: number, r: number) =>
  shape("circle", [
    ["cx", cx],
    ["cy", cy],
    ["r", r],
    ["fill", "#2e7d32"],
  ]);

// @spec DGP-REQ-033
export const tree: ImageAsset<"tree"> = {
  name: "tree",
  description: "A tree with a brown trunk and a round green crown.",
  ...IN_HOUSE,
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
};
