import { shape } from "./draw";
import { IMAGE_VIEW_BOX, defineImage } from "./types";

// @spec DGP-REQ-033
export const book = /* @__PURE__ */ defineImage({
  name: "book",
  description: "A closed purple book seen from the front, with its pages showing at the side.",
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("rect", [
      ["x", 24],
      ["y", 14],
      ["width", 62],
      ["height", 76],
      ["rx", 3],
      ["fill", "#e0e0e0"],
    ]),
    shape("rect", [
      ["x", 14],
      ["y", 10],
      ["width", 64],
      ["height", 76],
      ["rx", 3],
      ["fill", "#6a1b9a"],
    ]),
    shape("rect", [
      ["x", 14],
      ["y", 10],
      ["width", 10],
      ["height", 76],
      ["rx", 3],
      ["fill", "#4a148c"],
    ]),
    shape("rect", [
      ["x", 34],
      ["y", 26],
      ["width", 34],
      ["height", 10],
      ["fill", "#e1bee7"],
    ]),
  ],
});
