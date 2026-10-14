import { IN_HOUSE, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

// @spec DGP-REQ-033
export const ball: ImageAsset<"ball"> = {
  name: "ball",
  description: "A round blue ball with two curved white stripes.",
  ...IN_HOUSE,
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("circle", [
      ["cx", 50],
      ["cy", 50],
      ["r", 42],
      ["fill", "#1565c0"],
    ]),
    shape("path", [
      ["d", "M 9 42 Q 50 62 91 42"],
      ["fill", "none"],
      ["stroke", "#ffffff"],
      ["stroke-width", 5],
    ]),
    shape("path", [
      ["d", "M 42 9 Q 62 50 42 91"],
      ["fill", "none"],
      ["stroke", "#ffffff"],
      ["stroke-width", 5],
    ]),
  ],
};
