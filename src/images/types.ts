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
