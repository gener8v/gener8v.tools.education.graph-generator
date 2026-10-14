import { shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

// @spec DGP-REQ-033
export const ball = /* @__PURE__ */ defineImage({
  name: "ball",
  description: "A round blue ball with two curved white stripes.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
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
});
