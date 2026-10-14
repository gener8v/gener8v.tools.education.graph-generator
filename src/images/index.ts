import { imageAssets } from "./manifest";
import type { ImageAsset } from "./types";

export { ALLOWED_IMAGE_LICENSES, IMAGE_VIEW_BOX, type ImageAsset, type ImageLicense, type ImageManifestEntry } from "./types";
export { imageManifest } from "./manifest";

/** The name of an image in the published set, as a description gives it in `unitImage`. */
export type ImageName = (typeof imageAssets)[number]["name"];

/** Every image by name, on a null prototype, so a caller's `unitImage` such as `"constructor"` finds nothing. */
// @spec DGP-REQ-033
export const images: Readonly<Record<ImageName, ImageAsset>> = Object.freeze(
  Object.assign(Object.create(null) as Record<ImageName, ImageAsset>, Object.fromEntries(imageAssets.map((image) => [image.name, image]))),
);

/**
 * The published image names, in manifest order: the `unitImage` values the pictograph definition
 * (DGP TICKET-005) publishes in the schema enum and the vocabulary (DGP-REQ-035; the schema
 * generator reads definitions only, GSV TICKET-005 DEL-008).
 */
// @spec DGP-REQ-035
export function getImageNames(): ImageName[] {
  return imageAssets.map((image) => image.name);
}

/** Each image's plain-English description by name, for the enum's `valueDescriptions` in the vocabulary. */
// @spec DGP-REQ-033, DGP-REQ-035
export function imageDescriptions(): Record<ImageName, string> {
  return Object.fromEntries(imageAssets.map((image) => [image.name, image.description])) as Record<ImageName, string>;
}
