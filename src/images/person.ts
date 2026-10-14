import { shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

// @spec DGP-REQ-033
export const person = /* @__PURE__ */ defineImage({
  name: "person",
  description: "A simple figure of a person: a round head above a rounded body, in dark grey.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("circle", [
      ["cx", 50],
      ["cy", 22],
      ["r", 14],
      ["fill", "#37474f"],
    ]),
    shape("path", [
      ["d", "M 26 94 L 26 56 Q 26 40 42 40 L 58 40 Q 74 40 74 56 L 74 94 Z"],
      ["fill", "#37474f"],
    ]),
  ],
});
