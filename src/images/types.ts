import type { SceneNode } from "../layout/scene";

/**
 * The licenses an image in the published set may carry: the package's own (MIT), or a public-domain
 * dedication. Both allow redistribution, including inside a consumer's exported source (prd/CC-001,
 * prd/TC-009).
 */
// @spec DGP-REQ-034
export const ALLOWED_IMAGE_LICENSES = Object.freeze(["MIT", "CC0-1.0"] as const);

export type ImageLicense = (typeof ALLOWED_IMAGE_LICENSES)[number];

/** The space every image is drawn in: 100 × 100 units, origin top left (AD-012). */
export const IMAGE_VIEW_BOX = "0 0 100 100";

/**
 * One pictograph image (AD-012): a small vector drawing as Scene nodes in its own 100 × 100 space,
 * with what a caller and an auditor need to know about it.
 */
// @spec DGP-REQ-033, DGP-REQ-034
export interface ImageAsset<Name extends string = string> {
  /** The name a description gives as `unitImage`: lower-case kebab case, part of the public contract (RES-009). */
  readonly name: Name;
  /** A plain-English description, published in the vocabulary with the name. */
  readonly description: string;
  readonly license: ImageLicense;
  readonly author: string;
  /** Where the drawing came from, for the license register. */
  readonly provenance: string;
  /** The image's own coordinate space, `IMAGE_VIEW_BOX`. */
  readonly viewBox: string;
  /** Scene primitives with presentation attributes only: no text, ids, references or raster data (AD-008, AD-011). */
  readonly nodes: readonly SceneNode[];
}

/** An image's entry in the license register (`manifest.ts`). */
export type ImageManifestEntry = Pick<ImageAsset, "name" | "description" | "license" | "author" | "provenance">;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/**
 * An image as the set publishes it: frozen all the way down (its nodes, their attributes, each
 * attribute pair), so no module can change a drawing or its license at runtime, as
 * `defineProperties` does for definitions (quality review QR-002).
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineImage<Name extends string>(image: ImageAsset<Name>): ImageAsset<Name> {
  return deepFreeze(image);
}

