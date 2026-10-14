import { fmtPoints } from "../layout/kit/format";
import { IN_HOUSE, shape } from "./draw";
import { IMAGE_VIEW_BOX, type ImageAsset } from "./types";

// @spec DGP-REQ-033
export const fish: ImageAsset<"fish"> = {
  name: "fish",
  description: "An orange fish facing left, with a tail, a top fin and one dark eye.",
  ...IN_HOUSE,
  viewBox: IMAGE_VIEW_BOX,
  nodes: [
    shape("polygon", [
      [
        "points",
        fmtPoints([
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
};
