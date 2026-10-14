import { points, shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

// @spec DGP-REQ-033
export const fish = /* @__PURE__ */ defineImage({
  name: "fish",
  description: "An orange fish facing left, with a tail, a top fin and one dark eye.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("polygon", [
      [
        "points",
        points([
          [70, 50],
          [94, 30],
          [94, 70],
        ]),
      ],
      ["fill", "#e65100"],
    ]),
    shape("path", [
      ["d", "M 38 33 L 50 20 L 58 33 Z"],
      ["fill", "#e65100"],
    ]),
    shape("ellipse", [
      ["cx", 44],
      ["cy", 50],
      ["rx", 34],
      ["ry", 20],
      ["fill", "#ef6c00"],
    ]),
    shape("circle", [
      ["cx", 26],
      ["cy", 45],
      ["r", 4],
      ["fill", "#212121"],
    ]),
  ],
});
