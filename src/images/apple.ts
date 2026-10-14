import { IN_HOUSE, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

// @spec DGP-REQ-033
export const apple: ImageAsset<"apple"> = {
  name: "apple",
  description: "A red apple with a short brown stem and a green leaf.",
  ...IN_HOUSE,
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("path", [
      ["d", "M 50 30 C 30 18 8 30 12 58 C 15 82 35 96 50 88 C 65 96 85 82 88 58 C 92 30 70 18 50 30 Z"],
      ["fill", "#c62828"],
    ]),
    shape("path", [
      ["d", "M 50 30 C 50 22 52 14 56 8"],
      ["fill", "none"],
      ["stroke", "#5d4037"],
      ["stroke-width", 4],
      ["stroke-linecap", "round"],
    ]),
    shape("path", [
      ["d", "M 54 18 C 62 6 78 6 84 11 C 76 20 62 23 54 18 Z"],
      ["fill", "#2e7d32"],
    ]),
  ],
};
