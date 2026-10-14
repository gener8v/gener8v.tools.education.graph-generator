import { IN_HOUSE, ring, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

// @spec DGP-REQ-033
export const flower: ImageAsset<"flower"> = {
  name: "flower",
  description: "A flower with five pink petals, a yellow center and a green stem with one leaf.",
  ...IN_HOUSE,
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("rect", [
      ["x", 48],
      ["y", 48],
      ["width", 4],
      ["height", 46],
      ["fill", "#2e7d32"],
    ]),
    shape("path", [
      ["d", "M 52 76 C 60 64 74 62 80 66 C 74 76 62 80 52 76 Z"],
      ["fill", "#2e7d32"],
    ]),
    ...ring(50, 34, 5, 15).map(([cx, cy]) =>
      shape("circle", [
        ["cx", cx],
        ["cy", cy],
        ["r", 12],
        ["fill", "#d81b60"],
      ]),
    ),
    shape("circle", [
      ["cx", 50],
      ["cy", 34],
      ["r", 9],
      ["fill", "#f9a825"],
    ]),
  ],
};
