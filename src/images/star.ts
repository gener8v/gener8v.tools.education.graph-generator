import { fmtPoints } from "../layout/kit/format";
import { IN_HOUSE, ring, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

// @spec DGP-REQ-033
export const star: ImageAsset<"star"> = {
  name: "star",
  description: "A five-pointed golden star.",
  ...IN_HOUSE,
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("polygon", [
      ["points", fmtPoints(ring(50, 54, 5, 46, 19))],
      ["fill", "#c77800"],
      ["stroke", "#8d5300"],
      ["stroke-width", 2],
      ["stroke-linejoin", "round"],
    ]),
  ],
};
