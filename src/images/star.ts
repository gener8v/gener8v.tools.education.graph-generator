import { points, ring, shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

// @spec DGP-REQ-033
export const star = /* @__PURE__ */ defineImage({
  name: "star",
  description: "A five-pointed golden star.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("polygon", [
      ["points", points(ring(50, 54, 5, 46, 19))],
      ["fill", "#c77800"],
      ["stroke", "#8d5300"],
      ["stroke-width", 2],
      ["stroke-linejoin", "round"],
    ]),
  ],
});
